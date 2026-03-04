import { NextRequest, NextResponse } from 'next/server';
import { pgPool } from '@/lib/postgres';

export const dynamic = 'force-dynamic';

let usersColsCache: Set<string> | null = null;

async function getUsersColumns(): Promise<Set<string>> {
  if (usersColsCache) return usersColsCache;
  const res = await pgPool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
    `
  );
  usersColsCache = new Set<string>(res.rows.map((row: any) => String(row.column_name)));
  return usersColsCache;
}

function normalizeGrade(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^(grade|class)\s+/i.test(raw)) {
    return raw.replace(/^class\s+/i, 'Grade ');
  }
  return /^\d+$/.test(raw) ? `Grade ${raw}` : raw;
}

function toIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function splitName(name: string): { first: string; last: string } {
  const clean = String(name || '').trim().replace(/\s+/g, ' ');
  if (!clean) return { first: '', last: '' };
  const parts = clean.split(' ');
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const uid = String(body?.uid || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const name = String(body?.name || '').trim();
    const schoolId = body?.schoolId;
    const gradeRaw = body?.assignedGrade || body?.grade || body?.class || '';
    const assignedGrade = normalizeGrade(gradeRaw);

    if (!uid || !email) {
      return NextResponse.json({ error: 'Missing uid or email' }, { status: 400 });
    }

    const cols = await getUsersColumns();
    if (!cols.size) {
      return NextResponse.json({ error: 'users table not found' }, { status: 500 });
    }

    const { first, last } = splitName(name);
    const payload: Record<string, any> = {};

    if (cols.has('email')) payload.email = email;
    if (cols.has('role')) payload.role = 'student';
    if (cols.has('firebase_uid')) payload.firebase_uid = uid;
    if (cols.has('uid')) payload.uid = uid;
    if (cols.has('first_name')) payload.first_name = first;
    if (cols.has('last_name')) payload.last_name = last;
    if (cols.has('assigned_grade')) payload.assigned_grade = assignedGrade || null;
    if (cols.has('class')) payload.class = assignedGrade || null;
    if (cols.has('section') && body?.section !== undefined) payload.section = String(body.section || '').trim() || null;
    if (cols.has('roll_number') && body?.rollNumber !== undefined) payload.roll_number = String(body.rollNumber || '').trim() || null;
    if (cols.has('school_id')) payload.school_id = toIntOrNull(schoolId);
    if (cols.has('updated_at')) payload.updated_at = new Date().toISOString();

    const keys = Object.keys(payload);
    if (!keys.length) {
      return NextResponse.json({ linked: false, reason: 'No compatible columns to update' }, { status: 200 });
    }

    const existing = await pgPool.query(
      `
        SELECT id::text AS id
        FROM users
        WHERE COALESCE(to_jsonb(users)->>'firebase_uid', '') = $1
           OR COALESCE(to_jsonb(users)->>'uid', '') = $1
           OR LOWER(COALESCE(to_jsonb(users)->>'email', '')) = LOWER($2)
        LIMIT 1
      `,
      [uid, email]
    );

    if (existing.rowCount) {
      const values = keys.map((k) => payload[k]);
      const setters = keys.map((k, idx) => {
        const col = k === 'class' ? '"class"' : k;
        return `${col} = $${idx + 1}`;
      });
      values.push(existing.rows[0].id);

      await pgPool.query(
        `UPDATE users SET ${setters.join(', ')} WHERE id::text = $${values.length}`,
        values
      );

      return NextResponse.json({ linked: true, userId: existing.rows[0].id, action: 'updated' }, { status: 200 });
    }

    if (cols.has('created_at')) payload.created_at = new Date().toISOString();
    if (cols.has('updated_at') && payload.updated_at === undefined) payload.updated_at = new Date().toISOString();

    const insertKeys = Object.keys(payload);
    const insertValues = insertKeys.map((k) => payload[k]);
    const params = insertKeys.map((_, idx) => `$${idx + 1}`);
    const columnsSql = insertKeys.map((k) => (k === 'class' ? '"class"' : k));

    const inserted = await pgPool.query(
      `
        INSERT INTO users (${columnsSql.join(', ')})
        VALUES (${params.join(', ')})
        RETURNING id::text AS id
      `,
      insertValues
    );

    return NextResponse.json({ linked: true, userId: inserted.rows[0]?.id || '', action: 'inserted' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to link student account to PostgreSQL', details: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
