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
    SELECT
      COUNT(*) FILTER (WHERE COALESCE(explanation,'') = '[object Object]')::int AS bad,
      COUNT(*) FILTER (WHERE COALESCE(explanation,'') <> '' AND COALESCE(explanation,'') <> '[object Object]')::int AS good,
      COUNT(*)::int AS total
    FROM questions
  `);
  console.log(JSON.stringify(res.rows[0], null, 2));
  await pool.end();
})().catch(e=>{console.error(e);process.exit(1);});
