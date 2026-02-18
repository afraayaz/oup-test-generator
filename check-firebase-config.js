#!/usr/bin/env node

/**
 * Check Firebase Configuration
 * Run: node check-firebase-config.js
 */

const fs = require('fs');
const path = require('path');

// Parse .env.local file
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('❌ .env.local file not found at:', filePath);
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  const lines = content.split('\n');
  
  let currentKey = null;
  let currentValue = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    if (!trimmed || trimmed.startsWith('#')) {
      if (currentKey) {
        env[currentKey] = currentValue.trim();
        currentKey = null;
        currentValue = '';
      }
      continue;
    }
    
    if (trimmed.includes('=')) {
      if (currentKey) {
        env[currentKey] = currentValue.trim();
      }
      
      const index = trimmed.indexOf('=');
      currentKey = trimmed.substring(0, index).trim();
      currentValue = trimmed.substring(index + 1).trim();
    } else {
      currentValue += '\n' + line;
    }
  }
  
  if (currentKey) {
    env[currentKey] = currentValue.trim();
  }
  
  return env;
}

console.log('\n🔍 Checking Firebase Configuration...\n');

const envPath = path.join(__dirname, '.env.local');
const env = parseEnvFile(envPath);

console.log('PRIMARY FIREBASE:');
console.log('  Project ID:', env.FIREBASE_PROJECT_ID || '❌ NOT FOUND');
console.log('  Client Email:', env.FIREBASE_CLIENT_EMAIL ? '✅ Found' : '❌ NOT FOUND');
console.log('  Private Key:', env.FIREBASE_PRIVATE_KEY ? '✅ Found (' + env.FIREBASE_PRIVATE_KEY.length + ' chars)' : '❌ NOT FOUND');

console.log('\nSECONDARY FIREBASE:');
console.log('  Project ID:', env.FIREBASE_PROJECT_ID_2 || '❌ NOT FOUND');
console.log('  Client Email:', env.FIREBASE_CLIENT_EMAIL_2 ? '✅ Found' : '❌ NOT FOUND');
console.log('  Private Key:', env.FIREBASE_PRIVATE_KEY_2 ? '✅ Found (' + env.FIREBASE_PRIVATE_KEY_2.length + ' chars)' : '❌ NOT FOUND');

console.log('\n📋 SUMMARY:');

if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
  console.log('✅ Primary Firebase configuration complete');
} else {
  console.log('❌ Primary Firebase configuration INCOMPLETE');
}

if (env.FIREBASE_PROJECT_ID_2 && env.FIREBASE_CLIENT_EMAIL_2 && env.FIREBASE_PRIVATE_KEY_2) {
  console.log('✅ Secondary Firebase configuration complete');
  
  if (env.FIREBASE_PROJECT_ID === env.FIREBASE_PROJECT_ID_2) {
    console.log('⚠️  WARNING: Primary and Secondary have the SAME project ID!');
    console.log('   This defeats the purpose of having a secondary database.');
    console.log('   Both will share the same quota limits.');
  } else {
    console.log('✅ Primary and Secondary have DIFFERENT project IDs (Good!)');
  }
} else {
  console.log('❌ Secondary Firebase configuration INCOMPLETE or MISSING');
  console.log('   Secondary Firebase is optional but needed for quota fallback.');
}

console.log('\n');
