#!/usr/bin/env node

/**
 * Test the teacher questions API to see what data is returned
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

function normalizeGrade(input) {
  if (!input) return "";
  const trimmed = input.trim();
  // Extract the numeric part from "Grade X" or "Class X"
  const match = trimmed.match(/^(?:grade|class)\s+(\d+)/i);
  if (match) {
    return `Grade ${match[1]}`;
  }
  // If it's just a number, add "Grade" prefix
  return `Grade ${trimmed}`;
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
    console.log('🔍 Testing teacher questions API query...\n');
    
    const envPath = path.join(process.cwd(), '.env.local');
    const env = parseEnvFile(envPath);
    
    const pool = new Pool({
      connectionString: env.POSTGRES_URL,
    });
    
    // Simulate the API query for OUP questions
    const qb = 'oup';
    const where = [];
    const values = [];
    
    if (qb === 'oup') {
      where.push(`qb_source = 'oup'`);
    }
    
    // Test with specific book from screenshot: "New Oxford Modern English", English, Class 1
    const testBook = 'New Oxford Modern English';
    const testSubject = 'English';
    const testGrade = 'Class 1';
    
    values.push(testSubject);
    where.push(`subject = $${values.length}`);
    
    values.push(normalizeGrade(testGrade));
    where.push(`grade = $${values.length}`);
    
    values.push(testBook);
    where.push(`book = $${values.length}`);
    
    const sql = `
      SELECT
        id::text AS id,
        question_text AS "questionText",
        type,
        subject,
        grade,
        book,
        chapter,
        slo,
        difficulty,
        answer AS "correctAnswer",
        explanation,
        marks,
        qb_source AS source,
        source_school_id AS "schoolId",
        is_interactive AS "isInteractive",
        interactive_data AS "interactiveData",
        image_url AS "imageUrl",
        created_by AS "createdBy",
        created_at AS "createdAt",
        updated_at AS "updatedAt",
        cognitive_level AS "cognitiveLevel"
      FROM questions
      WHERE ${where.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT 5000
    `;
    
    console.log('📝 Query parameters:');
    console.log(`   QB Source: ${qb}`);
    console.log(`   Subject: ${testSubject}`);
    console.log(`   Grade: ${testGrade} (normalized: ${normalizeGrade(testGrade)})`);
    console.log(`   Book: ${testBook}\n`);
    
    console.log('🔎 SQL Query:');
    console.log(sql);
    console.log('\n📊 Values:', values, '\n');
    
    const { rows } = await pool.query(sql, values);
    
    console.log(`✅ Found ${rows.length} questions\n`);
    
    if (rows.length > 0) {
      // Check SLO field
      const withSlo = rows.filter(r => r.slo && r.slo.trim() !== '');
      const withoutSlo = rows.filter(r => !r.slo || r.slo.trim() === '');
      
      console.log(`   Questions with SLO: ${withSlo.length}`);
      console.log(`   Questions without SLO: ${withoutSlo.length}\n`);
      
      // Show chapters
      const chapters = [...new Set(rows.map(r => r.chapter))].filter(Boolean);
      console.log(`📚 Chapters found: ${chapters.length}`);
      chapters.slice(0, 10).forEach(ch => console.log(`   - ${ch}`));
      if (chapters.length > 10) {
        console.log(`   ... and ${chapters.length - 10} more`);
      }
      
      // Show SLOs
      const slos = [...new Set(rows.map(r => r.slo))].filter(Boolean);
      console.log(`\n🎯 SLOs found: ${slos.length}`);
      slos.slice(0, 15).forEach(slo => console.log(`   - ${slo}`));
      if (slos.length > 15) {
        console.log(`   ... and ${slos.length - 15} more`);
      }
      
      // Show first 3 questions with full details
      console.log('\n📝 Sample questions (first 3):');
      rows.slice(0, 3).forEach((row, idx) => {
        const interactiveData = safeJson(row.interactiveData);
        const question = {
          ...row,
          options: Array.isArray(interactiveData?.options) ? interactiveData.options : [],
          blanks: interactiveData?.blanks || {},
        };
        
        console.log(`\n   Question ${idx + 1}:`);
        console.log(`   ID: ${question.id}`);
        console.log(`   Chapter: ${question.chapter}`);
        console.log(`   SLO: ${question.slo}`);
        console.log(`   Type: ${question.type}`);
        console.log(`   Question: ${question.questionText?.substring(0, 100)}...`);
      });
      
      // Check for any chapter with quotes
      const chaptersWithQuotes = rows.filter(r => 
        r.chapter && (r.chapter.startsWith('"') || r.chapter.startsWith("'"))
      );
      if (chaptersWithQuotes.length > 0) {
        console.log(`\n⚠️  Found ${chaptersWithQuotes.length} questions with quoted chapter names`);
        console.log('   Sample:', chaptersWithQuotes[0].chapter);
      }
    } else {
      console.log('❌ No questions found!');
      console.log('\nLet\'s check what grades are actually in the database:');
      const gradesResult = await pool.query(`
        SELECT DISTINCT grade, subject, book, COUNT(*) as count
        FROM questions
        WHERE qb_source = 'oup' AND subject = $1 AND book = $2
        GROUP BY grade, subject, book
        ORDER BY grade
      `, [testSubject, testBook]);
      
      console.log('\n📊 Available combinations:');
      gradesResult.rows.forEach(row => {
        console.log(`   ${row.grade} - ${row.subject} - ${row.book}: ${row.count} questions`);
      });
    }
    
    await pool.end();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
