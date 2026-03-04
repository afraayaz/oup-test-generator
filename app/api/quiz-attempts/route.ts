import { NextRequest, NextResponse } from 'next/server';
import { pgPool } from '@/lib/postgres';
import { db } from '@/firebase/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

let hasQuizAttemptsTableCache: boolean | null = null;
let hasQuizAssignmentsTableCache: boolean | null = null;
let attemptsColumnsCache: Set<string> | null = null;
let assignmentColumnsCache: Set<string> | null = null;
let userColumnsCache: Set<string> | null = null;

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

async function hasQuizAttemptsTable(): Promise<boolean> {
  if (hasQuizAttemptsTableCache !== null) return hasQuizAttemptsTableCache;
  hasQuizAttemptsTableCache = await hasTable('quiz_attempts');
  return hasQuizAttemptsTableCache;
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

async function getUserColumns(): Promise<Set<string>> {
  if (userColumnsCache) return userColumnsCache;
  const res = await pgPool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
    `
  );
  userColumnsCache = new Set<string>(res.rows.map((row: any) => String(row.column_name)));
  return userColumnsCache;
}

async function getStudentKeys(studentId: string): Promise<string[]> {
  const cols = await getUserColumns();
  const where: string[] = ['id::text = $1'];
  if (cols.has('firebase_uid')) where.push('firebase_uid = $1');
  if (cols.has('uid')) where.push('uid = $1');

  const keys = new Set<string>([String(studentId)]);
  const res = await pgPool.query(
    `
      SELECT id::text AS id
      FROM users
      WHERE ${where.join(' OR ')}
      LIMIT 1
    `,
    [studentId]
  );
  if (res.rows[0]?.id) keys.add(String(res.rows[0].id));
  return Array.from(keys);
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

// Function to extract cognitive level from question data
function getQuestionCognitiveLevel(item: any): string {
  // Check for cognitiveLevel field (stored cognitive level data)
  if (item.cognitiveLevel) {
    const cl = item.cognitiveLevel;
    // If it's an object with knowledge, understanding, application
    if (typeof cl === 'object') {
      if (cl.application) return 'Application';
      if (cl.understanding) return 'Understanding';
      if (cl.knowledge) return 'Knowledge';
    }
    // If it's a string, use it directly
    if (typeof cl === 'string') return cl;
  }
  
  // Check for cognitiveLevels field (alternative naming)
  if (item.cognitiveLevels) {
    const cl = item.cognitiveLevels;
    if (typeof cl === 'object') {
      if (cl.application) return 'Application';
      if (cl.understanding) return 'Understanding';
      if (cl.knowledge) return 'Knowledge';
    }
  }
  
  // Fallback: return unknown if no cognitive level found
  return 'Unknown';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      quizId,
      quizTitle,
      subject = '',  // Subject from quiz
      studentId,
      studentName = 'Unknown Student',  // Student name from auth
      answers,
      score,
      totalMarks,
      percentage,
      timeSpent,
      submittedAt,
      quizItems,
      isMarked = false,  // Get marked status from quiz (default false if not provided)
    } = body;

    if (!quizId || !studentId) {
      return NextResponse.json(
        { error: 'Missing quizId or studentId' },
        { status: 400 }
      );
    }

    // Build detailed results for each question
    const questionResults = (quizItems || []).map((item: any, index: number) => {
      const userAnswer = answers[index];
      let isCorrect = false;
      let attempted = false;
      
      // Determine if answer is correct based on question type
      if (item.questionType === 'multiple' || item.questionType === 'mcqs') {
        // Multiple choice - direct comparison
        isCorrect = userAnswer && item.answer.value === userAnswer;
        attempted = userAnswer !== null && userAnswer !== undefined;
      } else if (item.questionType === 'truefalse') {
        // True/False - direct comparison
        isCorrect = userAnswer && item.answer.value === userAnswer;
        attempted = userAnswer !== null && userAnswer !== undefined;
      } else if (['fill', 'fillinblank', 'fillblanks'].includes(item.questionType)) {
        // Fill in the blank - compare against correct answers
        if (!userAnswer) {
          isCorrect = false;
          attempted = false;
        } else if (Array.isArray(item.answer.value)) {
          // Multiple blanks stored as array
          attempted = true;
          isCorrect = item.answer.value.every((ans: string, i: number) =>
            ans.toLowerCase().trim() === (userAnswer?.[i] || '').toLowerCase().trim()
          );
        } else if (typeof item.answer.value === 'object' && !Array.isArray(item.answer.value)) {
          // Multiple blanks stored as object {0: answer1, 1: answer2}
          if (typeof userAnswer === 'object') {
            attempted = true;
            isCorrect = Object.keys(item.answer.value).every((key: string) => {
              const correctAns = item.answer.value[key];
              const userAns = userAnswer[key];
              return correctAns && userAns && 
                correctAns.toLowerCase().trim() === userAns.toLowerCase().trim();
            });
          } else {
            isCorrect = false;
            attempted = false;
          }
        } else {
          // Single blank
          attempted = true;
          isCorrect = item.answer.value?.toLowerCase().trim() === userAnswer?.toLowerCase?.()?.trim?.();
        }
      } else if (['short', 'shortanswer', 'long', 'longanswer'].includes(item.questionType)) {
        // For short/long answers, cannot auto-grade, just record attempt
        attempted = userAnswer && userAnswer.toString().trim().length > 0;
        isCorrect = false; // Don't mark as correct, manual grading required
      } else {
        // Unknown type
        isCorrect = false;
        attempted = false;
      }

      const cognitiveLevel = getQuestionCognitiveLevel(item);

      // Extract question text safely
      let questionText = '';
      if (typeof item.question === 'string') {
        questionText = item.question;
      } else if (typeof item.question === 'object' && item.question?.text) {
        questionText = item.question.text;
      }

      // Extract explanation text safely
      const explanation = parseExplanationText(item.explanation);

      if (index < 2) {
      }

      return {
        questionId: item.questionId,
        questionType: item.questionType,
        questionText,
        difficulty: item.difficulty,
        cognitiveLevel,
        userAnswer: typeof userAnswer === 'object' ? JSON.stringify(userAnswer) : userAnswer,
        correctAnswer: typeof item.answer.value === 'object' ? JSON.stringify(item.answer.value) : item.answer.value,
        // For MCQ, also store the user answer text for display
        userAnswerText: (item.questionType === 'multiple' || item.questionType === 'mcqs') && item.options && userAnswer !== null && userAnswer !== undefined
          ? item.options[userAnswer]?.text || userAnswer
          : null,
        // For MCQ, also store the correct answer text for display
        correctAnswerText: (item.questionType === 'multiple' || item.questionType === 'mcqs') && item.options && item.answer.value !== null && item.answer.value !== undefined
          ? item.options[item.answer.value]?.text || item.answer.value
          : null,
        isCorrect,
        attempted,
        status: !attempted ? 'Not Attempted' : (['short', 'shortanswer', 'long', 'longanswer'].includes(item.questionType) ? 'Attempted' : (isCorrect ? 'Correct' : 'Incorrect')),
        marks: item.marks || 1,
        explanation: explanation || null,
        imageUrl: item.imageUrl || null,  // Include image URL for display
      };
    });

    // Calculate cognitive level breakdown
    const cognitiveBreakdown: { [key: string]: { correct: number; total: number; percentage: number; questionIndices: number[] } } = {};
    questionResults.forEach((result: any, index: number) => {
      if (!cognitiveBreakdown[result.cognitiveLevel]) {
        cognitiveBreakdown[result.cognitiveLevel] = { correct: 0, total: 0, percentage: 0, questionIndices: [] };
      }
      cognitiveBreakdown[result.cognitiveLevel].total += 1;
      cognitiveBreakdown[result.cognitiveLevel].questionIndices.push(index);
      if (result.isCorrect) {
        cognitiveBreakdown[result.cognitiveLevel].correct += 1;
      }
    });

    // Calculate percentages
    Object.keys(cognitiveBreakdown).forEach(level => {
      cognitiveBreakdown[level].percentage = Math.round(
        (cognitiveBreakdown[level].correct / cognitiveBreakdown[level].total) * 100
      );
    });

    const submittedAtIso = submittedAt || new Date().toISOString();

    try {
      if (!(await hasQuizAttemptsTable())) {
        throw new Error('quiz_attempts table not found');
      }

      const attemptColumns = await getAttemptsColumns();
      const studentKeys = await getStudentKeys(String(studentId));
      const studentPk = studentKeys.find((key) => key !== String(studentId)) || String(studentId);

      const insertMapping: Array<{ column: string; value: any; json?: boolean }> = [
        { column: 'quiz_id', value: String(quizId) },
        { column: 'quiz_title', value: quizTitle || 'Quiz' },
        { column: 'subject', value: subject || '' },
        { column: 'student_id', value: studentPk },
        { column: 'student_name', value: studentName || 'Unknown Student' },
        { column: 'score', value: Number(score) || 0 },
        { column: 'total_marks', value: Number(totalMarks) || 0 },
        { column: 'percentage', value: Number(percentage) || 0 },
        { column: 'time_spent', value: Number(timeSpent) || 0 },
        { column: 'submitted_at', value: submittedAtIso },
        { column: 'completed_at', value: submittedAtIso },
        { column: 'is_marked', value: isMarked === true },
        { column: 'answers', value: answers || {}, json: true },
        { column: 'question_results', value: questionResults || [], json: true },
        { column: 'cognitive_breakdown', value: cognitiveBreakdown || {}, json: true },
        { column: 'status', value: 'submitted' },
        { column: 'has_manual_grades', value: false },
        { column: 'created_at', value: new Date() },
        { column: 'updated_at', value: new Date() },
      ];

      const present = insertMapping.filter((item) => attemptColumns.has(item.column));
      const insertColumns = present.map((item) => item.column);
      const values = present.map((item) => item.json ? JSON.stringify(item.value) : item.value);
      const placeholders = present.map((item, index) => item.json ? `$${index + 1}::jsonb` : `$${index + 1}`);

      const attemptInsert = await pgPool.query(
        `
          INSERT INTO quiz_attempts (${insertColumns.join(', ')})
          VALUES (${placeholders.join(', ')})
          RETURNING id::text AS id
        `,
        values
      );

      const attemptId = attemptInsert.rows[0]?.id;

      if ((await hasQuizAssignmentsTable())) {
        const assignmentColumns = await getAssignmentColumns();
        const updates: string[] = [];
        const updateValues: any[] = [];

        if (assignmentColumns.has('status')) {
          updateValues.push('completed');
          updates.push(`status = $${updateValues.length}`);
        }
        if (assignmentColumns.has('completed_at')) {
          updateValues.push(submittedAtIso);
          updates.push(`completed_at = $${updateValues.length}`);
        }
        if (assignmentColumns.has('score')) {
          updateValues.push(Number(score) || 0);
          updates.push(`score = $${updateValues.length}`);
        }
        if (assignmentColumns.has('percentage')) {
          updateValues.push(Number(percentage) || 0);
          updates.push(`percentage = $${updateValues.length}`);
        }
        if (assignmentColumns.has('is_marked')) {
          updateValues.push(isMarked === true);
          updates.push(`is_marked = $${updateValues.length}`);
        }
        if (assignmentColumns.has('updated_at')) {
          updates.push('updated_at = NOW()');
        }

        if (updates.length) {
          updateValues.push(String(quizId));
          updateValues.push(studentKeys);

          await pgPool.query(
            `
              UPDATE quiz_assignments
              SET ${updates.join(', ')}
              WHERE quiz_id::text = $${updateValues.length - 1}
                AND student_id::text = ANY($${updateValues.length}::text[])
            `,
            updateValues
          );
        }
      }

      return NextResponse.json(
        {
          success: true,
          attemptId,
          score,
          percentage,
          questionResults,
          cognitiveBreakdown,
          source: 'postgres',
        },
        { status: 200 }
      );
    } catch (pgError) {
      console.error('[quiz-attempts][POST] PostgreSQL failed, falling back to Firebase:', pgError);
    }

    // Save to Firestore using SDK
    const attemptsRef = collection(db, 'quizAttempts');
    const attemptDoc = await addDoc(attemptsRef, {
      quizId: quizId || '',
      quizTitle: quizTitle || 'Quiz',
      subject: subject || '',  // Default to empty string if not provided
      studentId: studentId || '',
      studentName: studentName || 'Unknown Student',  // Save student name
      score: score || 0,
      totalMarks: totalMarks || 0,
      percentage: percentage || 0,
      timeSpent: timeSpent || 0,
      submittedAt: submittedAtIso,
      completedAt: submittedAtIso,  // Use submittedAt as completedAt for consistency
      createdAt: serverTimestamp(),
      isMarked: isMarked === true,  // Ensure boolean value
      questionResults: questionResults || [],
      cognitiveBreakdown: cognitiveBreakdown || {},
    });

    return NextResponse.json(
      {
        success: true,
        attemptId: attemptDoc.id,
        score,
        percentage,
        questionResults,
        cognitiveBreakdown,
        source: 'firebase_fallback',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save quiz attempt', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
