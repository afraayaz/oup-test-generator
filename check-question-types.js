#!/usr/bin/env node

/**
 * Check what question types are stored in the database
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Parse .env.local file
function parseEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmed.substring(0, equalIndex).trim();
      let value = trimmed.substring(equalIndex + 1).trim();
      
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      
      env[key] = value;
    }
  }
  
  return env;
}

function normalizeQuestionType(qType) {
  if (!qType) return '';
  
  const normalized = qType.toLowerCase().trim()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[_-]/g, ''); // Remove underscores and hyphens
  
  // Map various formats to standard types
  const typeMap = {
    // Multiple choice variations
    'mcq': 'multiple',
    'mcqs': 'multiple',
    'multiplechoice': 'multiple',
    'multiplechoice': 'multiple',
    'multiple': 'multiple',
    
    // True/False variations
    'truefalse': 'truefalse',
    'true/false': 'truefalse',
    'tf': 'truefalse',
    'trueofalse': 'truefalse',
    
    // Short answer variations
    'short': 'short',
    'shortanswer': 'short',
    'shortans': 'short',
    'sa': 'short',
    
    // Long answer variations
    'long': 'long',
    'longanswer': 'long',
    'longans': 'long',
    'la': 'long',
    'essay': 'long',
    
    // Fill in the blanks variations
    'fillblanks': 'fillblanks',
    'fillintheblanks': 'fillblanks',
    'fitb': 'fillblanks',
    'blanks': 'fillblanks',
    'blanksafill': 'fillblanks',
  };
  
  return typeMap[normalized] || normalized;
}

async function main() {
  try {
    console.log('🔍 Checking question types in database...\n');
    
    const envPath = path.join(process.cwd(), '.env.local');
    const env = parseEnvFile(envPath);
    
    const pool = new Pool({
      connectionString: env.POSTGRES_URL,
    });
    
    // Check all distinct types
    console.log('📊 All distinct question types in database:');
    const allTypesResult = await pool.query(`
      SELECT DISTINCT type, COUNT(*) as count
      FROM questions
      GROUP BY type
      ORDER BY count DESC
    `);
    
    for (const row of allTypesResult.rows) {
      const normalized = normalizeQuestionType(row.type);
      console.log(`  "${row.type}" => normalized: "${normalized}" (${row.count} questions)`);
    }
    
    // Check for "New Oxford Modern English" specifically
    console.log('\n📖 Types in "New Oxford Modern English" Grade 1:');
    const nomeTypesResult = await pool.query(`
      SELECT type, COUNT(*) as count
      FROM questions
      WHERE book = 'New Oxford Modern English' 
        AND grade = 'Grade 1'
      GROUP BY type
      ORDER BY count DESC
    `);
    
    if (nomeTypesResult.rows.length > 0) {
      for (const row of nomeTypesResult.rows) {
        const normalized = normalizeQuestionType(row.type);
        console.log(`  "${row.type}" => normalized: "${normalized}" (${row.count} questions)`);
      }
      
      // Sample a few questions  
      console.log('\n📝 Sample questions from "New Oxford Modern English" Grade 1:');
      const sampleResult = await pool.query(`
        SELECT id, type, question_text
        FROM questions
        WHERE book = 'New Oxford Modern English' 
          AND grade = 'Grade 1'
        ORDER BY id
        LIMIT 5
      `);
      
      for (const row of sampleResult.rows) {
        const normalized = normalizeQuestionType(row.type);
        console.log(`\n  ID: ${row.id}`);
        console.log(`  Type: "${row.type}" => normalized: "${normalized}"`);
        console.log(`  Question: ${row.question_text.substring(0, 80)}...`);
      }
    } else {
      console.log('  ⚠️ No questions found');
    }
    
    await pool.end();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
