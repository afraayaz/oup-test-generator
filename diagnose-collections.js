#!/usr/bin/env node

/**
 * Diagnostic script to list all collections in primary Firebase
 * Shows collection names and document counts
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
      // Save previous key-value if exists
      if (currentKey) {
        env[currentKey] = currentValue.trim();
      }
      
      const [key, ...rest] = trimmed.split('=');
      currentKey = key.trim();
      currentValue = rest.join('=').trim();
      
      // Remove quotes if present
      if (currentValue.startsWith('"') && currentValue.endsWith('"')) {
        currentValue = currentValue.slice(1, -1);
      }
    } else if (currentKey) {
      // Continue multi-line value
      currentValue += '\n' + trimmed;
    }
  }
  
  // Save last key-value
  if (currentKey) {
    env[currentKey] = currentValue.trim();
  }
  
  return env;
}

async function main() {
  try {
    console.log('🔍 Parsing environment variables...');
    const envPath = path.join(process.cwd(), '.env.local');
    const env = parseEnvFile(envPath);
    
    const projectId = env.FIREBASE_PROJECT_ID;
    const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = env.FIREBASE_CLIENT_EMAIL;
    
    if (!projectId || !privateKey || !clientEmail) {
      console.error('❌ Missing Firebase credentials in .env.local');
      console.error('   FIREBASE_PROJECT_ID:', !!projectId);
      console.error('   FIREBASE_PRIVATE_KEY:', !!privateKey);
      console.error('   FIREBASE_CLIENT_EMAIL:', !!clientEmail);
      process.exit(1);
    }
    
    console.log('✅ Credentials loaded');
    console.log('   Project:', projectId);
    
    // Initialize Firebase
    console.log('🔧 Initializing Firebase Admin SDK...');
    const serviceAccount = {
      projectId,
      privateKey,
      clientEmail,
    };
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    
    const db = admin.firestore();
    console.log('✅ Firebase initialized\n');
    
    // Get all collections
    console.log('📋 Scanning all collections in Firestore...\n');
    const collectionsRef = await db.listCollections();
    const collections = [];
    
    for (const collectionRef of collectionsRef) {
      collections.push(collectionRef.id);
    }
    
    if (collections.length === 0) {
      console.log('❌ No collections found in Firestore');
      process.exit(0);
    }
    
    // Get document count for each collection
    let totalDocs = 0;
    console.log('📊 Collection Analysis:\n');
    
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).count().get();
      const docCount = snapshot.data().count;
      totalDocs += docCount;
      
      const status = docCount > 0 ? '✅' : '⚠️ ';
      console.log(`${status} ${collectionName.padEnd(25)} | ${docCount} documents`);
      
      // Show sample field structure from first document
      if (docCount > 0) {
        const firstDoc = await db.collection(collectionName).limit(1).get();
        if (firstDoc.docs.length > 0) {
          const data = firstDoc.docs[0].data();
          const fields = Object.keys(data).slice(0, 3).join(', ');
          console.log(`   Fields: ${fields}${Object.keys(data).length > 3 ? '...' : ''}`);
        }
      }
      console.log('');
    }
    
    console.log(`\n🎯 Summary:`);
    console.log(`   Total Collections: ${collections.length}`);
    console.log(`   Total Documents: ${totalDocs}`);
    console.log(`\n📝 Collections to sync: ${collections.filter(c => {
      // Count non-empty collections
      return true; // We'll get the actual count above
    }).length}`);
    
    console.log('\n✨ Update copy-to-secondary.js with these collection names:');
    console.log(`   const collectionsToSync = [${collections.map(c => `'${c}'`).join(', ')}];`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
