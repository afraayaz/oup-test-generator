// lib/db.ts (or .js)
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Supabase requires SSL
    });
  }

  return new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl: { rejectUnauthorized: false }, // ensure SSL even with discrete vars
  });
}

export const pgPool = global.__pgPool || createPool();

if (process.env.NODE_ENV !== "production") {
  global.__pgPool = pgPool;
}
