/**
 * Usage:
 *   node migrate-missing-tables.js path/to/service-account.json
 *
 * Requires env:
 *   PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD
 */
const admin = require('firebase-admin');
const fs = require('fs');
const { Client } = require('pg');

const serviceAccountPath = process.argv[2];
if (!serviceAccountPath) {
  console.error('Usage: node migrate-missing-tables.js path/to/service-account.json');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

function toTimestamp(value) {
  if (!value) return null;
  if (value && typeof value.toDate === 'function') return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return null;
}

async function upsert(client, table, row) {
  const cols = Object.keys(row);
  const vals = cols.map(c => row[c]);
  const setCols = cols.filter(c => c !== 'id');

  const sql = `
    INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')})
    VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')})
    ON CONFLICT ("id")
    DO UPDATE SET
      ${setCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')}
  `;

  await client.query(sql, vals);
}


(async () => {
  const client = new Client();
  await client.connect();

  // oupQuestionBanks -> oup_question_banks
  {
    const snap = await db.collection('oupQuestionBanks').get();
    let count = 0;
    for (const doc of snap.docs) {
      const d = doc.data();
      await upsert(client, 'oup_question_banks', {
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
        created_at: toTimestamp(d.createdAt),
      });
      count++;
    }
    console.log(`Upserted oup_question_banks: ${count}`);
  }

  // question-bank-stats -> question_bank_stats
  {
    const snap = await db.collection('question-bank-stats').get();
    let count = 0;
    for (const doc of snap.docs) {
      const d = doc.data();
      await upsert(client, 'question_bank_stats', {
        id: doc.id,
        scope: d.schoolId ? 'school' : 'oup',
        school_id: d.schoolId || null,
        last_updated: toTimestamp(d.lastUpdated),
        total_questions: d.totalQuestions ?? null,
        questions_by_subject: d.questionsBySubject || null,
        questions_by_grade: d.questionsByGrade || null,
        questions_by_difficulty: d.questionsByDifficulty || null,
        questions_by_type: d.questionsByType || null,
      });
      count++;
    }
    console.log(`Upserted question_bank_stats: ${count}`);
  }

  // school-stats -> school_stats
  {
    const snap = await db.collection('school-stats').get();
    let count = 0;
    for (const doc of snap.docs) {
      const d = doc.data();
      await upsert(client, 'school_stats', {
        id: doc.id,
        school_id: d.schoolId || null,
        school_name: d.schoolName || null,
        total_questions: d.totalQuestions ?? null,
        last_updated: toTimestamp(d.lastUpdated),
        questions_by_subject: d.questionsBySubject || null,
        questions_by_grade: d.questionsByGrade || null,
        questions_by_difficulty: d.questionsByDifficulty || null,
        questions_by_type: d.questionsByType || null,
      });
      count++;
    }
    console.log(`Upserted school_stats: ${count}`);
  }

  await client.end();
  console.log('Missing tables migration complete.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
