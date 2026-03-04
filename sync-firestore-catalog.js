const admin = require('firebase-admin');
const fs = require('fs');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

/**
 * sync-firestore-catalog.js
 *
 * Purpose:
 * - Sync ONLY subjects -> books -> book_chapters from Firestore to PostgreSQL
 * - Do NOT import questions / question banks / quizzes
 * - Do NOT delete existing PostgreSQL data
 * - Insert only missing rows (idempotent)
 *
 * Usage:
 *   node sync-firestore-catalog.js <service-account.json>
 *
 * Required env:
 *   PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
 */

const serviceAccountPath = process.argv[2];
if (!serviceAccountPath) {
  console.error('Usage: node sync-firestore-catalog.js <service-account.json>');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync(
  process.env.MIGRATION_DEFAULT_PASSWORD || 'ChangeMe123!',
  10
);

function toTimestamp(value) {
  if (!value) return null;
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function cleanText(value) {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function toInt(value) {
  if (Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return parseInt(value.trim(), 10);
  return null;
}

function splitName(name) {
  const n = cleanText(name);
  if (!n) return { first: null, last: null };
  const parts = n.split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: null, last: null };
  return {
    first: parts[0],
    last: parts.length > 1 ? parts.slice(1).join(' ') : null
  };
}

async function getTableMeta(client, tableName) {
  const res = await client.query(
    `
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
    `,
    [tableName]
  );
  const byName = new Map();
  for (const row of res.rows) byName.set(row.column_name, row);
  return byName;
}

function coerceForColumn(value, colMeta) {
  if (!colMeta || value === undefined) return undefined;
  if (value === null) return null;

  const udt = colMeta.udt_name;
  const dt = colMeta.data_type;

  if (['int2', 'int4', 'int8', 'smallint', 'integer', 'bigint'].includes(udt)) {
    return toInt(value);
  }
  if (dt === 'boolean' || udt === 'bool') {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return null;
  }
  if (dt.includes('timestamp')) {
    return toTimestamp(value);
  }
  if (udt === '_text' && Array.isArray(value)) {
    return value.map((v) => String(v));
  }
  if (['json', 'jsonb'].includes(udt)) {
    return value;
  }
  return value;
}

async function getOrCreateSubject(client, name, createdAt) {
  const existing = await client.query(
    `SELECT id FROM subjects WHERE lower(name) = lower($1) LIMIT 1`,
    [name]
  );
  if (existing.rowCount) return existing.rows[0].id;

  const inserted = await client.query(
    `
      INSERT INTO subjects (name, created_at)
      VALUES ($1, COALESCE($2, NOW()))
      RETURNING id
    `,
    [name, createdAt]
  );
  return inserted.rows[0].id;
}

async function getOrCreateBook(client, payload) {
  const existing = await client.query(
    `
      SELECT id
      FROM books
      WHERE subject_id = $1
        AND lower(title) = lower($2)
        AND COALESCE(grade, '') = COALESCE($3, '')
      LIMIT 1
    `,
    [payload.subject_id, payload.title, payload.grade]
  );
  if (existing.rowCount) return { id: existing.rows[0].id, inserted: false };

  const inserted = await client.query(
    `
      INSERT INTO books (
        subject_id, title, grade, description, chapters, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, COALESCE($5, 0), COALESCE($6, NOW()), COALESCE($7, NOW()))
      RETURNING id
    `,
    [
      payload.subject_id,
      payload.title,
      payload.grade,
      payload.description,
      payload.chapters,
      payload.created_at,
      payload.updated_at
    ]
  );

  return { id: inserted.rows[0].id, inserted: true };
}

async function chapterExists(client, bookId, chapterNumber, chapterName) {
  if (chapterNumber !== null) {
    const byNo = await client.query(
      `SELECT id FROM book_chapters WHERE book_id = $1 AND chapter_number = $2 LIMIT 1`,
      [bookId, chapterNumber]
    );
    if (byNo.rowCount) return true;
  }

  if (chapterName) {
    const byName = await client.query(
      `SELECT id FROM book_chapters WHERE book_id = $1 AND lower(chapter_name) = lower($2) LIMIT 1`,
      [bookId, chapterName]
    );
    if (byName.rowCount) return true;
  }

  return false;
}

async function nextChapterNumber(client, bookId) {
  const res = await client.query(
    `SELECT COALESCE(MAX(chapter_number), 0) + 1 AS next_no FROM book_chapters WHERE book_id = $1`,
    [bookId]
  );
  return Number(res.rows[0].next_no || 1);
}

async function syncCatalog() {
  const client = new Client();
  await client.connect();

  let insertedSubjects = 0;
  let insertedBooks = 0;
  let insertedChapters = 0;

  try {
    const subjectsSnap = await db.collection('subjects').get();

    for (const subjectDoc of subjectsSnap.docs) {
      const sd = subjectDoc.data();
      const subjectName = cleanText(sd.name);
      if (!subjectName) continue;

      const subjectBefore = await client.query(
        `SELECT id FROM subjects WHERE lower(name)=lower($1) LIMIT 1`,
        [subjectName]
      );

      const subjectId = await getOrCreateSubject(
        client,
        subjectName,
        toTimestamp(sd.createdAt)
      );

      if (!subjectBefore.rowCount) insertedSubjects += 1;

      const booksSnap = await subjectDoc.ref.collection('books').get();

      for (const bookDoc of booksSnap.docs) {
        const bd = bookDoc.data();
        const title = cleanText(bd.title);
        if (!title) continue;

        const book = await getOrCreateBook(client, {
          subject_id: subjectId,
          title,
          grade: cleanText(bd.grade),
          description: cleanText(bd.description),
          chapters: toInt(bd.chapters),
          created_at: toTimestamp(bd.createdAt),
          updated_at: toTimestamp(bd.updatedAt)
        });

        if (book.inserted) insertedBooks += 1;

        const chaptersSnap = await bookDoc.ref.collection('chapters').get();
        for (const chapterDoc of chaptersSnap.docs) {
          const cd = chapterDoc.data();
          const chapterName = cleanText(cd.chapterName || cd.chapter_name);

          let chapterNumber = toInt(cd.chapterNo);
          if (chapterNumber === null) chapterNumber = toInt(cd.chapter_number);

          const exists = await chapterExists(client, book.id, chapterNumber, chapterName);
          if (exists) continue;

          if (chapterNumber === null) {
            chapterNumber = await nextChapterNumber(client, book.id);
          }

          await client.query(
            `
              INSERT INTO book_chapters (
                book_id, chapter_number, chapter_name, description, created_at, updated_at
              )
              VALUES ($1, $2, $3, $4, COALESCE($5, NOW()), NOW())
            `,
            [
              book.id,
              chapterNumber,
              chapterName || `Chapter ${chapterNumber}`,
              cleanText(cd.description),
              toTimestamp(cd.createdAt)
            ]
          );

          insertedChapters += 1;
        }

        await client.query(
          `
            UPDATE books b
            SET chapters = sub.cnt, updated_at = NOW()
            FROM (
              SELECT book_id, COUNT(*)::int AS cnt
              FROM book_chapters
              WHERE book_id = $1
              GROUP BY book_id
            ) sub
            WHERE b.id = sub.book_id
          `,
          [book.id]
        );
      }
    }

    const usersTableMeta = await getTableMeta(client, 'users');
    let insertedUsers = 0;

    if (usersTableMeta.size > 0) {
      const usersSnap = await db.collection('users').get();

      for (const userDoc of usersSnap.docs) {
        const d = userDoc.data();
        const firebaseUid = cleanText(d.uid) || userDoc.id;
        const email = cleanText(d.email);
        const displayName = cleanText(d.displayName || d.name);
        const nameParts = splitName(displayName);

        const checks = [];
        const params = [];
        if (usersTableMeta.has('firebase_uid') && firebaseUid) {
          params.push(firebaseUid);
          checks.push(`firebase_uid = $${params.length}`);
        }
        if (usersTableMeta.has('uid') && firebaseUid) {
          params.push(firebaseUid);
          checks.push(`uid = $${params.length}`);
        }
        if (usersTableMeta.has('email') && email) {
          params.push(email);
          checks.push(`lower(email) = lower($${params.length})`);
        }

        let existing = { rowCount: 0 };
        if (checks.length) {
          existing = await client.query(
            `SELECT id FROM users WHERE ${checks.join(' OR ')} LIMIT 1`,
            params
          );
        }
        if (existing.rowCount) continue;

        const raw = {
          firebase_uid: firebaseUid,
          uid: firebaseUid,
          email,
          role: cleanText(d.role),
          status: cleanText(d.status),
          user_type: cleanText(d.userType),
          display_name: cleanText(d.displayName),
          name: cleanText(d.name),
          first_name: nameParts.first,
          last_name: nameParts.last,
          school_id: cleanText(d.schoolId),
          campus_id: cleanText(d.campusId),
          school_name: cleanText(d.schoolName),
          campus_name: cleanText(d.campusName),
          assigned_grade: cleanText(
            Array.isArray(d.assignedGrades) ? d.assignedGrades[0] : d.assignedGrade
          ),
          assigned_subjects: Array.isArray(d.subjects)
            ? d.subjects
            : (Array.isArray(d.assignedSubjects) ? d.assignedSubjects : null),
          assigned_books: Array.isArray(d.assignedBooks) ? d.assignedBooks : null,
          assigned_classes: Array.isArray(d.assignedClasses) ? d.assignedClasses : null,
          assigned_grades: Array.isArray(d.assignedGrades) ? d.assignedGrades : null,
          created_by: cleanText(d.createdBy),
          password_hash: DEFAULT_PASSWORD_HASH,
          created_at: toTimestamp(d.createdAt) || new Date(),
          updated_at: toTimestamp(d.updatedAt) || new Date()
        };

        const cols = [];
        const vals = [];
        for (const [key, value] of Object.entries(raw)) {
          const col = usersTableMeta.get(key);
          if (!col) continue;
          const coerced = coerceForColumn(value, col);
          if (coerced === undefined) continue;
          cols.push(key);
          vals.push(coerced);
        }

        if (!cols.length) continue;

        const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
        await client.query(
          `INSERT INTO users (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
          vals
        );
        insertedUsers += 1;
      }
    } else {
      console.warn('Skipped users sync: users table not found.');
    }

    console.log('Catalog + users sync complete.');
    console.log(`Inserted subjects: ${insertedSubjects}`);
    console.log(`Inserted books: ${insertedBooks}`);
    console.log(`Inserted chapters: ${insertedChapters}`);
    console.log(`Inserted users: ${insertedUsers}`);
    console.log('Skipped collections: questions, oupQuestionBanks, question-bank-stats, school-stats, quizzes');
  } finally {
    await client.end();
  }
}

syncCatalog().catch((err) => {
  console.error(err);
  process.exit(1);
});
