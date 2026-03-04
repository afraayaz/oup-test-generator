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
    console.log('📊 Before/After Comparison - SLO Retrieval\n');
    
    const envPath = path.join(process.cwd(), '.env.local');
    const env = parseEnvFile(envPath);
    
    const pool = new Pool({
      connectionString: env.POSTGRES_URL,
    });
    
    // Proper-cased chapters from API
    const apiChapters = [
      "Ecology",
      "Human nervous system",
      "Variations, Heredity and Cell division",
      "Biotechnology",
      "Periodic Table",
      "Chemical Reactions",
      "Acids, Bases and salts",
      "Force and Pressure",
      "Reflection and Refraction of Light",
      "Electricity and Magnetism",
      "Our Universe"
    ];
    
    const questionsResult = await pool.query(`
      SELECT chapter, slo
      FROM questions
      WHERE grade = 'Grade 8' 
        AND subject = 'Science'
        AND book = 'New Amazing Science'
        AND qb_source = 'oup'
        AND slo IS NOT NULL
        AND slo != ''
    `);
    
    // OLD METHOD: Case-sensitive
    const oldSlosSet = new Set();
    let oldMatched = 0;
    questionsResult.rows.forEach(q => {
      const qChapter = (q.chapter || '').trim();
      const chapterMatch = apiChapters.includes(qChapter); // Case-sensitive
      
      if (chapterMatch && q.slo) {
        oldSlosSet.add(q.slo);
        oldMatched++;
      }
    });
    
    // NEW METHOD: Case-insensitive
    const newSlosSet = new Set();
    let newMatched = 0;
    questionsResult.rows.forEach(q => {
      const qChapter = (q.chapter || '').trim();
      const qChapterLower = qChapter.toLowerCase();
      const chapterMatch = apiChapters.some(ch => ch.toLowerCase() === qChapterLower);
      
      if (chapterMatch && q.slo) {
        newSlosSet.add(q.slo);
        newMatched++;
      }
    });
    
    console.log('🔴 BEFORE (Case-Sensitive Matching):');
    console.log(`   Questions matched: ${oldMatched}`);
    console.log(`   Unique SLOs found: ${oldSlosSet.size}`);
    
    console.log('\n🟢 AFTER (Case-Insensitive Matching):');
    console.log(`   Questions matched: ${newMatched}`);
    console.log(`   Unique SLOs found: ${newSlosSet.size}`);
    
    console.log('\n📈 Improvement:');
    console.log(`   +${newMatched - oldMatched} more questions matched`);
    console.log(`   +${newSlosSet.size - oldSlosSet.size} more SLOs found`);
    console.log(`   ${((newSlosSet.size / oldSlosSet.size - 1) * 100).toFixed(1)}% increase\n`);
    
    await pool.end();
    console.log('✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
