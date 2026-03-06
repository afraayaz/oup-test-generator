import { Pool } from "pg";
import { readFileSync } from "fs";
import path from "path";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

// Load Supabase CA certificate
const ca = readFileSync(
  path.join(process.cwd(), "supabase-ca.crt") // or "certs/supabase-ca.crt" depending on your structure
).toString();

function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      ca,                       // 🔐 trust the Supabase CA
      rejectUnauthorized: true, // 🔐 verify-full behavior
    },
  });
}

export const pgPool = global.__pgPool || createPool();

if (process.env.NODE_ENV !== "production") {
  global.__pgPool = pgPool;
}
