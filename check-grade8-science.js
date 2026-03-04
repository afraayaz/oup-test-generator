#!/usr/bin/env node

/**
 * Check Grade 8 Science MCQ question counts
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

async function main() {
  try {
    console.log('🔍 Checking Grade 8 Science MCQ questions...\n');
    
    const envPath = path.join(process.cwd(), '.env.local');
    const env = parseEnvFile(envPath);
    
    const pool = new Pool({
      connectionString: env.POSTGRES_URL,
    });
    
    // Check total MCQ questions for Grade 8 Science (all books)
    console.log('📊 Total MCQ questions for Grade 8 Science:');
    const totalResult = await pool.query(`
      SELECT 
        book,
        COUNT(*) as total_mcq
      FROM questions
      WHERE grade = 'Grade 8' 
        AND subject = 'Science'
        AND type = 'multiple'
        AND qb_source = 'oup'
      GROUP BY book
      ORDER BY total_mcq DESC
    `);
    
    if (totalResult.rows.length > 0) {
      for (const row of totalResult.rows) {
        console.log(`  ${row.book}: ${row.total_mcq} MCQ questions`);
      }
    } else {
      console.log('  ⚠️ No MCQ questions found for Grade 8 Science');
    }
    
    // Check by chapter for the main book
    const mainBook = totalResult.rows[0]?.book;
    if (mainBook) {
      console.log(`\n📚 MCQ questions by chapter in "${mainBook}":`);
      const chapterResult = await pool.query(`
        SELECT 
          chapter,
          COUNT(*) as count
        FROM questions
        WHERE grade = 'Grade 8' 
          AND subject = 'Science'
          AND type = 'multiple'
          AND book = $1
          AND qb_source = 'oup'
        GROUP BY chapter
        ORDER BY count DESC
      `, [mainBook]);
      
      let totalInChapters = 0;
      for (const row of chapterResult.rows) {
        console.log(`  ${row.chapter || '(no chapter)'}: ${row.count} questions`);
        totalInChapters += parseInt(row.count);
      }
      console.log(`  \nTotal across chapters: ${totalInChapters}`);
      
      // Check questions without chapters
      const noChapterResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM questions
        WHERE grade = 'Grade 8' 
          AND subject = 'Science'
          AND type = 'multiple'
          AND book = $1
          AND qb_source = 'oup'
          AND (chapter IS NULL OR chapter = '')
      `, [mainBook]);
      
      if (noChapterResult.rows[0].count > 0) {
        console.log(`  ⚠️ Questions without chapter: ${noChapterResult.rows[0].count}`);
      }
    }
    
    // Check difficulty distribution
    if (mainBook) {
      console.log(`\n📊 MCQ questions by difficulty in "${mainBook}":`);
      const difficultyResult = await pool.query(`
        SELECT 
          difficulty,
          COUNT(*) as count
        FROM questions
        WHERE grade = 'Grade 8' 
          AND subject = 'Science'
          AND type = 'multiple'
          AND book = $1
          AND qb_source = 'oup'
        GROUP BY difficulty
        ORDER BY count DESC
      `, [mainBook]);
      
      for (const row of difficultyResult.rows) {
        console.log(`  ${row.difficulty || '(no difficulty)'}: ${row.count} questions`);
      }
    }
    
    // Check if questions have options
    if (mainBook) {
      console.log(`\n📋 MCQ questions with/without options in "${mainBook}":`);
      const optionsResult = await pool.query(`
        SELECT 
          CASE 
            WHEN interactive_data IS NULL OR interactive_data = '' OR interactive_data = '{}' THEN 'no_data'
            WHEN interactive_data::text LIKE '%"options":%' THEN 'has_options'
            ELSE 'has_data_no_options'
          END as options_status,
          COUNT(*) as count
        FROM questions
        WHERE grade = 'Grade 8' 
          AND subject = 'Science'
          AND type = 'multiple'
          AND book = $1
          AND qb_source = 'oup'
        GROUP BY options_status
      `, [mainBook]);
      
      for (const row of optionsResult.rows) {
        console.log(`  ${row.options_status}: ${row.count} questions`);
      }
    }
    
    await pool.end();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
