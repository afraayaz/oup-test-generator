#!/usr/bin/env node

/**
 * Firebase Admin SDK - Environment Setup Helper
 * 
 * This script helps you properly format your Firebase service account key
 * for use in .env.local
 * 
 * Usage:
 *   node setup-firebase-env.js <path-to-service-account-json>
 * 
 * Example:
 *   node setup-firebase-env.js ~/Downloads/quiz-app-ff0ab-xxxxx.json
 */

const fs = require('fs');
const path = require('path');

// Get the service account file path from command line arguments
const serviceAccountPath = process.argv[2];

if (!serviceAccountPath) {
  console.error('\n❌ Error: Please provide the path to your Firebase service account JSON file\n');
  console.log('Usage:');
  console.log('  node setup-firebase-env.js <path-to-service-account-json>\n');
  console.log('Example:');
  console.log('  node setup-firebase-env.js ./quiz-app-ff0ab-xxxxx.json\n');
  process.exit(1);
}

// Check if file exists
if (!fs.existsSync(serviceAccountPath)) {
  console.error(`\n❌ Error: File not found: ${serviceAccountPath}\n`);
  process.exit(1);
}

try {
  // Read and parse the service account JSON
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

  // Validate required fields
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    console.error('\n❌ Error: Invalid service account JSON. Missing required fields.\n');
    console.error('Required fields:');
    console.error('  - project_id');
    console.error('  - client_email');
    console.error('  - private_key\n');
    process.exit(1);
  }

  // Create the .env.local content
  const envContent = `# Firebase Admin SDK Configuration
# Generated on: ${new Date().toISOString()}
# Service Account: ${serviceAccount.client_email}

FIREBASE_PROJECT_ID=${serviceAccount.project_id}
FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}
FIREBASE_PRIVATE_KEY="${serviceAccount.private_key}"
`;

  // Write to .env.local
  const envPath = path.join(process.cwd(), '.env.local');
  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Success! Environment variables have been set up.\n');
  console.log(`📝 File created/updated: ${envPath}\n`);
  console.log('Configuration:');
  console.log(`  ✓ FIREBASE_PROJECT_ID=${serviceAccount.project_id}`);
  console.log(`  ✓ FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}`);
  console.log(`  ✓ FIREBASE_PRIVATE_KEY=[${serviceAccount.private_key.length} characters]\n`);
  console.log('Next steps:');
  console.log('  1. Verify .env.local file contains the correct values');
  console.log('  2. Restart your development server (npm run dev)');
  console.log('  3. Check console for: ✅ Firebase Admin SDK initialized\n');
  console.log('⚠️  IMPORTANT:');
  console.log('  - Keep .env.local secure and never commit it to git');
  console.log('  - Add .env.local to your .gitignore\n');

} catch (error) {
  console.error('\n❌ Error:', error.message, '\n');
  if (error instanceof SyntaxError) {
    console.error('The file does not appear to be valid JSON.\n');
  }
  process.exit(1);
}
