import { NextRequest, NextResponse } from 'next/server';
import { pgPool } from '@/lib/postgres';
import { db } from '@/firebase/firebase';
import { doc, getDoc, deleteDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';

let hasQuizAttemptsTableCache: boolean | null = null;
let hasQuizAssignmentsTableCache: boolean | null = null;
let quizColumnsCache: Set<string> | null = null;

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

async function fetchQuizFromFirebase(quizId: string) {
  const quizRef = doc(db, 'quizzes', quizId);
  const quizDoc = await getDoc(quizRef);

  if (!quizDoc.exists()) {
    return null;
  }

  const quizData = quizDoc.data();
  const attemptsRef = collection(db, 'quizAttempts');
  const attemptsQuery = query(attemptsRef, where('quizId', '==', quizId));
  const attemptsSnapshot = await getDocs(attemptsQuery);

  const attempts = await Promise.all(
    attemptsSnapshot.docs.map(async (docSnap) => {
      let studentName = docSnap.data().studentName || 'Unknown';

      if (studentName === 'Unknown' && docSnap.data().studentId) {
        try {
          const userRef = doc(db, 'users', docSnap.data().studentId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            studentName = userData?.displayName || userData?.name || 'Unknown';
          }
        } catch {
        }
      }

      return {
        id: docSnap.id,
        studentId: docSnap.data().studentId || '',
        studentName,
        score: docSnap.data().score || 0,
        totalMarks: docSnap.data().totalMarks || 0,
        percentage: docSnap.data().percentage || 0,
        completedAt: docSnap.data().completedAt || null,
        isMarked: docSnap.data().isMarked || false,
        hasManualGrades: docSnap.data().hasManualGrades || false,
      };
    })
  );

  return {
    quiz: {
      id: quizId,
      title: quizData.title || 'Untitled',
      quizFormat: quizData.quizFormat || 'Online',
      subject: quizData.subject || '',
      class: quizData.class || '',
      totalQuestions: quizData.totalQuestions || 0,
      totalMarks: quizData.totalMarks || 0,
      createdAt: quizData.createdAt || null,
      items: quizData.items || [],
    },
    attempts,
  };
}

async function deleteQuizFromFirebase(quizId: string) {
  const quizRef = doc(db, 'quizzes', quizId);
  const quizSnap = await getDoc(quizRef);

  if (!quizSnap.exists()) {
    return false;
  }

  try {
    const attemptsQuery = query(collection(db, 'quizAttempts'), where('quizId', '==', quizId));
    const attemptsSnap = await getDocs(attemptsQuery);
    for (const attemptDoc of attemptsSnap.docs) {
      await deleteDoc(attemptDoc.ref);
    }
  } catch {
  }

  try {
    const assignmentsQuery = query(collection(db, 'quizAssignments'), where('quizId', '==', quizId));
    const assignmentsSnap = await getDocs(assignmentsQuery);
    for (const assignmentDoc of assignmentsSnap.docs) {
      await deleteDoc(assignmentDoc.ref);
    }
  } catch {
  }

  await deleteDoc(quizRef);
  return true;
}

async function updateQuizInFirebase(quizId: string, payload: any) {
  const quizRef = doc(db, 'quizzes', quizId);
  const quizSnap = await getDoc(quizRef);

  if (!quizSnap.exists()) {
    return null;
  }

  await updateDoc(quizRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  });

  return {
    success: true,
    message: 'Quiz updated successfully',
    quizId,
    source: 'firebase_fallback',
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;

    try {
      const quizRes = await pgPool.query(
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
            q.created_at AS "createdAt",
            COALESCE(to_jsonb(q)->'items', to_jsonb(q)->'quizItems', to_jsonb(q)->'questions', '[]'::jsonb) AS items
          FROM quizzes q
          LEFT JOIN LATERAL (
            SELECT COUNT(*)::int AS question_count
            FROM quiz_items qi
            WHERE qi.quiz_id::text = q.id::text
          ) qi_counts ON true
          WHERE q.id::text = $1
          LIMIT 1
        `,
        [quizId]
      );

      if (!quizRes.rowCount) {
        const fallbackPayload = await fetchQuizFromFirebase(quizId);
        if (!fallbackPayload) {
          return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }
        return NextResponse.json({ ...fallbackPayload, source: 'firebase_fallback' }, { status: 200 });
      }

      const quizRow = quizRes.rows[0];
      let attempts: any[] = [];

      if (await hasQuizAttemptsTable()) {
        const attemptsRes = await pgPool.query(
          `
            SELECT
              qa.id::text AS id,
              COALESCE(qa.student_id::text, '') AS "studentId",
              COALESCE(
                NULLIF(TRIM(CONCAT(COALESCE(to_jsonb(u)->>'first_name', ''), ' ', COALESCE(to_jsonb(u)->>'last_name', ''))), ''),
                NULLIF(to_jsonb(u)->>'name', ''),
                NULLIF(to_jsonb(u)->>'display_name', ''),
                'Unknown'
              ) AS "studentName",
              COALESCE(
                CASE WHEN COALESCE(to_jsonb(qa)->>'score', '') ~ '^\\d+(\\.\\d+)?$' THEN (to_jsonb(qa)->>'score')::numeric END,
                0
              ) AS score,
              COALESCE(
                CASE WHEN COALESCE(to_jsonb(qa)->>'total_marks', '') ~ '^\\d+(\\.\\d+)?$' THEN (to_jsonb(qa)->>'total_marks')::numeric END,
                0
              ) AS "totalMarks",
              COALESCE(
                CASE WHEN COALESCE(to_jsonb(qa)->>'percentage', '') ~ '^\\d+(\\.\\d+)?$' THEN (to_jsonb(qa)->>'percentage')::numeric END,
                CASE
                  WHEN COALESCE(
                    CASE WHEN COALESCE(to_jsonb(qa)->>'total_marks', '') ~ '^\\d+(\\.\\d+)?$' THEN (to_jsonb(qa)->>'total_marks')::numeric END,
                    0
                  ) > 0
                  THEN ROUND(
                    (
                      COALESCE(
                        CASE WHEN COALESCE(to_jsonb(qa)->>'score', '') ~ '^\\d+(\\.\\d+)?$' THEN (to_jsonb(qa)->>'score')::numeric END,
                        0
                      )
                      /
                      COALESCE(
                        CASE WHEN COALESCE(to_jsonb(qa)->>'total_marks', '') ~ '^\\d+(\\.\\d+)?$' THEN (to_jsonb(qa)->>'total_marks')::numeric END,
                        1
                      )
                    ) * 100
                  )
                END,
                0
              ) AS percentage,
              COALESCE(
                NULLIF(to_jsonb(qa)->>'completed_at', ''),
                NULLIF(to_jsonb(qa)->>'submitted_at', ''),
                NULLIF(to_jsonb(qa)->>'updated_at', ''),
                NULL
              ) AS "completedAt",
              CASE
                WHEN LOWER(COALESCE(to_jsonb(qa)->>'is_marked', 'false')) IN ('true', 't', '1') THEN true
                WHEN LOWER(COALESCE(to_jsonb(qa)->>'status', '')) IN ('graded', 'checked', 'marked') THEN true
                ELSE false
              END AS "isMarked",
              CASE
                WHEN LOWER(COALESCE(to_jsonb(qa)->>'has_manual_grades', 'false')) IN ('true', 't', '1') THEN true
                ELSE false
              END AS "hasManualGrades"
            FROM quiz_attempts qa
            LEFT JOIN users u ON u.id::text = qa.student_id::text
            WHERE qa.quiz_id::text = $1
            ORDER BY qa.submitted_at DESC NULLS LAST, qa.updated_at DESC NULLS LAST
          `,
          [quizId]
        );

        attempts = attemptsRes.rows.map((row: any) => ({
          id: row.id,
          studentId: row.studentId,
          studentName: row.studentName,
          score: Number(row.score) || 0,
          totalMarks: Number(row.totalMarks) || 0,
          percentage: Number(row.percentage) || 0,
          completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : null,
          isMarked: Boolean(row.isMarked),
          hasManualGrades: Boolean(row.hasManualGrades),
        }));
      }

      return NextResponse.json(
        {
          quiz: {
            id: quizRow.id,
            title: quizRow.title,
            quizFormat: quizRow.quizFormat,
            subject: quizRow.subject,
            class: quizRow.class,
            totalQuestions: Number(quizRow.totalQuestions) || 0,
            totalMarks: Number(quizRow.totalMarks) || 0,
            createdAt: quizRow.createdAt ? new Date(quizRow.createdAt).toISOString() : null,
            items: Array.isArray(quizRow.items) ? quizRow.items : [],
          },
          attempts,
          source: 'postgres',
        },
        { status: 200 }
      );
    } catch (pgError) {
      console.error('[teacher/quizzes/:quizId][GET] PostgreSQL failed, falling back to Firebase:', pgError);
      const fallbackPayload = await fetchQuizFromFirebase(quizId);
      if (!fallbackPayload) {
        return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
      }
      return NextResponse.json({ ...fallbackPayload, source: 'firebase_fallback' }, { status: 200 });
    }
  } catch (error) {
    console.error('Error fetching quiz details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz details' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;

    if (!quizId) {
      return NextResponse.json({ error: 'Missing quiz ID' }, { status: 400 });
    }

    try {
      const quizRes = await pgPool.query(
        `SELECT id::text AS id FROM quizzes WHERE id::text = $1 LIMIT 1`,
        [quizId]
      );

      if (quizRes.rowCount) {
        if (await hasQuizAttemptsTable()) {
          await pgPool.query(`DELETE FROM quiz_attempts WHERE quiz_id::text = $1`, [quizId]);
        }
        if (await hasQuizAssignmentsTable()) {
          await pgPool.query(`DELETE FROM quiz_assignments WHERE quiz_id::text = $1`, [quizId]);
        }
        await pgPool.query(`DELETE FROM quizzes WHERE id::text = $1`, [quizId]);

        return NextResponse.json({
          success: true,
          message: 'Quiz deleted successfully',
          source: 'postgres',
        }, { status: 200 });
      }

      const deleted = await deleteQuizFromFirebase(quizId);
      if (!deleted) {
        return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: 'Quiz deleted successfully',
        source: 'firebase_fallback',
      }, { status: 200 });
    } catch (pgError) {
      console.error('[teacher/quizzes/:quizId][DELETE] PostgreSQL failed, falling back to Firebase:', pgError);
      const deleted = await deleteQuizFromFirebase(quizId);
      if (!deleted) {
        return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
      }
      return NextResponse.json({
        success: true,
        message: 'Quiz deleted successfully',
        source: 'firebase_fallback',
      }, { status: 200 });
    }
  } catch (error) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ quizId: string }> }
) {
  try {
    const { quizId } = await params;
    const payload = await request.json();

    if (!quizId) {
      return NextResponse.json({ error: 'Missing quiz ID' }, { status: 400 });
    }

    try {
      const quizRes = await pgPool.query(
        `SELECT id::text AS id FROM quizzes WHERE id::text = $1 LIMIT 1`,
        [quizId]
      );

      if (!quizRes.rowCount) {
        const firebaseResult = await updateQuizInFirebase(quizId, payload);
        if (!firebaseResult) {
          return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
        }
        return NextResponse.json(firebaseResult, { status: 200 });
      }

      const columns = await getQuizColumns();
      const schedule = normalizeSchedule(payload?.schedule);

      const mapping: Array<{ column: string; value: any; json?: boolean }> = [
        { column: 'title', value: payload?.title },
        { column: 'quiz_type', value: payload?.quizType },
        { column: 'quiz_format', value: payload?.quizFormat },
        { column: 'subject', value: payload?.subject },
        { column: 'class', value: payload?.class },
        { column: 'grade', value: payload?.class },
        { column: 'book', value: payload?.book },
        { column: 'chapters', value: payload?.chapters, json: true },
        { column: 'slos', value: payload?.slos, json: true },
        { column: 'items', value: payload?.items, json: true },
        { column: 'question_ids', value: payload?.questionIds, json: true },
        { column: 'assigned_students', value: payload?.assignedStudents, json: true },
        { column: 'randomization', value: payload?.randomization, json: true },
        { column: 'rendering', value: payload?.rendering, json: true },
        { column: 'schedule', value: schedule, json: true },
        { column: 'status', value: payload?.status },
        { column: 'notes', value: payload?.notes },
        { column: 'version', value: payload?.version },
        { column: 'is_marked', value: payload?.isMarked },
        { column: 'is_published', value: payload?.isPublished },
        { column: 'time_limit_minutes', value: payload?.timeLimitMinutes },
        { column: 'total_questions', value: payload?.totalQuestions },
        { column: 'total_marks', value: payload?.totalMarks },
      ];

      const present = mapping.filter((item) => columns.has(item.column) && item.value !== undefined);
      const assignments: string[] = [];
      const values: any[] = [];

      present.forEach((item) => {
        values.push(item.json ? JSON.stringify(item.value) : item.value);
        const placeholder = item.json ? `$${values.length}::jsonb` : `$${values.length}`;
        const columnName = item.column === 'class' ? '"class"' : item.column;
        assignments.push(`${columnName} = ${placeholder}`);
      });

      if (columns.has('updated_at')) {
        assignments.push('updated_at = NOW()');
      }

      if (!assignments.length) {
        return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
      }

      values.push(quizId);
      await pgPool.query(
        `
          UPDATE quizzes
          SET ${assignments.join(', ')}
          WHERE id::text = $${values.length}
        `,
        values
      );

      return NextResponse.json(
        {
          success: true,
          message: 'Quiz updated successfully',
          quizId,
          source: 'postgres',
        },
        { status: 200 }
      );
    } catch (pgError) {
      console.error('[teacher/quizzes/:quizId][PUT] PostgreSQL failed, falling back to Firebase:', pgError);
      const firebaseResult = await updateQuizInFirebase(quizId, payload);
      if (!firebaseResult) {
        return NextResponse.json({ error: 'Quiz not found' }, { status: 404 });
      }
      return NextResponse.json(firebaseResult, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update quiz' },
      { status: 500 }
    );
  }
}
