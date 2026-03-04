#!/usr/bin/env node

/**
 * Check SLOs in PostgreSQL questions table
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
    console.log('🔍 Checking SLOs in PostgreSQL questions table...\n');
    
    const envPath = path.join(process.cwd(), '.env.local');
    const env = parseEnvFile(envPath);
    
    const pool = new Pool({
      connectionString: env.POSTGRES_URL,
    });
    
    // Check total questions
    const totalResult = await pool.query('SELECT COUNT(*) FROM questions');
    console.log(`📊 Total questions: ${totalResult.rows[0].count}`);
    
    // Check questions with SLOs
    const withSloResult = await pool.query("SELECT COUNT(*) FROM questions WHERE slo IS NOT NULL AND slo != ''");
    console.log(`✅ Questions with SLOs: ${withSloResult.rows[0].count}`);
    
    // Check questions without SLOs
    const withoutSloResult = await pool.query("SELECT COUNT(*) FROM questions WHERE slo IS NULL OR slo = ''");
    console.log(`❌ Questions without SLOs: ${withoutSloResult.rows[0].count}`);
    
    // Check by QB source
    console.log('\n📊 By QB Source:');
    const bySourceResult = await pool.query(`
      SELECT 
        qb_source,
        COUNT(*) as total,
        COUNT(CASE WHEN slo IS NOT NULL AND slo != '' THEN 1 END) as with_slo,
        COUNT(CASE WHEN slo IS NULL OR slo = '' THEN 1 END) as without_slo
      FROM questions
      GROUP BY qb_source
      ORDER BY qb_source
    `);
    
    for (const row of bySourceResult.rows) {
      console.log(`  ${row.qb_source}:`);
      console.log(`    Total: ${row.total}`);
      console.log(`    With SLO: ${row.with_slo}`);
      console.log(`    Without SLO: ${row.without_slo}`);
    }
    
    // Check by book
    console.log('\n📚 By Book (top 10):');
    const byBookResult = await pool.query(`
      SELECT 
        book,
        subject,
        grade,
        COUNT(*) as total,
        COUNT(CASE WHEN slo IS NOT NULL AND slo != '' THEN 1 END) as with_slo
      FROM questions
      WHERE qb_source = 'oup'
      GROUP BY book, subject, grade
      ORDER BY total DESC
      LIMIT 10
    `);
    
    for (const row of byBookResult.rows) {
      console.log(`  ${row.book} (${row.subject}, ${row.grade}):`);
      console.log(`    Total: ${row.total}, With SLO: ${row.with_slo}`);
    }
    
    // Sample questions with SLOs
    console.log('\n📝 Sample questions with SLOs (from OUP):');
    const sampleResult = await pool.query(`
      SELECT id, book, chapter, slo, question_text
      FROM questions
      WHERE qb_source = 'oup' AND slo IS NOT NULL AND slo != ''
      ORDER BY id
      LIMIT 5
    `);
    
    for (const row of sampleResult.rows) {
      console.log(`\n  ID: ${row.id}`);
      console.log(`  Book: ${row.book}`);
      console.log(`  Chapter: ${row.chapter}`);
      console.log(`  SLO: ${row.slo}`);
      console.log(`  Question: ${row.question_text.substring(0, 100)}...`);
    }
    
    // Check specific book mentioned in the issue - "New Oxford Modern English"
    console.log('\n\n📖 Checking "New Oxford Modern English" specifically:');
    const nomeResult = await pool.query(`
      SELECT 
        book,
        subject,
        grade,
        COUNT(*) as total,
        COUNT(CASE WHEN slo IS NOT NULL AND slo != '' THEN 1 END) as with_slo,
        COUNT(CASE WHEN slo IS NULL OR slo = '' THEN 1 END) as without_slo
      FROM questions
      WHERE LOWER(book) LIKE LOWER('%New Oxford Modern English%')
      GROUP BY book, subject, grade
      ORDER BY grade
    `);
    
    if (nomeResult.rows.length > 0) {
      for (const row of nomeResult.rows) {
        console.log(`  ${row.book} - ${row.grade}:`);
        console.log(`    Total: ${row.total}`);
        console.log(`    With SLO: ${row.with_slo}`);
        console.log(`    Without SLO: ${row.without_slo}`);
      }
    } else {
      console.log('  ⚠️ No questions found for New Oxford Modern English');
    }
    
    await pool.end();
    console.log('\n✅ Done!');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
