import { NextRequest, NextResponse } from 'next/server';
import { pgPool } from '@/lib/postgres';
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { app } from '@/firebase/firebase';

let hasQuizAssignmentsTableCache: boolean | null = null;
let attemptsColumnsCache: Set<string> | null = null;
let assignmentColumnsCache: Set<string> | null = null;

async function hasTable(tableName: string): Promise<boolean> {
  const res = await pgPool.query(
    `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
      LIMIT 1
    `,
    [tableName]
  );
  return res.rowCount > 0;
}

async function hasQuizAssignmentsTable(): Promise<boolean> {
  if (hasQuizAssignmentsTableCache !== null) return hasQuizAssignmentsTableCache;
  hasQuizAssignmentsTableCache = await hasTable('quiz_assignments');
  return hasQuizAssignmentsTableCache;
}

async function getAttemptsColumns(): Promise<Set<string>> {
  if (attemptsColumnsCache) return attemptsColumnsCache;
  const res = await pgPool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'quiz_attempts'
    `
  );
  attemptsColumnsCache = new Set<string>(res.rows.map((row: any) => String(row.column_name)));
  return attemptsColumnsCache;
}

async function getAssignmentColumns(): Promise<Set<string>> {
  if (assignmentColumnsCache) return assignmentColumnsCache;
  const res = await pgPool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'quiz_assignments'
    `
  );
  assignmentColumnsCache = new Set<string>(res.rows.map((row: any) => String(row.column_name)));
  return assignmentColumnsCache;
}

function parseJsonSafe(value: any): any {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function parseExplanationText(raw: any): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === '[object Object]') return '';
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'string') return parsed;
        if (parsed && typeof parsed === 'object' && typeof parsed.text === 'string') return parsed.text;
      } catch {
      }
    }
    return trimmed;
  }
  if (typeof raw === 'object') {
    if (typeof raw.text === 'string') return raw.text;
    try {
      return JSON.stringify(raw);
    } catch {
      return '';
    }
  }
  return String(raw);
}

function normalizeQuestionType(type: any): string {
  const raw = String(type || '').toLowerCase();
  if (raw === 'mcq' || raw === 'mcqs') return 'multiple';
  if (raw === 'true_false' || raw === 'truefalse') return 'truefalse';
  if (raw === 'fill' || raw === 'fillinblank' || raw === 'fillblanks') return 'fillblanks';
  if (raw === 'short_answer') return 'short';
  if (raw === 'long_answer') return 'long';
  return raw || 'short';
}

function normalizeQuizItem(item: any): any {
  const questionText = typeof item?.question === 'string'
    ? item.question
    : String(item?.question?.text || item?.questionText || '');
  const options = Array.isArray(item?.options)
    ? item.options.map((opt: any) => typeof opt === 'string' ? { text: opt, format: 'text' } : { text: String(opt?.text || ''), format: String(opt?.format || 'text') })
    : [];

  const answerValue = item?.answer?.value ?? item?.correctAnswer ?? '';

  return {
    questionId: String(item?.questionId || item?.id || ''),
    questionType: normalizeQuestionType(item?.questionType || item?.type),
    questionText,
    options,
    answerValue,
    marks: Number(item?.marks) || 1,
    explanation: item?.explanation || '',
    imageUrl: item?.imageUrl || null,
    cognitiveLevel: item?.cognitiveLevel || null,
  };
}

function normalizeAnswerForDisplay(questionType: string, value: any, options: any[]): string {
  if (value === null || value === undefined || value === '') return '';
  if (questionType === 'multiple' && options.length) {
    const asNum = Number(value);
    if (!Number.isNaN(asNum) && asNum >= 0 && asNum < options.length) {
      return String(options[asNum]?.text || asNum);
    }
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function evaluateAnswer(questionType: string, userAnswer: any, correctAnswer: any): boolean {
  if (userAnswer === null || userAnswer === undefined || userAnswer === '') return false;
  if (questionType === 'short' || questionType === 'long') return false;

  if (questionType === 'multiple') {
    const ua = String(userAnswer).trim().toLowerCase();
    const ca = String(correctAnswer).trim().toLowerCase();
    return ua === ca;
  }

  if (questionType === 'truefalse') {
    return String(userAnswer).toLowerCase() === String(correctAnswer).toLowerCase();
  }

  if (questionType === 'fillblanks') {
    if (typeof userAnswer === 'object' || typeof correctAnswer === 'object') {
      return JSON.stringify(userAnswer) === JSON.stringify(correctAnswer);
    }
    return String(userAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
  }

  return String(userAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
}

async function fetchQuizItemsFromPostgres(quizId: string): Promise<any[]> {
  const quizRes = await pgPool.query(
    `
      SELECT
        COALESCE(NULLIF(to_jsonb(q)->>'title', ''), 'Untitled Quiz') AS title,
        COALESCE(to_jsonb(q)->'items', to_jsonb(q)->'quizItems', to_jsonb(q)->'questions', '[]'::jsonb) AS items
      FROM quizzes q
      WHERE q.id::text = $1
      LIMIT 1
    `,
    [quizId]
  );

  if (!quizRes.rowCount) return [];

  const embedded = parseJsonSafe(quizRes.rows[0].items);
  if (Array.isArray(embedded) && embedded.length > 0) {
    return embedded.map(normalizeQuizItem);
  }

  const qiRes = await pgPool.query(
    `
      SELECT
        qi.question_id::text AS question_id,
        COALESCE(qi.position, 0) AS position,
        COALESCE(qi.marks, 1) AS marks,
        COALESCE(NULLIF(to_jsonb(qu)->>'type', ''), 'short') AS question_type,
        COALESCE(
          NULLIF(to_jsonb(qu)->>'question_text', ''),
          NULLIF(to_jsonb(qu)->>'questionText', ''),
          NULLIF(to_jsonb(qu)->>'question', ''),
          ''
        ) AS question_text,
        COALESCE(
          to_jsonb(qu)->'options',
          to_jsonb(qu)->'interactive_data'->'options',
          to_jsonb(qu)->'interactiveData'->'options',
          '[]'::jsonb
        ) AS options,
        COALESCE(
          NULLIF(to_jsonb(qu)->>'correct_answer', ''),
          NULLIF(to_jsonb(qu)->>'correctAnswer', ''),
          NULLIF(to_jsonb(qu)->>'answer', ''),
          ''
        ) AS answer_text,
        COALESCE(NULLIF(to_jsonb(qu)->>'explanation', ''), '') AS explanation,
        COALESCE(NULLIF(to_jsonb(qu)->>'image_url', ''), NULLIF(to_jsonb(qu)->>'imageUrl', ''), '') AS image_url,
        COALESCE(to_jsonb(qu)->'cognitive_level', 'null'::jsonb) AS cognitive_level
      FROM quiz_items qi
      LEFT JOIN questions qu ON qu.id = qi.question_id
      WHERE qi.quiz_id::text = $1
      ORDER BY qi.position ASC, qi.id ASC
    `,
    [quizId]
  );

  return qiRes.rows.map((row: any) => {
    const options = parseJsonSafe(row.options);
    const normalizedOptions = Array.isArray(options)
      ? options.map((opt: any) => typeof opt === 'string' ? { text: opt, format: 'text' } : { text: String(opt?.text || ''), format: String(opt?.format || 'text') })
      : [];

    return {
      questionId: String(row.question_id || ''),
      questionType: normalizeQuestionType(row.question_type),
      questionText: String(row.question_text || ''),
      options: normalizedOptions,
      answerValue: String(row.answer_text || ''),
      marks: Number(row.marks) || 1,
      explanation: parseExplanationText(row.explanation),
      imageUrl: String(row.image_url || ''),
      cognitiveLevel: parseJsonSafe(row.cognitive_level),
    };
  });
}

function buildQuestionResultsFromAnswers(quizItems: any[], answersPayload: any): any[] {
  if (Array.isArray(answersPayload) && answersPayload.length > 0 && answersPayload[0]?.questionText !== undefined) {
    return answersPayload.map(mapQuestionResult);
  }

  const answersObj = answersPayload && typeof answersPayload === 'object' ? answersPayload : {};

  return quizItems.map((item, idx) => {
    const userRaw = answersObj[idx] ?? answersObj[String(idx)] ?? null;
    const userAnswer = normalizeAnswerForDisplay(item.questionType, userRaw, item.options || []);
    const correctAnswer = normalizeAnswerForDisplay(item.questionType, item.answerValue, item.options || []);
    const isCorrect = evaluateAnswer(item.questionType, userRaw, item.answerValue);
    const attempted = !(userRaw === null || userRaw === undefined || userRaw === '');
    const needsManual = item.questionType === 'short' || item.questionType === 'long';

    return {
      questionId: item.questionId,
      questionType: item.questionType,
      questionText: item.questionText,
      userAnswer,
      correctAnswer,
      isCorrect,
      marks: Number(item.marks) || 1,
      manualMarks: undefined,
      status: !attempted ? 'Not Attempted' : needsManual ? 'Attempted' : (isCorrect ? 'Correct' : 'Incorrect'),
      explanation: item.explanation || '',
      cognitiveLevel: item.cognitiveLevel || null,
      imageUrl: item.imageUrl || null,
    };
  });
}

function mapQuestionResult(result: any) {
  const userAnswerRaw =
    result?.userAnswerText ??
    result?.userAnswer ??
    result?.answer ??
    '';

  const correctAnswerRaw =
    result?.correctAnswerText ??
    result?.correctAnswer ??
    result?.answer ??
    '';

  return {
    questionId: result.questionId || '',
    questionType: result.questionType || 'Multiple Choice',
    questionText: result.questionText || 'Question text not available',
    userAnswer: typeof userAnswerRaw === 'object' ? JSON.stringify(userAnswerRaw) : String(userAnswerRaw),
    correctAnswer: typeof correctAnswerRaw === 'object' ? JSON.stringify(correctAnswerRaw) : String(correctAnswerRaw),
    isCorrect: result.isCorrect === true || result.status === 'Correct',
    marks: result.marks || 0,
    manualMarks: result.manualMarks,
    status: result.status || 'Not Attempted',
    explanation: parseExplanationText(result.explanation),
    cognitiveLevel: result.cognitiveLevel || null,
    imageUrl: result.imageUrl || null,
  };
}

async function fetchReviewFromFirebase(quizId: string, attemptId: string) {
  const db = getFirestore(app);

  const attemptRef = doc(db, 'quizAttempts', attemptId);
  const attemptSnap = await getDoc(attemptRef);
  if (!attemptSnap.exists()) {
    return { status: 404 as const, payload: { error: 'Attempt not found' } };
  }

  const attempt = attemptSnap.data();
  if (attempt.quizId !== quizId) {
    return { status: 400 as const, payload: { error: 'Attempt does not match quiz' } };
  }

  const quizRef = doc(db, 'quizzes', quizId);
  const quizSnap = await getDoc(quizRef);
  if (!quizSnap.exists()) {
    return { status: 404 as const, payload: { error: 'Quiz not found' } };
  }

  const quiz = quizSnap.data();
  const questions = (attempt.questionResults || []).map(mapQuestionResult);

  return {
    status: 200 as const,
    payload: {
      attemptId,
      quizId,
      quizTitle: quiz.title || 'Untitled Quiz',
      studentName: attempt.studentName || 'Unknown Student',
      originalScore: attempt.score || 0,
      totalMarks: attempt.totalMarks || 0,
      originalPercentage: attempt.percentage || 0,
      questions,
      source: 'firebase_fallback',
    },
  };
}

async function updateReviewInFirebase(quizId: string, attemptId: string, manualMarks: Record<string, number>) {
  const db = getFirestore(app);
  const attemptRef = doc(db, 'quizAttempts', attemptId);
  const attemptSnap = await getDoc(attemptRef);

  if (!attemptSnap.exists()) {
    return { status: 404 as const, payload: { error: 'Attempt not found' } };
  }

  const attempt = attemptSnap.data();
  const questions = attempt.questionResults || [];

  let newScore = 0;
  const updatedQuestions = questions.map((q: any, idx: number) => {
    const question = { ...q };
    if (idx in manualMarks) {
      question.manualMarks = manualMarks[idx];
      question.isCorrect = manualMarks[idx] > 0;
      newScore += manualMarks[idx];
    } else if (q.isCorrect) {
      newScore += q.marks || 0;
    }
    return question;
  });

  const totalMarks = attempt.totalMarks || 0;
  const newPercentage = totalMarks > 0 ? Math.round((newScore / totalMarks) * 100) : 0;

  await updateDoc(attemptRef, {
    score: newScore,
    percentage: newPercentage,
    questionResults: updatedQuestions,
    hasManualGrades: true,
    lastGradedAt: new Date().toISOString(),
    gradedBy: 'teacher',
  });

  try {
    const assignmentQuery = query(
      collection(db, 'quizAssignments'),
      where('quizId', '==', quizId),
      where('studentId', '==', attempt.studentId)
    );
    const assignmentSnaps = await getDocs(assignmentQuery);
    if (assignmentSnaps.size > 0) {
      const assignmentDoc = assignmentSnaps.docs[0];
      await updateDoc(assignmentDoc.ref, {
        score: newScore,
        percentage: newPercentage,
        isMarked: true,
      });
    }
  } catch {
  }

  return {
    status: 200 as const,
    payload: {
      success: true,
      updated: {
        attemptId,
        quizId,
        quizTitle: attempt.quizTitle || 'Untitled Quiz',
        studentName: attempt.studentName || 'Unknown Student',
        originalScore: attempt.score,
        newScore,
        totalMarks,
        originalPercentage: attempt.percentage,
        newPercentage,
        questions: updatedQuestions.map(mapQuestionResult),
      },
      source: 'firebase_fallback',
    },
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string; attemptId: string }> }
) {
  try {
    const { quizId, attemptId } = await params;

    if (!quizId || !attemptId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    try {
      const attemptRes = await pgPool.query(
        `
          SELECT
            qa.id::text AS id,
            qa.quiz_id::text AS "quizId",
            COALESCE(
              NULLIF(TRIM(CONCAT(COALESCE(to_jsonb(u)->>'first_name', ''), ' ', COALESCE(to_jsonb(u)->>'last_name', ''))), ''),
              NULLIF(to_jsonb(u)->>'name', ''),
              NULLIF(to_jsonb(u)->>'display_name', ''),
              'Unknown Student'
            ) AS "studentName",
            COALESCE(qa.score, 0) AS score,
            COALESCE(qa.total_marks, 0) AS "totalMarks",
            COALESCE(
              CASE WHEN COALESCE(to_jsonb(qa)->>'percentage', '') ~ '^\\d+(\\.\\d+)?$' THEN (to_jsonb(qa)->>'percentage')::numeric END,
              CASE
                WHEN COALESCE(qa.total_marks, 0) > 0
                THEN ROUND((COALESCE(qa.score, 0)::numeric / qa.total_marks::numeric) * 100)
                ELSE 0
              END,
              0
            ) AS percentage,
            COALESCE(to_jsonb(qa)->'question_results', to_jsonb(qa)->'answers', '[]'::jsonb) AS "questionResults",
            COALESCE(qa.student_id::text, '') AS "studentId"
          FROM quiz_attempts qa
          LEFT JOIN users u ON u.id::text = qa.student_id::text
          WHERE qa.id::text = $1
          LIMIT 1
        `,
        [attemptId]
      );

      if (!attemptRes.rowCount) {
        const fallback = await fetchReviewFromFirebase(quizId, attemptId);
        return NextResponse.json(fallback.payload, { status: fallback.status });
      }

      const attempt = attemptRes.rows[0];
      if (String(attempt.quizId) !== String(quizId)) {
        return NextResponse.json({ error: 'Attempt does not match quiz' }, { status: 400 });
      }

      const quizRes = await pgPool.query(
        `
          SELECT q.id::text AS id, COALESCE(NULLIF(to_jsonb(q)->>'title', ''), 'Untitled Quiz') AS title
          FROM quizzes q
          WHERE q.id::text = $1
          LIMIT 1
        `,
        [quizId]
      );

      if (!quizRes.rowCount) {
        const fallback = await fetchReviewFromFirebase(quizId, attemptId);
        return NextResponse.json(fallback.payload, { status: fallback.status });
      }

      const rawQuestionResults = parseJsonSafe(attempt.questionResults);
      const quizItems = await fetchQuizItemsFromPostgres(quizId);
      const questionResults = buildQuestionResultsFromAnswers(quizItems, rawQuestionResults);

      return NextResponse.json({
        attemptId,
        quizId,
        quizTitle: quizRes.rows[0].title || 'Untitled Quiz',
        studentName: attempt.studentName || 'Unknown Student',
        originalScore: Number(attempt.score) || 0,
        totalMarks: Number(attempt.totalMarks) || 0,
        originalPercentage: Number(attempt.percentage) || 0,
        questions: questionResults.map(mapQuestionResult),
        source: 'postgres',
      });
    } catch (pgError) {
      console.error('[teacher/quizzes/review][GET] PostgreSQL failed, falling back to Firebase:', pgError);
      const fallback = await fetchReviewFromFirebase(quizId, attemptId);
      return NextResponse.json(fallback.payload, { status: fallback.status });
    }
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string; attemptId: string }> }
) {
  try {
    const { quizId, attemptId } = await params;
    const body = await request.json();
    const { manualMarks, studentName } = body;

    if (!quizId || !attemptId || !manualMarks) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    try {
      const attemptRes = await pgPool.query(
        `
          SELECT
            qa.id::text AS id,
            qa.quiz_id::text AS "quizId",
            COALESCE(qa.student_id::text, '') AS "studentId",
            COALESCE(
              NULLIF(TRIM(CONCAT(COALESCE(to_jsonb(u)->>'first_name', ''), ' ', COALESCE(to_jsonb(u)->>'last_name', ''))), ''),
              NULLIF(to_jsonb(u)->>'name', ''),
              NULLIF(to_jsonb(u)->>'display_name', ''),
              'Unknown Student'
            ) AS "studentName",
            COALESCE(qa.score, 0) AS score,
            COALESCE(qa.total_marks, 0) AS "totalMarks",
            COALESCE(
              CASE WHEN COALESCE(to_jsonb(qa)->>'percentage', '') ~ '^\\d+(\\.\\d+)?$' THEN (to_jsonb(qa)->>'percentage')::numeric END,
              CASE
                WHEN COALESCE(qa.total_marks, 0) > 0
                THEN ROUND((COALESCE(qa.score, 0)::numeric / qa.total_marks::numeric) * 100)
                ELSE 0
              END,
              0
            ) AS percentage,
            COALESCE(to_jsonb(qa)->'question_results', to_jsonb(qa)->'answers', '[]'::jsonb) AS "questionResults"
          FROM quiz_attempts qa
          LEFT JOIN users u ON u.id::text = qa.student_id::text
          WHERE qa.id::text = $1
          LIMIT 1
        `,
        [attemptId]
      );

      if (!attemptRes.rowCount) {
        const fallback = await updateReviewInFirebase(quizId, attemptId, manualMarks);
        return NextResponse.json(fallback.payload, { status: fallback.status });
      }

      const attempt = attemptRes.rows[0];
      if (String(attempt.quizId) !== String(quizId)) {
        return NextResponse.json({ error: 'Attempt does not match quiz' }, { status: 400 });
      }

      const rawQuestionResults = parseJsonSafe(attempt.questionResults);
      const quizItems = await fetchQuizItemsFromPostgres(quizId);
      const questions = buildQuestionResultsFromAnswers(quizItems, rawQuestionResults);
      let newScore = 0;

      const updatedQuestions = questions.map((q: any, idx: number) => {
        const question = { ...q };
        if (idx in manualMarks) {
          question.manualMarks = manualMarks[idx];
          question.isCorrect = manualMarks[idx] > 0;
          newScore += manualMarks[idx];
        } else if (q.isCorrect) {
          newScore += q.marks || 0;
        }
        return question;
      });

      const totalMarks = Number(attempt.totalMarks) || 0;
      const newPercentage = totalMarks > 0 ? Math.round((newScore / totalMarks) * 100) : 0;

      const attemptColumns = await getAttemptsColumns();
      const updates: string[] = [];
      const updateValues: any[] = [];

      if (attemptColumns.has('score')) {
        updateValues.push(newScore);
        updates.push(`score = $${updateValues.length}`);
      }
      if (attemptColumns.has('percentage')) {
        updateValues.push(newPercentage);
        updates.push(`percentage = $${updateValues.length}`);
      }
      if (attemptColumns.has('answers')) {
        updateValues.push(JSON.stringify(updatedQuestions));
        updates.push(`answers = $${updateValues.length}::jsonb`);
      } else if (attemptColumns.has('question_results')) {
        updateValues.push(JSON.stringify(updatedQuestions));
        updates.push(`question_results = $${updateValues.length}::jsonb`);
      }
      if (attemptColumns.has('status')) {
        updateValues.push('graded');
        updates.push(`status = $${updateValues.length}`);
      }
      if (attemptColumns.has('updated_at')) {
        updates.push('updated_at = NOW()');
      }

      if (updates.length) {
        updateValues.push(attemptId);
        await pgPool.query(
          `
            UPDATE quiz_attempts
            SET ${updates.join(', ')}
            WHERE id::text = $${updateValues.length}
          `,
          updateValues
        );
      }

      if ((await hasQuizAssignmentsTable()) && attempt.studentId) {
        const assignmentColumns = await getAssignmentColumns();
        const assignmentUpdates: string[] = [];
        const assignmentValues: any[] = [];

        if (assignmentColumns.has('score')) {
          assignmentValues.push(newScore);
          assignmentUpdates.push(`score = $${assignmentValues.length}`);
        }
        if (assignmentColumns.has('percentage')) {
          assignmentValues.push(newPercentage);
          assignmentUpdates.push(`percentage = $${assignmentValues.length}`);
        }
        if (assignmentColumns.has('is_marked')) {
          assignmentValues.push(true);
          assignmentUpdates.push(`is_marked = $${assignmentValues.length}`);
        }
        if (assignmentColumns.has('status')) {
          assignmentValues.push('graded');
          assignmentUpdates.push(`status = $${assignmentValues.length}`);
        }
        if (assignmentColumns.has('updated_at')) {
          assignmentUpdates.push('updated_at = NOW()');
        }

        if (assignmentUpdates.length) {
          assignmentValues.push(quizId);
          assignmentValues.push(attempt.studentId);
        await pgPool.query(
          `
            UPDATE quiz_assignments
            SET
              ${assignmentUpdates.join(', ')}
            WHERE quiz_id::text = $${assignmentValues.length - 1}
              AND student_id::text = $${assignmentValues.length}
          `,
          assignmentValues
        );
        }
      }

      const quizRes = await pgPool.query(
        `SELECT COALESCE(NULLIF(to_jsonb(q)->>'title', ''), 'Untitled Quiz') AS title FROM quizzes q WHERE q.id::text = $1 LIMIT 1`,
        [quizId]
      );

      return NextResponse.json({
        success: true,
        updated: {
          attemptId,
          quizId,
          quizTitle: quizRes.rows[0]?.title || 'Untitled Quiz',
          studentName: attempt.studentName || studentName || 'Unknown Student',
          originalScore: Number(attempt.score) || 0,
          newScore,
          totalMarks,
          originalPercentage: Number(attempt.percentage) || 0,
          newPercentage,
          questions: updatedQuestions.map(mapQuestionResult),
        },
        source: 'postgres',
      });
    } catch (pgError) {
      console.error('[teacher/quizzes/review][PUT] PostgreSQL failed, falling back to Firebase:', pgError);
      const fallback = await updateReviewInFirebase(quizId, attemptId, manualMarks);
      return NextResponse.json(fallback.payload, { status: fallback.status });
    }
  } catch (error) {
    console.error('Error updating grades:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
