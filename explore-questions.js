#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

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
      if (currentKey) env[currentKey] = currentValue.trim();
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
  if (currentKey) env[currentKey] = currentValue.trim();
  return env;
}

const envPath = path.join(process.cwd(), '.env.local');
const env = parseEnvFile(envPath);

const serviceAccount = {
  projectId: env.FIREBASE_PROJECT_ID,
  privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  clientEmail: env.FIREBASE_CLIENT_EMAIL,
};

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const db = admin.firestore();

async function explore() {
  console.log('🔍 Exploring questions collection structure...\n');
  
  // Check if questions is a top-level collection
  const topLevel = await db.collection('questions').get();
  console.log(`questions (top-level) has ${topLevel.docs.length} documents`);
  
  if (topLevel.docs.length === 0) {
    console.log('  → No direct documents\n');
    
    // Try to query subcollections directly (this won't work in standard Firestore)
    console.log('Trying to access questions/oup directly:');
    try {
      const oup = await db.collection('questions').collection('oup').get();
      console.log(`  ✅ questions/oup has ${oup.docs.length} documents`);
      
      if (oup.docs.length > 0) {
        const firstId = oup.docs[0].id;
        console.log(`    First ID: ${firstId}`);
        
        // Check subcollections under this document
        const subs = await oup.docs[0].ref.listCollections();
        console.log(`    Subcollections: ${subs.map(s => s.id).join(', ') || 'none'}`);
      }
    } catch (e) {
      console.log(`  ❌ Error:`, e.message);
    }
    
    console.log('\nTrying to access questions/schools directly:');
    try {
      const schools = await db.collection('questions').collection('schools').get();
      console.log(`  ✅ questions/schools has ${schools.docs.length} documents`);
      
      if (schools.docs.length > 0) {
        const firstId = schools.docs[0].id;
        console.log(`    First ID: ${firstId}`);
        
        const subs = await schools.docs[0].ref.listCollections();
        console.log(`    Subcollections: ${subs.map(s => s.id).join(', ') || 'none'}`);
      }
    } catch (e) {
      console.log(`  ❌ Error:`, e.message);
    }
  }
  
  process.exit(0);
}

explore();
