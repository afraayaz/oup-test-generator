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
    
    const result = await pool.query(`
      SELECT id, interactive_data
      FROM questions
      WHERE book = 'New Oxford Modern English' 
        AND grade = 'Grade 1'
        AND type = 'multiple'
      ORDER BY id
      LIMIT 3
    `);
    
    console.log('Raw interactive_data for MCQ questions:\n');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}`);
      console.log(`interactive_data: ${JSON.stringify(row.interactive_data, null, 2)}`);
      console.log('---\n');
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
