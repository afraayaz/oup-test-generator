#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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

async function main() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const env = parseEnvFile(envPath);
    
    const pool = new Pool({
      connectionString: env.POSTGRES_URL,
    });
    
    // Get sample data to see actual values
    const result = await pool.query(`
      SELECT 
        id, grade, subject, book, type, chapter, slo, difficulty, answer
      FROM questions
      WHERE grade = 'Grade 8' 
        AND subject = 'Science'
        AND type = 'multiple'
        AND qb_source = 'oup'
      LIMIT 5
    `);
    
    console.log('Sample MCQ questions from database:\n');
    result.rows.forEach((row, idx) => {
      console.log(`Question ${idx + 1}:`);
      console.log(`  ID: ${row.id}`);
      console.log(`  Grade: "${row.grade}"`);
      console.log(`  Subject: "${row.subject}"`);
      console.log(`  Book: "${row.book}"`);
      console.log(`  Type: "${row.type}"`);
      console.log(`  Chapter: "${row.chapter}"`);
      console.log(`  SLO: "${row.slo}"`);
      console.log(`  Difficulty: "${row.difficulty}"`);
      console.log(`  Has Answer: ${row.answer ? 'Yes' : 'No'}`);
      console.log('---');
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
