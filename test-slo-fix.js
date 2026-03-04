#!/usr/bin/env node

/**
 * Test that SLOs will now be retrieved correctly with case-insensitive chapter matching
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
    console.log('🔍 Testing SLO retrieval with case-insensitive chapter matching...\n');
    
    const envPath = path.join(process.cwd(), '.env.local');
    const env = parseEnvFile(envPath);
    
    const pool = new Pool({
      connectionString: env.POSTGRES_URL,
    });
    
    // Get all unique SLOs for Grade 8 Science
    const allSLOsResult = await pool.query(`
      SELECT DISTINCT slo
      FROM questions
      WHERE grade = 'Grade 8' 
        AND subject = 'Science'
        AND book = 'New Amazing Science'
        AND qb_source = 'oup'
        AND slo IS NOT NULL
        AND slo != ''
      ORDER BY slo
    `);
    
    console.log(`📊 Total unique SLOs in database: ${allSLOsResult.rows.length}\n`);
    
    // Simulate selecting chapters from API (proper case)
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
    
    console.log(`📚 Selected chapters (from API, proper case): ${apiChapters.length}`);
    
    // Now filter questions using case-insensitive matching
    const slosSet = new Set();
    
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
    
    let matchedCount = 0;
    let unmatchedCount = 0;
    
    questionsResult.rows.forEach(q => {
      const qChapter = (q.chapter || '').trim();
      const qChapterLower = qChapter.toLowerCase();
      
      // Case-insensitive matching (like the fix)
      const chapterMatch = apiChapters.some(ch => ch.toLowerCase() === qChapterLower);
      
      if (chapterMatch && q.slo) {
        slosSet.add(q.slo);
        matchedCount++;
      } else if (!chapterMatch) {
        unmatchedCount++;
      }
    });
    
    console.log(`\n✅ Matched questions (with case-insensitive): ${matchedCount}`);
    console.log(`❌ Unmatched (chapters not in selection): ${unmatchedCount}`);
    console.log(`\n🎯 Unique SLOs found: ${slosSet.size}`);
    console.log(`📈 Coverage: ${((slosSet.size / allSLOsResult.rows.length) * 100).toFixed(1)}% of all SLOs\n`);
    
    if (slosSet.size < allSLOsResult.rows.length) {
      // Calculate with case-sensitive (old way)
      const oldSlosSet = new Set();
      questionsResult.rows.forEach(q => {
        const qChapter = (q.chapter || '').trim();
        const chapterMatch = apiChapters.includes(qChapter); // Case-sensitive
        
        if (chapterMatch && q.slo) {
          oldSlosSet.add(q.slo);
        }
      });
      
      console.log(`📉 OLD (case-sensitive) would find: ${oldSlosSet.size} SLOs`);
      console.log(`📈 NEW (case-insensitive) finds: ${slosSet.size} SLOs`);
      console.log(`✅ Improvement: +${slosSet.size - oldSlosSet.size} SLOs\n`);
    }
    
    await pool.end();
    console.log('✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
