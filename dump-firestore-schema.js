/**
 * Usage:
 *   node dump-firestore-schema.js path/to/service-account.json
 */
const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccountPath = process.argv[2];
if (!serviceAccountPath) {
  console.error('Usage: node dump-firestore-schema.js path/to/service-account.json');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const MAX_DOCS_PER_COLLECTION = 5;
const MAX_SUBCOLLECTIONS = 5;
const MAX_DEPTH = 2;

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (value instanceof admin.firestore.Timestamp) return 'timestamp';
  if (value instanceof admin.firestore.GeoPoint) return 'geopoint';
  if (value instanceof admin.firestore.DocumentReference) return 'reference';
  if (typeof value === 'object') return 'object';
  return typeof value;
}

function mergeTypes(target, key, t) {
  if (!target[key]) target[key] = new Set();
  target[key].add(t);
}

async function inspectDoc(docRef, summary) {
  const snap = await docRef.get();
  if (!snap.exists) return;
  const data = snap.data();
  for (const [k, v] of Object.entries(data)) {
    mergeTypes(summary, k, typeOf(v));
  }
}

async function inspectCollection(colRef, out, depth = 0) {
  const colName = colRef.id;
  if (!out[colName]) out[colName] = { fields: {}, subcollections: {} };

  const docs = await colRef.limit(MAX_DOCS_PER_COLLECTION).get();
  for (const doc of docs.docs) {
    await inspectDoc(doc.ref, out[colName].fields);

    if (depth < MAX_DEPTH) {
      const subcols = await doc.ref.listCollections();
      for (const sub of subcols.slice(0, MAX_SUBCOLLECTIONS)) {
        await inspectCollection(sub, out[colName].subcollections, depth + 1);
      }
    }
  }
}

async function inspectKnownQuestionPaths() {
  const out = {};

  // OUP questions: questions/oup/items
  const oup = db.collection('questions').doc('oup').collection('items');
  await inspectCollection(oup, out, 0);

  // School questions: questions/schools/{schoolId}
  const schoolsSnap = await db.collection('schools').get();
  for (const school of schoolsSnap.docs) {
    const sid = school.id;
    const schoolQuestions = db.collection('questions').doc('schools').collection(sid);
    await inspectCollection(schoolQuestions, out, 0);
  }

  return out;
}

function normalize(obj) {
  for (const [k, v] of Object.entries(obj)) {
    if (v && v.fields) {
      for (const [field, types] of Object.entries(v.fields)) {
        v.fields[field] = Array.from(types);
      }
      normalize(v.subcollections);
    }
  }
}

(async () => {
  const collections = await db.listCollections();
  const schema = {};

  for (const col of collections) {
    await inspectCollection(col, schema, 0);
  }

  schema.__questions_subcollections = await inspectKnownQuestionPaths();

  normalize(schema);

  console.log(JSON.stringify(schema, null, 2));
  process.exit(0);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
