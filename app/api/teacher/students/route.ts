import { NextRequest, NextResponse } from 'next/server';
import { pgPool } from '@/lib/postgres';
import { db } from '@/firebase/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

function normalizeGradeToken(value: unknown): string {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  const stripped = raw.replace(/^(grade|class)\s*/i, '').trim();
  const numeric = stripped.match(/\d+/);
  if (numeric) return numeric[0];
  return stripped;
}

function normalizeSchoolToken(value: unknown): string {
  return String(value ?? '').trim();
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

async function getSchoolTokens(inputSchoolId: string): Promise<string[]> {
  const base = normalizeSchoolToken(inputSchoolId);
  const tokens = new Set<string>(base ? [base] : []);

  if (!base) return [];

  try {
    const tableCheck = await pgPool.query(
      `
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'schools'
        LIMIT 1
      `
    );

    if (!tableCheck.rowCount) {
      return Array.from(tokens);
    }

    const schoolsRes = await pgPool.query(
      `
        SELECT id::text AS id, COALESCE(firebase_id, '') AS firebase_id
        FROM schools
        WHERE id::text = $1 OR firebase_id = $1
        LIMIT 5
      `,
      [base]
    );

    schoolsRes.rows.forEach((row: any) => {
      const id = normalizeSchoolToken(row.id);
      const firebaseId = normalizeSchoolToken(row.firebase_id);
      if (id) tokens.add(id);
      if (firebaseId) tokens.add(firebaseId);
    });
  } catch {
    // If mapping lookup fails, continue with original token only.
  }

  return Array.from(tokens);
}

async function fetchStudentsFromPostgres(schoolId: string, grade: string) {
  const schoolTokens = await getSchoolTokens(schoolId);
  const normalizedGrade = normalizeGradeToken(grade);

  if (!schoolTokens.length) return [];

  const result = await pgPool.query(
    `
      SELECT
        COALESCE(to_jsonb(u)->>'id', '') AS id,
        COALESCE(to_jsonb(u)->>'uid', to_jsonb(u)->>'firebase_uid', to_jsonb(u)->>'id', '') AS uid,
        COALESCE(
          NULLIF(TRIM(CONCAT(COALESCE(to_jsonb(u)->>'first_name', ''), ' ', COALESCE(to_jsonb(u)->>'last_name', ''))), ''),
          to_jsonb(u)->>'name',
          to_jsonb(u)->>'display_name',
          ''
        ) AS name,
        COALESCE(to_jsonb(u)->>'email', '') AS email,
        COALESCE(to_jsonb(u)->>'roll_number', to_jsonb(u)->>'rollNumber', '') AS "rollNumber",
        COALESCE(to_jsonb(u)->>'assigned_grade', to_jsonb(u)->>'class', to_jsonb(u)->>'grade', '') AS grade,
        COALESCE(to_jsonb(u)->>'school_id', to_jsonb(u)->>'schoolId', u.school_id::text, '') AS school
      FROM users u
      WHERE LOWER(COALESCE(to_jsonb(u)->>'role', '')) = 'student'
        AND COALESCE(to_jsonb(u)->>'school_id', to_jsonb(u)->>'schoolId', u.school_id::text, '') = ANY($1::text[])
      ORDER BY name ASC
      LIMIT 500
    `,
    [schoolTokens]
  );

  return result.rows
    .filter((row: any) => {
      const schoolMatches = schoolTokens.includes(normalizeSchoolToken(row.school));
      const rowGrade = normalizeGradeToken(row.grade);
      const gradeMatches = !normalizedGrade || rowGrade === normalizedGrade;
      return schoolMatches && gradeMatches;
    })
    .map((row: any) => ({
      id: String(row.uid || row.id || ''),
      name: String(row.name || ''),
      email: String(row.email || ''),
      class: String(row.grade || grade),
      rollNumber: String(row.rollNumber || ''),
    }));
}

async function fetchStudentsFromFirebase(schoolId: string, grade: string) {
  const normalizedSchoolId = normalizeSchoolToken(schoolId);
  const normalizedGrade = normalizeGradeToken(grade);
  const studentsRef = collection(db, 'users');

  const snapshots = await Promise.all([
    getDocs(query(studentsRef, where('role', '==', 'student'))),
    getDocs(query(studentsRef, where('role', '==', 'Student'))),
  ]);

  const allDocs = snapshots.flatMap((snap) => snap.docs);
  const dedup = new Map<string, any>();

  for (const docSnap of allDocs) {
    const data = docSnap.data() as any;

    const studentSchool = firstNonEmpty(data.schoolId, data.school_id);
    const studentGrade = firstNonEmpty(data.class, data.grade, data.assignedGrade, data.assigned_grade);

    const schoolMatches = normalizeSchoolToken(studentSchool) === normalizedSchoolId;
    const gradeMatches = normalizeGradeToken(studentGrade) === normalizedGrade;

    if (!schoolMatches || !gradeMatches) continue;

    const studentId = String(data.uid || docSnap.id);
    if (!dedup.has(studentId)) {
      dedup.set(studentId, {
        id: studentId,
        name: String(data.name || data.displayName || ''),
        email: String(data.email || ''),
        class: String(studentGrade || grade),
        rollNumber: String(data.rollNumber || data.roll_number || ''),
      });
    }
  }

  return Array.from(dedup.values());
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const schoolId = searchParams.get('schoolId');
    const grade = searchParams.get('grade');

    if (!schoolId || !grade) {
      return NextResponse.json(
        { error: 'Missing schoolId or grade parameter' },
        { status: 400 }
      );
    }
    try {
      const students = await fetchStudentsFromPostgres(schoolId, grade);
      if (!students.length) {
        const firebaseStudents = await fetchStudentsFromFirebase(schoolId, grade);
        return NextResponse.json({ students: firebaseStudents, source: 'firebase_fallback_empty_pg' }, { status: 200 });
      }
      return NextResponse.json({ students, source: 'postgres' }, { status: 200 });
    } catch (pgError) {
      console.error('[teacher/students][GET] PostgreSQL failed, falling back to Firebase:', pgError);
    }

    const students = await fetchStudentsFromFirebase(schoolId, grade);
    return NextResponse.json({ students, source: 'firebase_fallback' }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}
