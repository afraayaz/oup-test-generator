const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  host: process.env.PGHOST,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
});
(async () => {
  const res = await pool.query(`
    SELECT id::text AS id, to_jsonb(q) AS data
    FROM questions q
    WHERE id::text IN ('18943','18944')
    ORDER BY id
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await pool.end();
})().catch(e=>{console.error(e);process.exit(1);});
