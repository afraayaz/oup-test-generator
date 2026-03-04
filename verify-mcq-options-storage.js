const { Pool } = require('pg');

async function checkMCQOptionsStorage() {
  const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  });

  try {
    console.log('Checking MCQ questions and their options storage...\n');

    // Get a few MCQ questions from the database
    const result = await pool.query(`
      SELECT 
        id,
        question_text,
        type,
        subject,
        grade,
        book,
        chapter,
        answer,
        interactive_data
      FROM questions
      WHERE type = 'multiple'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`Found ${result.rows.length} MCQ questions\n`);

    result.rows.forEach((row, index) => {
      console.log(`\n========== MCQ Question ${index + 1} ==========`);
      console.log(`ID: ${row.id}`);
      console.log(`Question: ${row.question_text.substring(0, 80)}...`);
      console.log(`Subject: ${row.subject}, Grade: ${row.grade}`);
      console.log(`Book: ${row.book}, Chapter: ${row.chapter}`);
      console.log(`Correct Answer: ${row.answer}`);
      console.log(`\ninteractive_data column:`, JSON.stringify(row.interactive_data, null, 2));
      
      if (row.interactive_data && row.interactive_data.options) {
        console.log('\n✅ Options found in interactive_data:');
        row.interactive_data.options.forEach((opt, i) => {
          console.log(`  ${String.fromCharCode(65 + i)}) ${opt}`);
        });
      } else {
        console.log('\n❌ No options found in interactive_data!');
      }
    });

    // Check if there are any MCQ questions with empty options
    const emptyOptionsResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM questions
      WHERE type = 'multiple'
        AND (
          interactive_data IS NULL 
          OR interactive_data->>'options' IS NULL
          OR jsonb_array_length(COALESCE(interactive_data->'options', '[]'::jsonb)) = 0
        )
    `);

    console.log(`\n\n========== Summary ==========`);
    console.log(`Total MCQ questions with empty/missing options: ${emptyOptionsResult.rows[0].count}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkMCQOptionsStorage();
