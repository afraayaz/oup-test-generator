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
    console.log('🔍 Checking book_chapters table...\n');
    
    const envPath = path.join(process.cwd(), '.env.local');
    const env = parseEnvFile(envPath);
    
    const pool = new Pool({
      connectionString: env.POSTGRES_URL,
    });
    
    // Find the book ID first
    const bookResult = await pool.query(`
      SELECT b.id, b.title, b.grade, s.name as subject
      FROM books b
      JOIN subjects s ON b.subject_id = s.id
      WHERE b.title = 'New Amazing Science'
        AND b.grade = 'Grade 8'
        AND s.name = 'Science'
    `);
    
    if (bookResult.rows.length === 0) {
      console.log('❌ Book not found in books table!');
      await pool.end();
      return;
    }
    
    const book = bookResult.rows[0];
    console.log(`Found book: ID ${book.id}, "${book.title}", ${book.grade}, ${book.subject}\n`);
    
    // Check chapters for this book
    const chaptersResult = await pool.query(`
      SELECT chapter_name, chapter_number
      FROM book_chapters
      WHERE book_id = $1
      ORDER BY chapter_number ASC, chapter_name ASC
    `, [book.id]);
    
    console.log(`Chapters in book_chapters table: ${chaptersResult.rows.length}`);
    if (chaptersResult.rows.length > 0) {
      chaptersResult.rows.forEach((row, idx) => {
        console.log(`  ${idx + 1}. "${row.chapter_name}" (chapter #${row.chapter_number || 'N/A'})`);
      });
    } else {
      console.log('  ⚠️ No chapters found in book_chapters table!');
    }
    
    // Compare with questions
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
    
    await pool.end();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
