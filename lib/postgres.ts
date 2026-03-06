import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

function createPool(): Pool {
  const isLocalHost =
    (process.env.PGHOST || "").toLowerCase() === "localhost" ||
    (process.env.PGHOST || "").toLowerCase() === "127.0.0.1";

  const ssl =
    process.env.NODE_ENV === "production" && !isLocalHost
      ? { rejectUnauthorized: false }
      : undefined;

  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl,
    });
  }

  return new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    ssl,
  });
}

export const pgPool = global.__pgPool || createPool();

if (process.env.NODE_ENV !== "production") {
  global.__pgPool = pgPool;
}
