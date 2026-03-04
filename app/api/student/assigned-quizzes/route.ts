import { NextRequest, NextResponse } from 'next/server';
import { pgPool } from '@/lib/postgres';
import { db } from '@/firebase/firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

let hasQuizAssignmentsTableCache: boolean | null = null;

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

function normalizeGrade(value: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  const match = trimmed.match(/^(?:grade|class)\s*(\d+)$/i);
  if (match) return `Grade ${match[1]}`;
  if (/^\d+$/.test(trimmed)) return `Grade ${trimmed}`;
  return trimmed;
}

async function resolveStudentPostgresUser(studentId: string) {
  const res = await pgPool.query(
    `
      SELECT
        u.id::text AS id,
        u.school_id::text AS school_id,
        COALESCE(
          NULLIF(u.assigned_grade, ''),
          NULLIF(to_jsonb(u)->>'class', ''),
          NULLIF(to_jsonb(u)->>'grade', '')
        ) AS assigned_grade
      FROM users u
      WHERE COALESCE(to_jsonb(u)->>'firebase_uid', '') = $1
         OR COALESCE(to_jsonb(u)->>'uid', '') = $1
         OR u.id::text = $1
      LIMIT 1
    `,
    [studentId]
  );

  if (!res.rowCount) return null;
  return res.rows[0];
}

async function fetchFromPostgres(studentId: string) {
  const student = await resolveStudentPostgresUser(studentId);
  if (!student) return { assignments: [], attempts: [] };

  const studentPk = student.id;
  const schoolId = student.school_id;
  const assignedGrade = normalizeGrade(student.assigned_grade || '');
  const studentKeys = Array.from(new Set([String(studentId), String(studentPk)]));

  const attemptsRes = await pgPool.query(
    `
      SELECT
        qa.id::text AS id,
        qa.quiz_id::text AS "quizId",
        COALESCE(qa.score, 0) AS score,
        COALESCE(qa.total_marks, 0) AS "totalMarks",
        qa.submitted_at AS "submittedAt",
        qa.updated_at AS "updatedAt",
        qa.status
      FROM quiz_attempts qa
      WHERE qa.student_id::text = $1
      ORDER BY qa.submitted_at DESC NULLS LAST, qa.updated_at DESC NULLS LAST
      LIMIT 200
    `,
    [studentPk]
  );

  const attemptsByQuiz = new Map<string, any[]>();
  attemptsRes.rows.forEach((row: any) => {
    const quizId = String(row.quizId);
    if (!attemptsByQuiz.has(quizId)) attemptsByQuiz.set(quizId, []);
    attemptsByQuiz.get(quizId)!.push(row);
  });

  let quizRows: any[] = [];

  if (await hasQuizAssignmentsTable()) {
    const assignedQuizzesRes = await pgPool.query(
      `
        SELECT
          q.id::text AS id,
          COALESCE(NULLIF(to_jsonb(q)->>'title', ''), 'Untitled Quiz') AS title,
          COALESCE(NULLIF(to_jsonb(q)->>'quiz_type', ''), NULLIF(to_jsonb(q)->>'quizType', ''), '') AS "quizType",
          COALESCE(NULLIF(to_jsonb(q)->>'quiz_format', ''), NULLIF(to_jsonb(q)->>'quizFormat', ''), 'Online') AS "quizFormat",
          COALESCE(
            NULLIF(to_jsonb(q)->>'grade', ''),
            NULLIF(to_jsonb(q)->>'class', ''),
            ''
          ) AS grade,
          COALESCE(
            NULLIF(to_jsonb(q)->>'subject', ''),
            ''
          ) AS subject,
          COALESCE(NULLIF(to_jsonb(q)->>'book', ''), '') AS book,
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
          COALESCE(
            CASE WHEN COALESCE(to_jsonb(q)->>'time_limit_minutes', '') ~ '^\\d+$' THEN (to_jsonb(q)->>'time_limit_minutes')::int END,
            CASE WHEN COALESCE(to_jsonb(q)->>'timeLimitMinutes', '') ~ '^\\d+$' THEN (to_jsonb(q)->>'timeLimitMinutes')::int END,
            30
          ) AS "timeLimitMinutes",
          COALESCE(to_jsonb(q)->'items', to_jsonb(q)->'quizItems', to_jsonb(q)->'questions', '[]'::jsonb) AS items,
          q.created_at AS "createdAt",
          qa.assigned_at AS "assignedAt",
          COALESCE(qa.status, 'assigned') AS "assignmentStatus"
        FROM quiz_assignments qa
        JOIN quizzes q ON q.id::text = qa.quiz_id::text
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS question_count
          FROM quiz_items qi
          WHERE qi.quiz_id::text = q.id::text
        ) qi_counts ON true
        WHERE qa.student_id::text = ANY($1::text[])
          AND ($2::text IS NULL OR q.school_id::text = $2)
          AND (
            $3::text = ''
            OR LOWER(COALESCE(NULLIF(to_jsonb(q)->>'grade', ''), NULLIF(to_jsonb(q)->>'class', ''), '')) = LOWER($3)
          )
        ORDER BY qa.assigned_at DESC NULLS LAST, q.created_at DESC NULLS LAST
        LIMIT 200
      `,
      [studentKeys, schoolId || null, assignedGrade]
    );
    quizRows = assignedQuizzesRes.rows;
  }

  if (!quizRows.length) {
    const quizzesRes = await pgPool.query(
      `
        SELECT
          q.id::text AS id,
          COALESCE(NULLIF(to_jsonb(q)->>'title', ''), 'Untitled Quiz') AS title,
          COALESCE(NULLIF(to_jsonb(q)->>'quiz_type', ''), NULLIF(to_jsonb(q)->>'quizType', ''), '') AS "quizType",
          COALESCE(NULLIF(to_jsonb(q)->>'quiz_format', ''), NULLIF(to_jsonb(q)->>'quizFormat', ''), 'Online') AS "quizFormat",
          COALESCE(
            NULLIF(to_jsonb(q)->>'grade', ''),
            NULLIF(to_jsonb(q)->>'class', ''),
            ''
          ) AS grade,
          COALESCE(
            NULLIF(to_jsonb(q)->>'subject', ''),
            ''
          ) AS subject,
          COALESCE(NULLIF(to_jsonb(q)->>'book', ''), '') AS book,
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
          COALESCE(
            CASE WHEN COALESCE(to_jsonb(q)->>'time_limit_minutes', '') ~ '^\\d+$' THEN (to_jsonb(q)->>'time_limit_minutes')::int END,
            CASE WHEN COALESCE(to_jsonb(q)->>'timeLimitMinutes', '') ~ '^\\d+$' THEN (to_jsonb(q)->>'timeLimitMinutes')::int END,
            30
          ) AS "timeLimitMinutes",
          COALESCE(to_jsonb(q)->'items', to_jsonb(q)->'quizItems', to_jsonb(q)->'questions', '[]'::jsonb) AS items,
          q.created_at AS "createdAt",
          q.created_at AS "assignedAt",
          'assigned'::text AS "assignmentStatus"
        FROM quizzes q
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS question_count
          FROM quiz_items qi
          WHERE qi.quiz_id::text = q.id::text
        ) qi_counts ON true
        WHERE ($1::text IS NULL OR q.school_id::text = $1)
          AND (
            $2::text = ''
            OR LOWER(COALESCE(NULLIF(to_jsonb(q)->>'grade', ''), NULLIF(to_jsonb(q)->>'class', ''), '')) = LOWER($2)
          )
          AND COALESCE(q.is_published, true) = true
        ORDER BY q.created_at DESC NULLS LAST
        LIMIT 200
      `,
      [schoolId || null, assignedGrade]
    );
    quizRows = quizzesRes.rows;
  }

  const assignments = quizRows.map((quiz: any) => {
    const quizId = String(quiz.id);
    const attemptsForQuiz = attemptsByQuiz.get(quizId) || [];
    const latestAttempt = attemptsForQuiz[0] || null;
    const totalMarks = Number(quiz.totalMarks) || 0;
    const latestScore = latestAttempt ? Number(latestAttempt.score) || 0 : 0;
    const percentage = totalMarks > 0 ? Math.round((latestScore / totalMarks) * 100) : 0;

    return {
      id: quizId,
      title: quiz.title,
      quizType: quiz.quizType,
      quizFormat: quiz.quizFormat,
      class: quiz.grade,
      subject: quiz.subject,
      book: quiz.book,
      chapters: [],
      isMarked: latestAttempt ? String(latestAttempt.status || '').toLowerCase() === 'graded' : false,
      timeLimitMinutes: Number(quiz.timeLimitMinutes) || 30,
      schedule: { startAt: null, endAt: null },
      totalQuestions: Number(quiz.totalQuestions) || (Array.isArray(quiz.items) ? quiz.items.length : 0),
      totalMarks,
      status: 'published',
      createdAt: quiz.createdAt ? new Date(quiz.createdAt).toISOString() : null,
      assignmentStatus: latestAttempt ? 'attempted' : String(quiz.assignmentStatus || 'assigned'),
      assignedAt: quiz.assignedAt
        ? new Date(quiz.assignedAt).toISOString()
        : quiz.createdAt
          ? new Date(quiz.createdAt).toISOString()
          : null,
      hasAttempted: attemptsForQuiz.length > 0,
      attemptCount: attemptsForQuiz.length,
      latestScore,
      latestPercentage: percentage,
      completedAt: latestAttempt?.submittedAt
        ? new Date(latestAttempt.submittedAt).toISOString()
        : latestAttempt?.updatedAt
          ? new Date(latestAttempt.updatedAt).toISOString()
          : null,
    };
  });

  const attempts = assignments
    .filter((a: any) => a.hasAttempted)
    .map((a: any) => ({
      id: `${a.id}-latest`,
      quizId: a.id,
      quizTitle: a.title,
      subject: a.subject,
      class: a.class,
      score: a.latestScore,
      totalMarks: a.totalMarks,
      percentage: a.latestPercentage,
      isMarked: a.isMarked,
      completedAt: a.completedAt,
    }))
    .sort((a: any, b: any) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    });

  return { assignments, attempts };
}

async function fetchFromFirebase(studentId: string) {
  const assignmentsRef = collection(db, 'quizAssignments');
  const q = query(assignmentsRef, where('studentId', '==', studentId));
  const snapshot = await getDocs(q);

  const assignments = await Promise.all(
    snapshot.docs.map(async (assignmentDoc) => {
      const assignmentData = assignmentDoc.data();

      let attemptCount = 0;
      let latestAttempt: any = null;
      try {
        const attemptsRef = collection(db, 'quizAttempts');
        const attemptsQuery = query(attemptsRef, where('quizId', '==', assignmentData.quizId), where('studentId', '==', studentId));
        const attemptsSnapshot = await getDocs(attemptsQuery);
        attemptCount = attemptsSnapshot.docs.length;
        if (attemptCount > 0) {
          latestAttempt = attemptsSnapshot.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a: any, b: any) => {
              const dateA = a.completedAt?.toDate?.()?.getTime?.() || new Date(a.completedAt || 0).getTime() || 0;
              const dateB = b.completedAt?.toDate?.()?.getTime?.() || new Date(b.completedAt || 0).getTime() || 0;
              return dateB - dateA;
            })[0];
        }
      } catch {
      }

      try {
        const quizDocRef = doc(db, 'quizzes', assignmentData.quizId);
        const quizDocSnapshot = await getDoc(quizDocRef);

        if (quizDocSnapshot.exists()) {
          const quizData = quizDocSnapshot.data();
          const totalMarks = quizData.totalMarks || 0;
          const latestScore = latestAttempt?.score || 0;
          const latestPercentage = latestAttempt?.percentage || (totalMarks > 0 ? Math.round((latestScore / totalMarks) * 100) : 0);

          return {
            id: assignmentData.quizId,
            title: quizData.title || assignmentData.quizTitle,
            quizType: quizData.quizType || '',
            quizFormat: quizData.quizFormat || 'Online',
            class: quizData.class || '',
            subject: quizData.subject || '',
            book: quizData.book || '',
            chapters: quizData.chapters || [],
            isMarked: latestAttempt?.isMarked || false,
            timeLimitMinutes: quizData.timeLimitMinutes || 0,
            schedule: quizData.schedule || { startAt: null, endAt: null },
            totalQuestions: quizData.totalQuestions || 0,
            totalMarks,
            status: quizData.status || 'draft',
            createdAt: quizData.createdAt || null,
            assignmentStatus: assignmentData.status,
            assignedAt: assignmentData.assignedAt,
            hasAttempted: attemptCount > 0,
            attemptCount,
            latestScore,
            latestPercentage,
            completedAt: latestAttempt?.completedAt || null,
          };
        }
      } catch {
      }

      return {
        id: assignmentData.quizId,
        title: assignmentData.quizTitle,
        quizType: '',
        quizFormat: 'Online',
        class: '',
        subject: '',
        book: '',
        chapters: [],
        isMarked: latestAttempt?.isMarked || false,
        timeLimitMinutes: 0,
        schedule: { startAt: null, endAt: null },
        totalQuestions: 0,
        totalMarks: 0,
        status: 'draft',
        createdAt: null,
        assignmentStatus: assignmentData.status,
        assignedAt: assignmentData.assignedAt,
        hasAttempted: attemptCount > 0,
        attemptCount,
        latestScore: latestAttempt?.score || 0,
        latestPercentage: latestAttempt?.percentage || 0,
        completedAt: latestAttempt?.completedAt || null,
      };
    })
  );

  const attempts = assignments
    .filter((a: any) => a.hasAttempted)
    .map((a: any) => ({
      id: `${a.id}-latest`,
      quizId: a.id,
      quizTitle: a.title,
      subject: a.subject,
      class: a.class,
      score: a.latestScore || 0,
      totalMarks: a.totalMarks || 0,
      percentage: a.latestPercentage || 0,
      isMarked: !!a.isMarked,
      completedAt: a.completedAt || null,
    }))
    .sort((a: any, b: any) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    });

  return { assignments, attempts };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId') || request.headers.get('x-user-id');

    if (!studentId) {
      return NextResponse.json(
        { error: 'Missing studentId parameter' },
        { status: 400 }
      );
    }

    try {
      const payload = await fetchFromPostgres(studentId);

      // In schemas without quiz_assignments table, assignments are typically stored in Firebase.
      // If Postgres returns empty, prefer Firebase to avoid blank student assigned list.
      const hasAssignmentsTable = await hasQuizAssignmentsTable();
      if (!hasAssignmentsTable && (!payload.assignments || payload.assignments.length === 0)) {
        const fbPayload = await fetchFromFirebase(studentId);
        return NextResponse.json({ ...fbPayload, source: 'firebase_fallback_no_pg_assignments' }, { status: 200 });
      }

      return NextResponse.json({ ...payload, source: 'postgres' }, { status: 200 });
    } catch (pgError) {
      console.error('[student/assigned-quizzes][GET] PostgreSQL failed, falling back to Firebase:', pgError);
      const payload = await fetchFromFirebase(studentId);
      return NextResponse.json({ ...payload, source: 'firebase_fallback' }, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch assigned quizzes' },
      { status: 500 }
    );
  }
}
