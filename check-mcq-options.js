#!/usr/bin/env node

/**
 * Check MCQ questions to see if they have options and answers
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

function safeJson(value) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

async function main() {
  try {
    console.log('🔍 Checking MCQ questions for options and answers...\n');
    
    const envPath = path.join(process.cwd(), '.env.local');
    const env = parseEnvFile(envPath);
    
    const pool = new Pool({
      connectionString: env.POSTGRES_URL,
    });
    
    // Check MCQ questions from "New Oxford Modern English" Grade 1
    console.log('📖 Checking MCQ questions from "New Oxford Modern English" Grade 1:\n');
    const mcqResult = await pool.query(`
      SELECT 
        id, 
        type, 
        question_text,
        answer,
        interactive_data,
        is_interactive
      FROM questions
      WHERE book = 'New Oxford Modern English' 
        AND grade = 'Grade 1'
        AND type = 'multiple'
      ORDER BY id
      LIMIT 10
    `);
    
    console.log(`Found ${mcqResult.rows.length} MCQ questions\n`);
    
    for (const row of mcqResult.rows) {
      const interactiveData = safeJson(row.interactive_data);
      const options = Array.isArray(interactiveData?.options) ? interactiveData.options : [];
      
      console.log(`ID: ${row.id}`);
      console.log(`Question: ${row.question_text.substring(0, 80)}...`);
      console.log(`Answer: ${row.answer}`);
      console.log(`Is Interactive: ${row.is_interactive}`);
      console.log(`Interactive Data: ${row.interactive_data ? 'Yes' : 'No'}`);
      console.log(`Options Count: ${options.length}`);
      
      if (options.length > 0) {
        console.log(`Options:`);
        options.forEach((opt, idx) => {
          const optText = typeof opt === 'string' ? opt : opt.text || opt;
          console.log(`  ${idx + 1}. ${optText}`);
        });
      } else {
        console.log(`⚠️  NO OPTIONS FOUND!`);
      }
      
      // Check if answer exists
      if (!row.answer || row.answer.trim() === '') {
        console.log(`⚠️  NO ANSWER FOUND!`);
      }
      
      console.log('---\n');
    }
    
    // Count questions that have no options
    const noOptionsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM questions
      WHERE type = 'multiple'
        AND (
          interactive_data IS NULL 
          OR interactive_data = '' 
          OR interactive_data = '{}' 
          OR interactive_data::text NOT LIKE '%options%'
        )
    `);
    
    console.log(`\n⚠️  Total MCQ questions WITHOUT options: ${noOptionsResult.rows[0].count}`);
    
    // Count questions that have no answer
    const noAnswerResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM questions
      WHERE type = 'multiple'
        AND (answer IS NULL OR answer = '')
    `);
    
    console.log(`⚠️  Total MCQ questions WITHOUT answer: ${noAnswerResult.rows[0].count}`);
    
    await pool.end();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
