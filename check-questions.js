#!/usr/bin/env node

/**
 * Detailed diagnostic for questions collection
 * Shows document count and sample data
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

async function main() {
  try {
    console.log('🔍 Checking questions collection...\n');
    const envPath = path.join(process.cwd(), '.env.local');
    const env = parseEnvFile(envPath);
    
    const projectId = env.FIREBASE_PROJECT_ID;
    const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = env.FIREBASE_CLIENT_EMAIL;
    
    const serviceAccount = { projectId, privateKey, clientEmail };
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    
    const db = admin.firestore();
    
    // Check questions collection
    console.log('📋 Checking "questions" collection:');
    const questionsSnapshot = await db.collection('questions').count().get();
    const questionsCount = questionsSnapshot.data().count;
    console.log(`   Documents: ${questionsCount}\n`);
    
    if (questionsCount > 0) {
      const sample = await db.collection('questions').limit(1).get();
      console.log('   Sample data:');
      console.log('   ', JSON.stringify(sample.docs[0].data(), null, 2));
    }
    
    // Check oupQuestionBanks for subcollections
    console.log('\n📋 Checking "oupQuestionBanks" collection:');
    const oupSnapshot = await db.collection('oupQuestionBanks').count().get();
    const oupCount = oupSnapshot.data().count;
    console.log(`   Documents: ${oupCount}`);
    
    if (oupCount > 0) {
      const oupDocs = await db.collection('oupQuestionBanks').get();
      console.log(`   Bank IDs: ${oupDocs.docs.map(d => d.id).join(', ')}`);
      
      // Check for subcollections
      for (const doc of oupDocs.docs) {
        console.log(`\n   📂 Subcollections in "${doc.id}":`);
        const subCollections = await doc.ref.listCollections();
        for (const subCol of subCollections) {
          const subCount = await subCol.count().get();
          console.log(`      - ${subCol.id}: ${subCount.data().count} documents`);
        }
      }
    }
    
    // List all collections to see the full picture
    console.log('\n\n📊 ALL COLLECTIONS:');
    const allCollections = await db.listCollections();
    for (const col of allCollections) {
      const count = await col.count().get();
      console.log(`   ${col.id}: ${count.data().count}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
