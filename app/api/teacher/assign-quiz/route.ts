import { NextRequest, NextResponse } from 'next/server';
import { pgPool } from '@/lib/postgres';
import { db } from '@/firebase/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';

let hasQuizAssignmentsTableCache: boolean | null = null;
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

async function hasQuizAssignmentsTable(): Promise<boolean> {
  if (hasQuizAssignmentsTableCache !== null) return hasQuizAssignmentsTableCache;
  hasQuizAssignmentsTableCache = await hasTable('quiz_assignments');
  return hasQuizAssignmentsTableCache;
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

async function resolveStudentPk(studentId: string): Promise<string> {
  const cols = await getUserColumns();
  const where: string[] = ['id::text = $1'];

  if (cols.has('firebase_uid')) where.push('firebase_uid = $1');
  if (cols.has('uid')) where.push('uid = $1');

  const sql = `
    SELECT id::text AS id
    FROM users
    WHERE ${where.join(' OR ')}
    LIMIT 1
  `;
  const res = await pgPool.query(sql, [studentId]);
  return res.rows[0]?.id ? String(res.rows[0].id) : String(studentId);
}

function normalizeSchedule(value: any): { startAt: string | null; endAt: string | null } | null {
  if (!value || typeof value !== 'object') return null;
  const startAt = value?.startAt?.toDate?.() instanceof Date
    ? value.startAt.toDate().toISOString()
    : (typeof value.startAt === 'string' ? value.startAt : null);
  const endAt = value?.endAt?.toDate?.() instanceof Date
    ? value.endAt.toDate().toISOString()
    : (typeof value.endAt === 'string' ? value.endAt : null);
  return { startAt, endAt };
}

async function assignInPostgres(body: any) {
  if (!(await hasQuizAssignmentsTable())) {
    throw new Error('quiz_assignments table not found');
  }

  const columns = await getAssignmentColumns();
  const schedule = normalizeSchedule(body.schedule);

  for (const rawStudentId of body.studentIds) {
    const studentId = await resolveStudentPk(String(rawStudentId));

    const mapping: Array<{ column: string; value: any; json?: boolean }> = [
      { column: 'quiz_id', value: String(body.quizId) },
      { column: 'student_id', value: studentId },
      { column: 'quiz_title', value: body.quizTitle || 'Quiz' },
      { column: 'is_marked', value: body.isMarked === true },
      { column: 'time_limit_minutes', value: Number(body.timeLimitMinutes) || 30 },
      { column: 'schedule', value: schedule, json: true },
      { column: 'assigned_at', value: new Date() },
      { column: 'status', value: 'assigned' },
      { column: 'started_at', value: null },
      { column: 'completed_at', value: null },
      { column: 'score', value: null },
      { column: 'percentage', value: null },
      { column: 'created_at', value: new Date() },
      { column: 'updated_at', value: new Date() },
    ];

    const present = mapping.filter((item) => columns.has(item.column));
    const insertColumns = present.map((item) => item.column);
    const values = present.map((item) => item.json ? JSON.stringify(item.value) : item.value);
    const placeholders = present.map((item, index) => item.json ? `$${index + 1}::jsonb` : `$${index + 1}`);

    await pgPool.query(
      `
        INSERT INTO quiz_assignments (${insertColumns.join(', ')})
        VALUES (${placeholders.join(', ')})
      `,
      values
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { quizId, studentIds, quizTitle, quizData, isMarked = false, timeLimitMinutes, schedule } = body;

    if (!quizId || !studentIds || studentIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing quizId or studentIds' },
        { status: 400 }
      );
    }

    try {
      await assignInPostgres({ quizId, studentIds, quizTitle, quizData, isMarked, timeLimitMinutes, schedule });
      return NextResponse.json(
        {
          success: true,
          message: `Quiz assigned to ${studentIds.length} student(s)`,
          assignmentCount: studentIds.length,
          source: 'postgres',
        },
        { status: 200 }
      );
    } catch (pgError) {
      console.error('[teacher/assign-quiz][POST] PostgreSQL failed, falling back to Firebase:', pgError);
    }

    // Create assignment records for each student
    const assignmentsRef = collection(db, 'quizAssignments');
    const assignmentPromises = studentIds.map((studentId: string) => {
      return addDoc(assignmentsRef, {
        quizId,
        studentId,
        quizTitle,
        isMarked, // Teacher decides if this quiz should be marked (no retakes allowed)
        timeLimitMinutes: timeLimitMinutes || 30,
        schedule: schedule || null,
        assignedAt: serverTimestamp(),
        status: 'assigned',
        startedAt: null,
        completedAt: null,
        score: null,
      });
    });

    const results = await Promise.all(assignmentPromises);

    return NextResponse.json(
      { 
        success: true,
        message: `Quiz assigned to ${studentIds.length} student(s)`,
        assignmentCount: studentIds.length
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to assign quiz to students' },
      { status: 500 }
    );
  }
}
