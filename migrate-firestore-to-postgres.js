/**
 * migrate-firestore-to-postgres.js
 *
 * Usage:
 *   node migrate-firestore-to-postgres.js <service-account.json>
 *
 * Required env:
 *   PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
 * Optional env:
 *   MIGRATION_DEFAULT_PASSWORD (default: ChangeMe123!)
 */

const admin = require('firebase-admin');
const fs = require('fs');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const serviceAccountPath = process.argv[2];
if (!serviceAccountPath) {
  console.error('Usage: node migrate-firestore-to-postgres.js <service-account.json>');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const SKIP = Symbol('SKIP');
const DEFAULT_PASSWORD_HASH = bcrypt.hashSync(
  process.env.MIGRATION_DEFAULT_PASSWORD || 'ChangeMe123!',
  10
);

const tableNameCache = { loaded: false, names: new Set() };
const tableMetaCache = new Map();

function toTimestamp(value) {
  if (!value) return null;
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return null;
}

function toCamelCase(s) {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function toSnakeCase(s) {
  return s.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
}

function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isIntegerType(colMeta) {
  return ['int2', 'int4', 'int8', 'smallint', 'integer', 'bigint'].includes(colMeta.udt_name) ||
    ['smallint', 'integer', 'bigint'].includes(colMeta.data_type);
}

function isNumericType(colMeta) {
  return ['numeric', 'float4', 'float8', 'decimal', 'real', 'double precision'].includes(colMeta.udt_name) ||
    ['numeric', 'real', 'double precision'].includes(colMeta.data_type);
}
async function resolveSchoolPkByFirebaseId(client, firebaseSchoolId) {
  if (!firebaseSchoolId) return null;
  const schoolsTable = await resolveTableName(client, 'schools');
  if (!schoolsTable) return null;

  const res = await client.query(
    `SELECT id FROM "${schoolsTable}" WHERE firebase_id = $1 LIMIT 1`,
    [firebaseSchoolId]
  );
  return res.rows[0]?.id ?? null;
}

function isJsonType(colMeta) {
  return ['json', 'jsonb'].includes(colMeta.udt_name) || colMeta.data_type === 'json';
}

async function loadTableNames(client) {
  if (tableNameCache.loaded) return;
  const res = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
  `);
  tableNameCache.names = new Set(res.rows.map(r => r.table_name));
  tableNameCache.loaded = true;
}

function snakeToCamel(name) {
  return name.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(name) {
  return name.replace(/[A-Z]/g, m => `_${m.toLowerCase()}`);
}

async function resolveTableName(client, logicalName) {
  await loadTableNames(client);
  const candidates = [logicalName, snakeToCamel(logicalName), camelToSnake(logicalName)];
  for (const c of candidates) {
    if (tableNameCache.names.has(c)) return c;
  }
  return null;
}

async function getTableMeta(client, table) {
  if (tableMetaCache.has(table)) return tableMetaCache.get(table);

  const res = await client.query(
    `
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `,
    [table]
  );

  const byName = new Map();
  for (const row of res.rows) byName.set(row.column_name, row);

  const meta = { byName, names: new Set(res.rows.map(r => r.column_name)) };
  tableMetaCache.set(table, meta);
  return meta;
}

function mapKeyToExistingColumn(key, colNames) {
  if (colNames.has(key)) return key;
  const camel = toCamelCase(key);
  if (colNames.has(camel)) return camel;
  const snake = toSnakeCase(key);
  if (colNames.has(snake)) return snake;
  return null;
}

function coerceValueForColumn(value, colMeta) {
  if (value === undefined) return SKIP;
  if (!colMeta) return value;

  if (colMeta.udt_name === 'uuid') {
    if (value === null) return SKIP;
    return isUuid(value) ? value : SKIP;
  }

  if (isIntegerType(colMeta)) {
    if (value === null || value === '') return SKIP;
    if (typeof value === 'number' && Number.isInteger(value)) return value;
    if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return parseInt(value, 10);
    return SKIP;
  }

  if (isNumericType(colMeta)) {
    if (value === null || value === '') return SKIP;
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && !Number.isNaN(Number(value))) return Number(value);
    return SKIP;
  }

  if (colMeta.udt_name === 'bool' || colMeta.data_type === 'boolean') {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1') return true;
    if (value === 'false' || value === '0') return false;
    return SKIP;
  }

  if ((colMeta.data_type || '').includes('timestamp')) {
    const ts = toTimestamp(value);
    return ts || SKIP;
  }

  if (isJsonType(colMeta)) return value === null ? null : value;

  return value;
}

async function insertRows(client, logicalTable, rows) {
  if (!rows.length) return 0;

  const resolvedTable = await resolveTableName(client, logicalTable);
  if (!resolvedTable) {
    console.warn(`Skipped ${logicalTable}: table not found.`);
    return 0;
  }

  const meta = await getTableMeta(client, resolvedTable);
  if (!meta.names.size) {
    console.warn(`Skipped ${logicalTable}: no columns found.`);
    return 0;
  }

  const mappedRows = rows.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      const col = mapKeyToExistingColumn(k, meta.names);
      if (!col) continue;
      const coerced = coerceValueForColumn(v, meta.byName.get(col));
      if (coerced !== SKIP) out[col] = coerced;
    }
    return out;
  }).filter(r => Object.keys(r).length > 0);

  if (!mappedRows.length) return 0;

  const cols = Object.keys(mappedRows[0]).filter(c =>
    mappedRows.every(r => Object.prototype.hasOwnProperty.call(r, c))
  );
  if (!cols.length) return 0;

  const values = mappedRows.map((_, i) => cols.map((__, j) => `$${i * cols.length + j + 1}`));
  const flat = mappedRows.flatMap(r => cols.map(c => r[c]));

  const sql = `
    INSERT INTO "${resolvedTable}" (${cols.map(c => `"${c}"`).join(', ')})
    VALUES ${values.map(v => `(${v.join(', ')})`).join(', ')}
    ON CONFLICT DO NOTHING
  `;
  await client.query(sql, flat);
  return mappedRows.length;
}

function normalizeAnswer(d) {
  if (d.correctAnswer !== undefined && d.correctAnswer !== null) return d.correctAnswer;
  if (d.answer && typeof d.answer === 'object') {
    if (d.answer.value !== undefined) return d.answer.value;
    if (d.answer.text !== undefined) return d.answer.text;
  }
  return null;
}

async function resolveBookPk(client, subject, book, grade) {
  const subjectsTable = await resolveTableName(client, 'subjects');
  const booksTable = await resolveTableName(client, 'books');
  if (!subjectsTable || !booksTable) return null;
  if (!subject || !book) return null;

  const byGrade = await client.query(
    `
      SELECT b.id
      FROM "${booksTable}" b
      JOIN "${subjectsTable}" s ON s.id = b.subject_id
      WHERE LOWER(s.name) = LOWER($1)
        AND LOWER(b.title) = LOWER($2)
        AND LOWER(COALESCE(b.grade, '')) = LOWER(COALESCE($3, ''))
      ORDER BY b.id DESC
      LIMIT 1
    `,
    [subject, book, grade || null]
  );
  if (byGrade.rows[0]?.id) return byGrade.rows[0].id;

  const fallback = await client.query(
    `
      SELECT b.id
      FROM "${booksTable}" b
      JOIN "${subjectsTable}" s ON s.id = b.subject_id
      WHERE LOWER(s.name) = LOWER($1)
        AND LOWER(b.title) = LOWER($2)
      ORDER BY b.id DESC
      LIMIT 1
    `,
    [subject, book]
  );
  return fallback.rows[0]?.id ?? null;
}

(async () => {
  const client = new Client();
  await client.connect();

  // Schools
  {
    const snap = await db.collection('schools').get();
    const rows = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        firebase_id: doc.id,
        name: d.name || null,
        address: d.address || null,
        city: d.city || null,
        contact_email: d.contactEmail || null,
        contact_phone: d.contactPhone || null,
        status: d.status || 'Active',
        total_users: d.totalUsers || 0,
        total_students: d.totalStudents || 0,
        total_teachers: d.totalTeachers || 0,
        total_school_admins: d.totalSchoolAdmins || 0,
        total_content_managers: d.totalContentManagers || 0,
        created_at: toTimestamp(d.createdAt) || new Date().toISOString(),
        updated_at: toTimestamp(d.updatedAt) || new Date().toISOString()
      };
    });
    const n = await insertRows(client, 'schools', rows);
    console.log(`Inserted schools: ${n}`);
  }

  // Campuses (resolve FK via schools.firebase_id)
  {
    const schoolsTable = await resolveTableName(client, 'schools');
    const snap = await db.collection('campuses').get();
    let inserted = 0;

    for (const doc of snap.docs) {
      const d = doc.data();
      let resolvedSchoolId = null;

      if (d.schoolId && schoolsTable) {
        const schoolRes = await client.query(
          `SELECT id FROM "${schoolsTable}" WHERE firebase_id = $1 LIMIT 1`,
          [d.schoolId]
        );
        resolvedSchoolId = schoolRes.rows[0]?.id ?? null;
      }

      inserted += await insertRows(client, 'campuses', [{
        id: doc.id,
        school_id: resolvedSchoolId,
        firebase_school_id: d.schoolId || null,
        school_name: d.schoolName || null,
        name: d.name || null,
        address: d.address || null,
        city: d.city || null,
        status: d.status || 'Active',
        total_users: d.totalUsers || 0,
        total_students: d.totalStudents || 0,
        total_teachers: d.totalTeachers || 0,
        total_school_admins: d.totalSchoolAdmins || 0,
        total_content_managers: d.totalContentManagers || 0,
        created_at: toTimestamp(d.createdAt) || new Date().toISOString(),
        updated_at: toTimestamp(d.updatedAt) || new Date().toISOString()
      }]);
    }

    console.log(`Inserted campuses: ${inserted}`);
  }

  // Subjects + Books + Chapters
  {
    const subjectsTable = await resolveTableName(client, 'subjects');
    const booksTable = await resolveTableName(client, 'books');
    const chaptersTable = await resolveTableName(client, 'book_chapters');

    const subjectsSnap = await db.collection('subjects').get();
    let sCount = 0, bCount = 0, cCount = 0;

    for (const subjectDoc of subjectsSnap.docs) {
      const sd = subjectDoc.data();
      const subjectName = sd.name || null;
      if (!subjectName || !subjectsTable || !booksTable || !chaptersTable) continue;

      let subjectRes = await client.query(
        `SELECT id FROM "${subjectsTable}" WHERE name = $1 LIMIT 1`,
        [subjectName]
      );

      if (!subjectRes.rows.length) {
        sCount += await insertRows(client, 'subjects', [{
          name: subjectName,
          created_at: toTimestamp(sd.createdAt) || new Date().toISOString()
        }]);

        subjectRes = await client.query(
          `SELECT id FROM "${subjectsTable}" WHERE name = $1 LIMIT 1`,
          [subjectName]
        );
      }

      if (!subjectRes.rows.length) continue;
      const subjectId = subjectRes.rows[0].id;

      const booksSnap = await subjectDoc.ref.collection('books').get();
      for (const bookDoc of booksSnap.docs) {
        const bd = bookDoc.data();
        const title = bd.title || null;
        if (!title) continue;

        let bookRes = await client.query(
          `SELECT id FROM "${booksTable}"
           WHERE subject_id = $1 AND title = $2
             AND COALESCE(grade, '') = COALESCE($3, '')
           ORDER BY id DESC LIMIT 1`,
          [subjectId, title, bd.grade || null]
        );

        if (!bookRes.rows.length) {
          bCount += await insertRows(client, 'books', [{
            subject_id: subjectId,
            title,
            grade: bd.grade || null,
            description: bd.description || null,
            chapters_count: bd.chapters || null,
            created_at: toTimestamp(bd.createdAt) || new Date().toISOString(),
            updated_at: toTimestamp(bd.updatedAt)
          }]);

          bookRes = await client.query(
            `SELECT id FROM "${booksTable}"
             WHERE subject_id = $1 AND title = $2
               AND COALESCE(grade, '') = COALESCE($3, '')
             ORDER BY id DESC LIMIT 1`,
            [subjectId, title, bd.grade || null]
          );
        }

        if (!bookRes.rows.length) continue;
        const bookId = bookRes.rows[0].id;

        const chaptersSnap = await bookDoc.ref.collection('chapters').get();
        for (const chDoc of chaptersSnap.docs) {
          const cd = chDoc.data();

          const cntRes = await client.query(
            `SELECT COUNT(*)::int AS c FROM "${chaptersTable}" WHERE book_id = $1`,
            [bookId]
          );
          const nextNo = cntRes.rows[0].c + 1;

          cCount += await insertRows(client, 'book_chapters', [{
            book_id: bookId,
            chapter_number: Number.isInteger(cd.chapterNo)
              ? cd.chapterNo
              : (Number.isInteger(cd.chapter_number) ? cd.chapter_number : nextNo),
            chapter_name: cd.chapterName || null,
            topic: cd.topic || null,
            description: cd.description || null,
            created_at: toTimestamp(cd.createdAt) || new Date().toISOString()
          }]);
        }
      }
    }

    console.log(`Inserted subjects/books/chapters: ${sCount}/${bCount}/${cCount}`);
  }

  // Users
  {
    const snap = await db.collection('users').get();
    const rows = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        uid: d.uid || null,
        email: d.email || null,
        password_hash: DEFAULT_PASSWORD_HASH,
        name: d.name || d.displayName || null,
        display_name: d.displayName || null,
        role: d.role || null,
        status: d.status || null,
        school_id: d.schoolId || null,
        school_name: d.schoolName || null,
        campus_id: d.campusId || null,
        campus_name: d.campusName || null,
        user_type: d.userType || null,
        created_by: d.createdBy || null,
        last_active: d.lastActive || null,
        created_at: toTimestamp(d.createdAt),
        updated_at: toTimestamp(d.updatedAt),
        subjects: d.subjects || null,
        assigned_books: d.assignedBooks || null,
        assigned_classes: d.assignedClasses || null,
        assigned_grades: d.assignedGrades || null
      };
    });
    const n = await insertRows(client, 'users', rows);
    console.log(`Inserted users: ${n}`);
  }

  // OUP Question Banks (optional table)
  {
    const snap = await db.collection('oupQuestionBanks').get();
    const rows = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        grade: d.grade || null,
        class: d.class || null,
        subject: d.subject || null,
        book: d.book || null,
        chapter: d.chapter || null,
        slo: d.slo || null,
        difficulty: d.difficulty || null,
        type: d.type || null,
        question_type: d.questionType || null,
        question: d.question || null,
        interactive_data: d.interactiveData || null,
        is_interactive: !!d.isInteractive,
        created_by: d.createdBy || null,
        bank_type: d.bankType || null,
        created_at: toTimestamp(d.createdAt)
      };
    });
    const n = await insertRows(client, 'oup_question_banks', rows);
    console.log(`Inserted oup_question_banks: ${n}`);
  }

  // Questions (uses your exact target columns)
// Questions
{
  const rows = [];

  // OUP questions
  const oup = await db.collection('questions').doc('oup').collection('items').get();
  for (const doc of oup.docs) {
    const d = doc.data();
    const gradeValue = d.grade || d.class || null;
    const bookValue = d.book || null;
    const subjectValue = d.subject || null;
    const resolvedBookId = await resolveBookPk(client, subjectValue, bookValue, gradeValue);
    rows.push({
      id: doc.id,
      question_text: d.questionText || d.question || null,
      type: d.type || d.questionType || null,
      grade: gradeValue,
      subject: subjectValue,
      book: bookValue,
      book_id: resolvedBookId,
      chapter: d.chapter || null,
      slo: d.slo || null,
      difficulty: d.difficulty || null,
      answer: d.correctAnswer ?? d.answer?.value ?? d.answer?.text ?? null,
      explanation: d.explanation || null,
      marks: d.marks ?? 1,
      qb_source: 'oup',
      source_school_id: null,   // Firebase school id (text)
      source_school_pk: null,   // Postgres FK (int)
      is_interactive: !!d.isInteractive,
      interactive_data: d.interactiveData || null,
      image_url: d.imageUrl || null,
      created_by: d.createdBy || null,
      created_at: toTimestamp(d.createdAt),
      updated_at: toTimestamp(d.updatedAt),
      cognitive_level: d.cognitiveLevel ?? d.cognitiveLevels ?? null
    });
  }

  // School questions
  const schoolsSnap = await db.collection('schools').get();
  for (const schoolDoc of schoolsSnap.docs) {
    const sid = schoolDoc.id; // Firebase school id
    const sourceSchoolPk = await resolveSchoolPkByFirebaseId(client, sid);

    const schoolQ = await db.collection('questions').doc('schools').collection(sid).get();
    for (const doc of schoolQ.docs) {
      const d = doc.data();
      const gradeValue = d.grade || d.class || null;
      const bookValue = d.book || null;
      const subjectValue = d.subject || null;
      const resolvedBookId = await resolveBookPk(client, subjectValue, bookValue, gradeValue);
      rows.push({
        id: doc.id,
        question_text: d.questionText || d.question || null,
        type: d.type || d.questionType || null,
        grade: gradeValue,
        subject: subjectValue,
        book: bookValue,
        book_id: resolvedBookId,
        chapter: d.chapter || null,
        slo: d.slo || null,
        difficulty: d.difficulty || null,
        answer: d.correctAnswer ?? d.answer?.value ?? d.answer?.text ?? null,
        explanation: d.explanation || null,
        marks: d.marks ?? 1,
        qb_source: 'school',
        source_school_id: sid,          // exact Firebase schoolId string
        source_school_pk: sourceSchoolPk, // integer FK to schools.id
        is_interactive: !!d.isInteractive,
        interactive_data: d.interactiveData || null,
        image_url: d.imageUrl || null,
        created_by: d.createdBy || null,
        created_at: toTimestamp(d.createdAt),
        updated_at: toTimestamp(d.updatedAt),
        cognitive_level: d.cognitiveLevel ?? d.cognitiveLevels ?? null
      });
    }
  }

  const n = await insertRows(client, 'questions', rows);
  console.log(`Inserted questions: ${n}`);
}

  // Quizzes
  {
    const snap = await db.collection('quizzes').get();
    const rows = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        title: d.title || null,
        quiz_type: d.quizType || null,
        quiz_format: d.quizFormat || null,
        class: d.class || null,
        subject: d.subject || null,
        book: d.book || null,
        chapters: d.chapters || null,
        slos: d.slos || null,
        school_id: d.schoolId || null,
        school_name: d.schoolName || null,
        question_configuration: d.questionConfiguration || null,
        question_ids: d.questionIds || null,
        items: d.items || null,
        assigned_students: d.assignedStudents || null,
        assigned_by: d.assignedBy || null,
        created_by: d.createdBy || null,
        is_marked: !!d.isMarked,
        time_limit_minutes: d.timeLimitMinutes ?? null,
        schedule: d.schedule || null,
        total_questions: d.totalQuestions ?? null,
        total_marks: d.totalMarks ?? null,
        randomization: d.randomization || null,
        rendering: d.rendering || null,
        status: d.status || null,
        version: d.version ?? null,
        notes: d.notes || null,
        created_at: toTimestamp(d.createdAt),
        updated_at: toTimestamp(d.updatedAt)
      };
    });
    const n = await insertRows(client, 'quizzes', rows);
    console.log(`Inserted quizzes: ${n}`);
  }

  // question-bank-stats (optional table)
  {
    const snap = await db.collection('question-bank-stats').get();
    const rows = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        scope: d.schoolId ? 'school' : 'oup',
        school_id: d.schoolId || null,
        last_updated: toTimestamp(d.lastUpdated),
        total_questions: d.totalQuestions ?? null,
        questions_by_subject: d.questionsBySubject || null,
        questions_by_grade: d.questionsByGrade || null,
        questions_by_difficulty: d.questionsByDifficulty || null,
        questions_by_type: d.questionsByType || null
      };
    });
    const n = await insertRows(client, 'question_bank_stats', rows);
    console.log(`Inserted question_bank_stats: ${n}`);
  }

  // school-stats (optional table)
  {
    const snap = await db.collection('school-stats').get();
    const rows = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        school_id: d.schoolId || null,
        school_name: d.schoolName || null,
        total_questions: d.totalQuestions ?? null,
        last_updated: toTimestamp(d.lastUpdated),
        questions_by_subject: d.questionsBySubject || null,
        questions_by_grade: d.questionsByGrade || null,
        questions_by_difficulty: d.questionsByDifficulty || null,
        questions_by_type: d.questionsByType || null
      };
    });
    const n = await insertRows(client, 'school_stats', rows);
    console.log(`Inserted school_stats: ${n}`);
  }

  await client.end();
  console.log('Migration complete.');
  console.log('Note: users migrated with default password hash; force password reset.');
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
