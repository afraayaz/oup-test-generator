#!/usr/bin/env node

/**
 * Debug why only 42 questions show when user selects all chapters/SLOs
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

function normalizeQuestionType(qType) {
  if (!qType) return '';
  
  const normalized = qType.toLowerCase().trim()
    .replace(/\s+/g, '')
    .replace(/[_-]/g, '');
  
  const typeMap = {
    'mcq': 'multiple',
    'mcqs': 'multiple',
    'multiplechoice': 'multiple',
    'multiple': 'multiple',
  };
  
  return typeMap[normalized] || normalized;
}

async function main() {
  try {
    console.log('🔍 Debugging Grade 8 Science MCQ filtering...\n');
    
    const envPath = path.join(process.cwd(), '.env.local');
    const env = parseEnvFile(envPath);
    
    const pool = new Pool({
      connectionString: env.POSTGRES_URL,
    });
    
    // Get all MCQ questions for Grade 8 Science
    const result = await pool.query(`
      SELECT 
        id,
        type,
        chapter,
        slo,
        difficulty,
        question_text,
        answer,
        book
      FROM questions
      WHERE grade = 'Grade 8' 
        AND subject = 'Science'
        AND type = 'multiple'
        AND qb_source = 'oup'
      ORDER BY id
    `);
    
    console.log(`Total MCQ questions in database: ${result.rows.length}\n`);
    
    // Analyze by difficulty
    const byDifficulty = {};
    result.rows.forEach(row => {
      const diff = (row.difficulty || 'Medium').toString();
      byDifficulty[diff] = (byDifficulty[diff] || 0) + 1;
    });
    
    console.log('📊 By Difficulty:');
    Object.entries(byDifficulty).forEach(([diff, count]) => {
      console.log(`  ${diff}: ${count} questions`);
    });
    
    // Check if any questions are missing chapters
    const noChapter = result.rows.filter(r => !r.chapter || r.chapter.trim() === '');
    console.log(`\n⚠️  Questions without chapter: ${noChapter.length}`);
    
    // Check if any questions are missing SLOs
    const noSLO = result.rows.filter(r => !r.slo || r.slo.trim() === '');
    console.log(`⚠️  Questions without SLO: ${noSLO.length}`);
    
    // Check if any questions are missing answers
    const noAnswer = result.rows.filter(r => !r.answer || r.answer.trim() === '');
    console.log(`⚠️  Questions without answer: ${noAnswer.length}`);
    if (noAnswer.length > 0) {
      console.log(`   Sample IDs without answers: ${noAnswer.slice(0, 5).map(r => r.id).join(', ')}`);
    }
    
    // Simulate the frontend filtering logic
    console.log('\n🔬 Simulating frontend filtering (all chapters, all SLOs, all difficulties):');
    
    const selectedGradeNormalized = '8';
    const selectedSubjectLower = 'science';
    const selectedBookLower = 'new amazing science';
    const type = 'multiple';
    
    // Count what SHOULD match if all chapters/SLOs selected
    let matchCount = 0;
    let failedDueToAnswer = 0;
    let failedDueToType = 0;
    
    result.rows.forEach(q => {
      const qGradeNormalized = (q.grade || '').toString().replace(/^(Grade|Class)\s+/i, '').trim().toLowerCase();
      const qSubject = (q.subject || '').toLowerCase();
      const qBook = (q.book || '').toLowerCase();
      const qType = (q.type || '').toLowerCase();
      const normalizedType = normalizeQuestionType(qType);
      
      const gradeMatch = qGradeNormalized === selectedGradeNormalized;
      const subjectMatch = qSubject === selectedSubjectLower;
      const bookMatch = qBook === selectedBookLower;
      const typeMatch = normalizedType === type;
      
      if (gradeMatch && subjectMatch && bookMatch && typeMatch) {
        // This matches the base filters
        // Now check if it would be included in quiz generation
        if (!q.answer || q.answer.trim() === '') {
          failedDueToAnswer++;
        } else {
          matchCount++;
        }
      } else if (gradeMatch && subjectMatch && bookMatch) {
        // Matches grade/subject/book but not type
        if (!typeMatch) {
          failedDueToType++;
        }
      }
    });
    
    console.log(`  ✅ Questions that match: ${matchCount}`);
    console.log(`  ❌ Failed due to missing answer: ${failedDueToAnswer}`);
    console.log(`  ❌ Failed due to type mismatch: ${failedDueToType}`);
    
    console.log('\n💡 Possible reasons for count difference:');
    console.log(`  1. Missing answers: ${failedDueToAnswer} questions would be skipped in quiz generation`);
    console.log(`  2. Difficulty filter: If only Easy/Medium selected, ${byDifficulty['Hard'] || 0} Hard questions excluded`);
    console.log(`  3. Frontend has additional validation (e.g., checking for options in interactive_data)`);
    
    await pool.end();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
