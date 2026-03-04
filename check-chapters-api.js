#!/usr/bin/env node

/**
 * Check what chapters the API returns for Grade 8 Science
 */

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
    console.log('🔍 Checking chapters from chapters API...\n');
    
    const envPath = path.join(process.cwd(), '.env.local');
    const env = parseEnvFile(envPath);
    
    const pool = new Pool({
      connectionString: env.POSTGRES_URL,
    });
    
    // Get chapters from the chapters table (what the API returns)
    const chaptersResult = await pool.query(`
      SELECT DISTINCT c.name
      FROM chapters c
      JOIN books b ON c.book_id = b.id
      JOIN subjects s ON b.subject_id = s.id
      WHERE b.title = 'New Amazing Science'
        AND s.name = 'Science'
        AND b.grade = 'Grade 8'
      ORDER BY c.name
    `);
    
    console.log(`📚 Chapters from API (chapters table): ${chaptersResult.rows.length}`);
    chaptersResult.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. "${row.name}"`);
    });
    
    // Compare with chapters in questions
    const questionChaptersResult = await pool.query(`
      SELECT DISTINCT chapter, COUNT(*) as question_count
      FROM questions
      WHERE book = 'New Amazing Science'
        AND grade = 'Grade 8'
        AND subject = 'Science'
        AND type = 'multiple'
        AND qb_source = 'oup'
      GROUP BY chapter
      ORDER BY chapter
    `);
    
    console.log(`\n📝 Chapters in questions table: ${questionChaptersResult.rows.length}`);
    questionChaptersResult.rows.forEach((row, idx) => {
      console.log(`  ${idx + 1}. "${row.chapter}" (${row.question_count} MCQ questions)`);
    });
    
    // Check for mismatches
    const apiChapters = new Set(chaptersResult.rows.map(r => r.name));
    const questionChapters = new Set(questionChaptersResult.rows.map(r => r.chapter));
    
    const inQuestionsNotAPI = [...questionChapters].filter(ch => !apiChapters.has(ch));
    const inAPINotQuestions = [...apiChapters].filter(ch => !questionChapters.has(ch));
    
    if (inQuestionsNotAPI.length > 0) {
      console.log(`\n⚠️  Chapters in questions but NOT in API chapters table:`);
      inQuestionsNotAPI.forEach(ch => console.log(`  - "${ch}"`));
    }
    
    if (inAPINotQuestions.length > 0) {
      console.log(`\n⚠️  Chapters in API but NOT in questions:`);
      inAPINotQuestions.forEach(ch => console.log(`  - "${ch}"`));
    }
    
    if (inQuestionsNotAPI.length === 0 && inAPINotQuestions.length === 0) {
      console.log(`\n✅ All chapters match!`);
    }
    
    await pool.end();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
