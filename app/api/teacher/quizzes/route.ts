import { NextRequest, NextResponse } from 'next/server';
import { pgPool } from '@/lib/postgres';
import { db } from '@/firebase/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';

let hasQuizAttemptsTableCache: boolean | null = null;
let hasQuizAssignmentsTableCache: boolean | null = null;
let quizColumnsCache: Set<string> | null = null;
let quizItemColumnsCache: Set<string> | null = null;
let questionColumnsCache: Set<string> | null = null;

async function getQuizColumns(): Promise<Set<string>> {
  if (quizColumnsCache) return quizColumnsCache;
  const res = await pgPool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'quizzes'
    `
  );
  quizColumnsCache = new Set<string>(res.rows.map((row: any) => String(row.column_name)));
  return quizColumnsCache;
}

async function getQuizItemColumns(): Promise<Set<string>> {
  if (quizItemColumnsCache) return quizItemColumnsCache;
  const res = await pgPool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'quiz_items'
    `
  );
  quizItemColumnsCache = new Set<string>(res.rows.map((row: any) => String(row.column_name)));
  return quizItemColumnsCache;
}

async function getQuestionColumns(): Promise<Set<string>> {
  if (questionColumnsCache) return questionColumnsCache;
  const res = await pgPool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'questions'
    `
  );
  questionColumnsCache = new Set<string>(res.rows.map((row: any) => String(row.column_name)));
  return questionColumnsCache;
}

function normalizeAnswerText(answer: any): string {
  if (answer === null || answer === undefined) return '';
  if (typeof answer === 'string') return answer;
  if (typeof answer === 'number' || typeof answer === 'boolean') return String(answer);
  if (typeof answer === 'object') {
    if (answer.value !== undefined && answer.value !== null) return String(answer.value);
    try {
      return JSON.stringify(answer);
    } catch {
      return '';
    }
  }
  return '';
}

function normalizeExplanationText(explanation: any): string {
  if (explanation === null || explanation === undefined) return '';
  if (typeof explanation === 'string') {
    const trimmed = explanation.trim();
    if (trimmed === '[object Object]') return '';
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
  if (typeof explanation === 'object') {
    if (typeof explanation.text === 'string') return explanation.text;
    try {
      return JSON.stringify(explanation);
    } catch {
      return '';
    }
  }
  return String(explanation);
}

async function resolveOrCreateQuestionId(item: any, fallbackQuestionId: any, payload: any): Promise<string | null> {
  const candidateId = String(item?.questionId ?? item?.id ?? fallbackQuestionId ?? '').trim();

  if (candidateId) {
    const byId = await pgPool.query(
      `SELECT id::text AS id FROM questions WHERE id::text = $1 LIMIT 1`,
      [candidateId]
    );
    if (byId.rowCount) return String(byId.rows[0].id);
  }

  const questionText = String(item?.question?.text || item?.questionText || '').trim();
  if (questionText) {
    const byText = await pgPool.query(
      `
        SELECT id::text AS id
        FROM questions
        WHERE LOWER(COALESCE(question_text, '')) = LOWER($1)
          AND LOWER(COALESCE(subject, '')) = LOWER($2)
          AND LOWER(COALESCE(grade, '')) = LOWER($3)
        ORDER BY created_at DESC NULLS LAST, id DESC
        LIMIT 1
      `,
      [questionText, String(item?.subject || payload?.subject || ''), String(payload?.class || '')]
    );
    if (byText.rowCount) return String(byText.rows[0].id);
  }

  if (!questionText) return null;

  const questionColumns = await getQuestionColumns();
  if (!questionColumns.size) return null;

  const now = new Date();
  const schoolIdRaw = String(payload?.schoolId || '').trim();
  const schoolPk = /^\d+$/.test(schoolIdRaw) ? Number.parseInt(schoolIdRaw, 10) : null;
  const qbSource = schoolIdRaw ? 'school' : 'oup';
  const typeRaw = String(item?.questionType || item?.type || '').toLowerCase();
  const normalizedType = typeRaw === 'mcq' ? 'multiple' : typeRaw || 'short';
  const interactiveData = item?.interactiveData && typeof item.interactiveData === 'object'
    ? item.interactiveData
    : { options: Array.isArray(item?.options) ? item.options : [] };

  const mapping: Array<{ column: string; value: any; json?: boolean }> = [
    { column: 'question_text', value: questionText },
    { column: 'type', value: normalizedType },
    { column: 'grade', value: String(payload?.class || '') },
    { column: 'subject', value: String(item?.subject || payload?.subject || '') },
    { column: 'book', value: String(payload?.book || '') },
    { column: 'chapter', value: '' },
    { column: 'slo', value: String(item?.slo || '') },
    { column: 'difficulty', value: String(item?.difficulty || 'Medium') },
    { column: 'answer', value: normalizeAnswerText(item?.answer) },
    { column: 'explanation', value: normalizeExplanationText(item?.explanation) },
    { column: 'marks', value: Number(item?.marks) || 1 },
    { column: 'qb_source', value: qbSource },
    { column: 'source_school_pk', value: schoolPk },
    { column: 'source_school_id', value: schoolIdRaw || null },
    { column: 'is_interactive', value: Boolean(item?.isInteractive) },
    { column: 'interactive_data', value: interactiveData, json: true },
    { column: 'image_url', value: String(item?.imageUrl || '') },
    { column: 'created_at', value: now },
    { column: 'updated_at', value: now },
  ];

  const present = mapping.filter((entry) => questionColumns.has(entry.column));
  if (!present.length) return null;

  const insertColumns = present.map((entry) => entry.column);
  const values = present.map((entry) => entry.json ? JSON.stringify(entry.value) : entry.value);
  const placeholders = present.map((entry, idx) => entry.json ? `$${idx + 1}::jsonb` : `$${idx + 1}`);

  const inserted = await pgPool.query(
    `
      INSERT INTO questions (${insertColumns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING id::text AS id
    `,
    values
  );

  return inserted.rows[0]?.id ? String(inserted.rows[0].id) : null;
}

function toIsoDate(value: any): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value?.toDate && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  return null;
}

function normalizeSchedule(value: any): { startAt: string | null; endAt: string | null } | null {
  if (!value || typeof value !== 'object') return null;
  return {
    startAt: toIsoDate(value.startAt),
    endAt: toIsoDate(value.endAt),
  };
}

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

async function getTeacherKeys(teacherId: string): Promise<string[]> {
  const colsRes = await pgPool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name IN ('uid', 'firebase_uid')
    `
  );

  const cols = new Set<string>(colsRes.rows.map((r: any) => r.column_name));
  const where: string[] = [];
  const values: any[] = [];

  if (cols.has('uid')) {
    values.push(teacherId);
    where.push(`uid = $${values.length}`);
  }
  if (cols.has('firebase_uid')) {
    values.push(teacherId);
    where.push(`firebase_uid = $${values.length}`);
  }

  const keys = new Set<string>([String(teacherId)]);
  if (where.length) {
    const sql = `SELECT id::text AS id FROM users WHERE ${where.join(' OR ')} LIMIT 1`;
    const result = await pgPool.query(sql, values);
    if (result.rows[0]?.id) {
      keys.add(String(result.rows[0].id));
    }
  }

  return Array.from(keys);
}

async function resolveTeacherDbId(teacherId: string): Promise<string | null> {
  const colsRes = await pgPool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name IN ('uid', 'firebase_uid')
    `
  );

  const cols = new Set<string>(colsRes.rows.map((r: any) => r.column_name));
  const where: string[] = ['id::text = $1'];

  if (cols.has('uid')) where.push('uid = $1');
  if (cols.has('firebase_uid')) where.push('firebase_uid = $1');

  const res = await pgPool.query(
    `
      SELECT id::text AS id
      FROM users
      WHERE ${where.join(' OR ')}
      LIMIT 1
    `,
    [teacherId]
  );

  return res.rows[0]?.id ? String(res.rows[0].id) : null;
}

async function fetchTeacherQuizzesFromPostgres(teacherId: string) {
  const teacherKeys = await getTeacherKeys(teacherId);

  const quizzesRes = await pgPool.query(
    `
      SELECT
        q.id::text AS id,
        COALESCE(NULLIF(to_jsonb(q)->>'title', ''), 'Untitled') AS title,
        COALESCE(NULLIF(to_jsonb(q)->>'quiz_format', ''), NULLIF(to_jsonb(q)->>'quizFormat', ''), 'Online') AS "quizFormat",
        COALESCE(NULLIF(to_jsonb(q)->>'subject', ''), '') AS subject,
        COALESCE(NULLIF(to_jsonb(q)->>'class', ''), NULLIF(to_jsonb(q)->>'grade', ''), '') AS class,
        COALESCE(
          CASE WHEN COALESCE(to_jsonb(q)->>'total_questions', '') ~ '^\\d+$' THEN (to_jsonb(q)->>'total_questions')::int END,
          CASE WHEN COALESCE(to_jsonb(q)->>'totalQuestions', '') ~ '^\\d+$' THEN (to_jsonb(q)->>'totalQuestions')::int END,
          jsonb_array_length(COALESCE(to_jsonb(q)->'items', to_jsonb(q)->'quizItems', to_jsonb(q)->'questions', '[]'::jsonb)),
          qi_counts.question_count,
          0
        ) AS "totalQuestions",
        COALESCE(
          CASE WHEN COALESCE(to_jsonb(q)->>'total_marks', '') ~ '^\\d+$' THEN (to_jsonb(q)->>'total_marks')::int END,
          CASE WHEN COALESCE(to_jsonb(q)->>'totalMarks', '') ~ '^\\d+$' THEN (to_jsonb(q)->>'totalMarks')::int END,
          0
        ) AS "totalMarks",
        q.created_at AS "createdAt"
      FROM quizzes q
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS question_count
        FROM quiz_items qi
        WHERE qi.quiz_id::text = q.id::text
      ) qi_counts ON true
      WHERE
        COALESCE(NULLIF(to_jsonb(q)->>'created_by', ''), '') = ANY($1::text[])
        OR COALESCE(NULLIF(to_jsonb(q)->>'teacher_id', ''), '') = ANY($1::text[])
      ORDER BY q.created_at DESC NULLS LAST
      LIMIT 200
    `,
    [teacherKeys]
  );

  const quizIds = quizzesRes.rows.map((q: any) => String(q.id));
  const studentAttemptsByQuiz = new Map<string, number>();
  const totalAssignmentsByQuiz = new Map<string, number>();

  if (quizIds.length > 0 && (await hasQuizAttemptsTable())) {
    const attemptsRes = await pgPool.query(
      `
        SELECT quiz_id::text AS quiz_id, COUNT(*)::int AS count
        FROM quiz_attempts
        WHERE quiz_id::text = ANY($1::text[])
        GROUP BY quiz_id
      `,
      [quizIds]
    );
    attemptsRes.rows.forEach((row: any) => {
      studentAttemptsByQuiz.set(String(row.quiz_id), Number(row.count) || 0);
    });
  }

  if (quizIds.length > 0 && (await hasQuizAssignmentsTable())) {
    const assignmentsRes = await pgPool.query(
      `
        SELECT quiz_id::text AS quiz_id, COUNT(*)::int AS count
        FROM quiz_assignments
        WHERE quiz_id::text = ANY($1::text[])
        GROUP BY quiz_id
      `,
      [quizIds]
    );
    assignmentsRes.rows.forEach((row: any) => {
      totalAssignmentsByQuiz.set(String(row.quiz_id), Number(row.count) || 0);
    });
  }

  return quizzesRes.rows.map((quiz: any) => {
    const quizId = String(quiz.id);
    const quizFormat = String(quiz.quizFormat || 'Online');
    const createdAtIso = quiz.createdAt ? new Date(quiz.createdAt).toISOString() : new Date().toISOString();

    return {
      id: quizId,
      title: quiz.title || 'Untitled',
      quizFormat,
      subject: quiz.subject || '',
      class: quiz.class || '',
      totalQuestions: Number(quiz.totalQuestions) || 0,
      totalMarks: Number(quiz.totalMarks) || 0,
      createdAt: createdAtIso,
      studentAttempts: studentAttemptsByQuiz.get(quizId) || 0,
      totalAssignments: quizFormat === 'Online' ? (totalAssignmentsByQuiz.get(quizId) || 0) : 0,
    };
  });
}

async function fetchTeacherQuizzesFromFirebase(teacherId: string) {
  const quizzesRef = collection(db, 'quizzes');
  const q = query(quizzesRef, where('createdBy', '==', teacherId));
  const querySnapshot = await getDocs(q);

  const quizzes = await Promise.all(
    querySnapshot.docs.map(async (docSnap) => {
      const quizData = docSnap.data();

      let studentAttempts = 0;
      try {
        const attemptsRef = collection(db, 'quizAttempts');
        const attemptsQuery = query(attemptsRef, where('quizId', '==', docSnap.id));
        const attemptsSnapshot = await getDocs(attemptsQuery);
        studentAttempts = attemptsSnapshot.docs.length;
      } catch {
      }

      let totalAssignments = 0;
      if (quizData.quizFormat === 'Online') {
        try {
          const assignmentsRef = collection(db, 'quizAssignments');
          const assignmentsQuery = query(assignmentsRef, where('quizId', '==', docSnap.id));
          const assignmentsSnapshot = await getDocs(assignmentsQuery);
          totalAssignments = assignmentsSnapshot.docs.length;
        } catch {
        }
      }

      return {
        id: docSnap.id,
        title: quizData.title || 'Untitled',
        quizFormat: quizData.quizFormat || 'Online',
        subject: quizData.subject || '',
        class: quizData.class || '',
        totalQuestions: quizData.totalQuestions || 0,
        totalMarks: quizData.totalMarks || 0,
        createdAt: quizData.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
        studentAttempts,
        totalAssignments,
      };
    })
  );

  quizzes.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  return quizzes;
}

async function createTeacherQuizInPostgres(request: NextRequest, payload: any) {
  const columns = await getQuizColumns();

  if (!columns.size) {
    throw new Error('Quizzes table columns unavailable');
  }

  const teacherId =
    payload?.createdBy ||
    request.headers.get('x-user-id') ||
    '';

  if (!teacherId) {
    return NextResponse.json({ error: 'Missing createdBy/teacherId' }, { status: 400 });
  }

  const schoolIdHeader = request.headers.get('x-school-id');
  const schoolId = schoolIdHeader ? Number.parseInt(schoolIdHeader, 10) : null;
  const teacherDbId = await resolveTeacherDbId(String(teacherId));
  const schedule = normalizeSchedule(payload?.schedule);
  const now = new Date();

  const mapping: Array<{ column: string; value: any; json?: boolean }> = [
    { column: 'title', value: payload?.title || 'Untitled Quiz' },
    { column: 'quiz_type', value: payload?.quizType || '' },
    { column: 'quiz_format', value: payload?.quizFormat || 'Online' },
    { column: 'subject', value: payload?.subject || '' },
    { column: 'class', value: payload?.class || '' },
    { column: 'grade', value: payload?.class || '' },
    { column: 'book', value: payload?.book || '' },
    { column: 'chapters', value: Array.isArray(payload?.chapters) ? payload.chapters : [], json: true },
    { column: 'slos', value: Array.isArray(payload?.slos) ? payload.slos : [], json: true },
    { column: 'items', value: Array.isArray(payload?.items) ? payload.items : [], json: true },
    { column: 'question_ids', value: Array.isArray(payload?.questionIds) ? payload.questionIds : [], json: true },
    { column: 'assigned_students', value: Array.isArray(payload?.assignedStudents) ? payload.assignedStudents : [], json: true },
    { column: 'randomization', value: payload?.randomization || null, json: true },
    { column: 'rendering', value: payload?.rendering || null, json: true },
    { column: 'schedule', value: schedule, json: true },
    { column: 'status', value: payload?.status || 'draft' },
    { column: 'notes', value: payload?.notes || null },
    { column: 'version', value: Number(payload?.version) || 1 },
    { column: 'is_marked', value: Boolean(payload?.isMarked) },
    { column: 'is_published', value: payload?.status === 'published' },
    { column: 'time_limit_minutes', value: Number(payload?.timeLimitMinutes) || null },
    { column: 'total_questions', value: Number(payload?.totalQuestions) || 0 },
    { column: 'total_marks', value: Number(payload?.totalMarks) || 0 },
    { column: 'created_by', value: String(teacherId) },
    { column: 'teacher_id', value: teacherDbId || null },
    { column: 'school_id', value: Number.isFinite(schoolId as number) ? schoolId : null },
    { column: 'created_at', value: now },
    { column: 'updated_at', value: now },
  ];

  const present = mapping.filter((item) => columns.has(item.column));
  if (!present.length) {
    throw new Error('No matching columns for quiz insert');
  }

  const insertColumns = present.map((item) => item.column === 'class' ? '"class"' : item.column);
  const values = present.map((item) => item.json ? JSON.stringify(item.value) : item.value);
  const placeholders = present.map((item, index) => item.json ? `$${index + 1}::jsonb` : `$${index + 1}`);

  const sql = `
    INSERT INTO quizzes (${insertColumns.join(', ')})
    VALUES (${placeholders.join(', ')})
    RETURNING id::text AS id
  `;

  const result = await pgPool.query(sql, values);
  const quizId = result.rows[0]?.id;

  if (!quizId) {
    throw new Error('Quiz insert failed');
  }

  try {
    const items = Array.isArray(payload?.items) ? payload.items : [];
    if (items.length && (await hasTable('quiz_items'))) {
      const quizItemColumns = await getQuizItemColumns();
      const nowTs = new Date();

      for (let index = 0; index < items.length; index++) {
        const item = items[index] || {};
        const fallbackQuestionId = Array.isArray(payload?.questionIds) ? payload.questionIds[index] : null;
        const questionId = await resolveOrCreateQuestionId(item, fallbackQuestionId, payload);

        if (!questionId) continue;

        const rowMapping: Array<{ column: string; value: any }> = [
          { column: 'quiz_id', value: String(quizId) },
          { column: 'question_id', value: String(questionId) },
          { column: 'position', value: index + 1 },
          { column: 'marks', value: Number(item?.marks) || 1 },
          { column: 'created_at', value: nowTs },
        ];

        const present = rowMapping.filter((entry) => quizItemColumns.has(entry.column));
        if (!present.length) continue;

        const insertColumns = present.map((entry) => entry.column);
        const insertValues = present.map((entry) => entry.value);
        const placeholders = present.map((_, i) => `$${i + 1}`);

        await pgPool.query(
          `
            INSERT INTO quiz_items (${insertColumns.join(', ')})
            VALUES (${placeholders.join(', ')})
          `,
          insertValues
        );
      }
    }
  } catch (quizItemsError) {
    console.error('[teacher/quizzes][POST] quiz_items insert fallback failed:', quizItemsError);
  }

  return NextResponse.json(
    {
      success: true,
      quiz: {
        id: String(quizId),
        ...payload,
      },
      source: 'postgres',
    },
    { status: 201 }
  );
}

async function createTeacherQuizInFirebase(payload: any) {
  const quizDoc = await addDoc(collection(db, 'quizzes'), {
    ...payload,
    createdAt: payload?.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return NextResponse.json(
    {
      success: true,
      quiz: {
        id: quizDoc.id,
        ...payload,
      },
      source: 'firebase_fallback',
    },
    { status: 201 }
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const teacherId =
      searchParams.get('teacherId') ||
      request.headers.get('x-user-id') ||
      '';

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Missing teacherId parameter' },
        { status: 400 }
      );
    }

    try {
      const quizzes = await fetchTeacherQuizzesFromPostgres(teacherId);
      return NextResponse.json({ quizzes, source: 'postgres' }, { status: 200 });
    } catch (pgError) {
      console.error('[teacher/quizzes][GET] PostgreSQL failed, falling back to Firebase:', pgError);
      const quizzes = await fetchTeacherQuizzesFromFirebase(teacherId);
      return NextResponse.json({ quizzes, source: 'firebase_fallback' }, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch quizzes' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    try {
      return await createTeacherQuizInPostgres(request, payload);
    } catch (pgError) {
      console.error('[teacher/quizzes][POST] PostgreSQL failed, falling back to Firebase:', pgError);
      return await createTeacherQuizInFirebase(payload);
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create quiz' },
      { status: 500 }
    );
  }
}
