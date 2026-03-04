const { Pool } = require('pg');

async function checkEnglishGrade1Books() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL || 'postgresql://neondb_owner:npg_RrL5hxmTTD0D@ep-round-mode-a5bk4p9d.us-east-2.aws.neon.tech/test_generator_db?sslmode=require'
  });

  try {
    console.log('Checking English books for different grade formats...\n');

    // Check all English books
    const allEnglishResult = await pool.query(`
      SELECT id, title, grade, subject
      FROM books
      WHERE LOWER(subject) = 'english'
      ORDER BY grade, title
    `);

    console.log(`Total English books in database: ${allEnglishResult.rows.length}\n`);
    
    if (allEnglishResult.rows.length > 0) {
      console.log('All English books:');
      allEnglishResult.rows.forEach(book => {
        console.log(`  ID: ${book.id}, Grade: "${book.grade}", Title: ${book.title}, Subject: ${book.subject}`);
      });
      console.log('');
    }

    // Check specifically for Grade 1
    const grade1Result = await pool.query(`
      SELECT id, title, grade, subject
      FROM books
      WHERE LOWER(subject) = 'english'
        AND (grade = 'Grade 1' OR grade = 'Class 1' OR grade = '1')
      ORDER BY title
    `);

    console.log(`English books for Grade/Class 1: ${grade1Result.rows.length}`);
    if (grade1Result.rows.length > 0) {
      grade1Result.rows.forEach(book => {
        console.log(`  Grade: "${book.grade}", Title: ${book.title}`);
      });
    }

    // Check subjects table to make sure English exists
    const subjectsResult = await pool.query(`
      SELECT id, name
      FROM subjects
      WHERE LOWER(name) = 'english'
    `);

    console.log(`\nEnglish subject in subjects table: ${subjectsResult.rows.length > 0 ? 'YES' : 'NO'}`);
    if (subjectsResult.rows.length > 0) {
      console.log(`  Subject ID: ${subjectsResult.rows[0].id}, Name: ${subjectsResult.rows[0].name}`);
    }

    // Check unique grade formats in books table
    const gradeFormatsResult = await pool.query(`
      SELECT DISTINCT grade
      FROM books
      ORDER BY grade
    `);

    console.log(`\nAll unique grade formats in books table:`);
    gradeFormatsResult.rows.forEach(row => {
      console.log(`  "${row.grade}"`);
    });

  } catch (error) {
    console.error('Error checking books:', error);
  } finally {
    await pool.end();
  }
}

checkEnglishGrade1Books();
