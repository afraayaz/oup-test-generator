#!/usr/bin/env node

/**
 * Deep recursive copy of all Firestore data including nested subcollections
 * Discovers all collections and subcollections automatically
 * Run: node copy-to-secondary.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Parse .env.local file
function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  const lines = content.split('\n');
  
  let currentKey = null;
  let currentValue = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    if (trimmed.includes('=')) {
      if (currentKey) {
        env[currentKey] = currentValue.trim();
      }
      
      const [key, ...rest] = trimmed.split('=');
      currentKey = key.trim();
      currentValue = rest.join('=').trim();
      
      if (currentValue.startsWith('"') && currentValue.endsWith('"')) {
        currentValue = currentValue.slice(1, -1);
      }
    } else if (currentKey) {
      currentValue += '\n' + trimmed;
    }
  }
  
  if (currentKey) {
    env[currentKey] = currentValue.trim();
  }
  
  return env;
}

const envPath = path.join(process.cwd(), '.env.local');
const env = parseEnvFile(envPath);

const primaryServiceAccount = {
  projectId: env.FIREBASE_PROJECT_ID,
  privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: env.FIREBASE_CLIENT_EMAIL,
};

const secondaryServiceAccount = {
  projectId: env.FIREBASE_PROJECT_ID_2,
  privateKey: env.FIREBASE_PRIVATE_KEY_2?.replace(/\\n/g, '\n'),
  clientEmail: env.FIREBASE_CLIENT_EMAIL_2,
};

console.log('🔧 Initializing Firebase apps...');
console.log('Primary Project:', primaryServiceAccount.projectId);
console.log('Secondary Project:', secondaryServiceAccount.projectId);

const primaryApp = admin.initializeApp(
  { credential: admin.credential.cert(primaryServiceAccount) },
  'primary'
);

const secondaryApp = admin.initializeApp(
  { credential: admin.credential.cert(secondaryServiceAccount) },
  'secondary'
);

const primaryDb = primaryApp.firestore();
const secondaryDb = secondaryApp.firestore();

// Recursively copy documents and all their subcollections
async function copyDocumentAndSubcollections(primaryDocRef, secondaryDocRef, path = '') {
  try {
    let copiedCount = 0;

    // Copy this document's data
    const docSnapshot = await primaryDocRef.get();
    if (docSnapshot.exists) {
      await secondaryDocRef.set(docSnapshot.data(), { merge: true });
      copiedCount++;
    }

    // Get and copy all subcollections of this document
    const subCollections = await primaryDocRef.listCollections();
    for (const subColRef of subCollections) {
      const subCount = await copyCollectionRecursive(
        subColRef,
        secondaryDocRef.collection(subColRef.id),
        `${path}/${subColRef.id}`
      );
      copiedCount += subCount;
    }

    return copiedCount;
  } catch (error) {
    console.error(`Error copying document at ${path}:`, error.message);
    return 0;
  }
}

// Recursively copy entire collections
async function copyCollectionRecursive(primaryColRef, secondaryColRef, path = '') {
  try {
    let copiedCount = 0;
    const snapshot = await primaryColRef.get();

    // Copy all documents and their subcollections
    const batch = secondaryDb.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const secondaryDocRef = secondaryColRef.doc(doc.id);
      batch.set(secondaryDocRef, doc.data(), { merge: true });
      batchCount++;
      copiedCount++;

      // Commit batch if limit reached
      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }

      // Get and copy subcollections of this document
      const subCollections = await doc.ref.listCollections();
      for (const subColRef of subCollections) {
        const subCount = await copyCollectionRecursive(
          doc.ref.collection(subColRef.id),
          secondaryDocRef.collection(subColRef.id),
          `${path}/${doc.id}/${subColRef.id}`
        );
        copiedCount += subCount;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    return copiedCount;
  } catch (error) {
    console.error(`Error copying collection at ${path}:`, error.message);
    return 0;
  }
}

async function copyAllData() {
  try {
    console.log('🔄 Starting deep recursive data copy...\n');

    const collections = [
      'campuses',
      'oupQuestionBanks',
      'question-bank-stats',
      'questions',
      'school-stats',
      'schools',
      'subjects',
      'users',
    ];

    let totalDocs = 0;

    for (const collectionName of collections) {
      console.log(`📋 Copying collection: ${collectionName}`);

      try {
        const copiedCount = await copyCollectionRecursive(
          primaryDb.collection(collectionName),
          secondaryDb.collection(collectionName),
          collectionName
        );
        totalDocs += copiedCount;
        console.log(`   ✅ Synced ${copiedCount} documents from ${collectionName}\n`);
      } catch (error) {
        console.log(`   ⚠️ Skipped ${collectionName}:`, error.message);
      }
    }

    console.log(`\n🎉 SUCCESS! Total ${totalDocs} documents (with all nested structures) copied to secondary Firebase`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

copyAllData();
