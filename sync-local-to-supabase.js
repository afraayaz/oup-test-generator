#!/usr/bin/env node
/* eslint-disable no-console */
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.sync"));

const TABLES = [
  { name: "schools", pk: ["id"] },
  { name: "campuses", pk: ["id"] },
  { name: "subjects", pk: ["id"] },
  { name: "grades", pk: ["id"] },
  { name: "books", pk: ["id"] },
  { name: "book_chapters", pk: ["id"] },
  { name: "users", pk: ["id"] },
  { name: "questions", pk: ["id"] },
  { name: "quizzes", pk: ["id"] },
  { name: "quiz_items", pk: ["id"] },
  { name: "user_subject_assignments", pk: ["user_id", "subject_id"] },
  { name: "user_subject_grade_assignments", pk: ["user_id", "subject_id", "grade_id"] },
  { name: "user_book_assignments", pk: ["user_id", "book_id"] },
];
const FORCE_FULL_TABLES = new Set(
  String(process.env.SYNC_FULL_TABLES || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

function getConn(prefix, fallbackUrl) {
  const insecureTls = process.env[`${prefix}_PGSSL_INSECURE`] === "true";
  if (fallbackUrl) return { connectionString: fallbackUrl };
  return {
    host: process.env[`${prefix}_PGHOST`] || "localhost",
    port: Number(process.env[`${prefix}_PGPORT`] || "5432"),
    database: process.env[`${prefix}_PGDATABASE`],
    user: process.env[`${prefix}_PGUSER`],
    password: process.env[`${prefix}_PGPASSWORD`],
    ssl:
      process.env[`${prefix}_PGSSL`] === "true"
        ? { rejectUnauthorized: !insecureTls }
        : undefined,
  };
}

async function ensureSyncState(remote) {
  await remote.query(`
    CREATE TABLE IF NOT EXISTS sync_state (
      table_name text PRIMARY KEY,
      last_synced_at timestamptz NOT NULL DEFAULT '1970-01-01T00:00:00Z',
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function tableColumns(client, tableName) {
  const res = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `,
    [tableName]
  );
  return res.rows.map((r) => r.column_name);
}

async function getLastSync(remote, tableName) {
  const res = await remote.query(`SELECT last_synced_at FROM sync_state WHERE table_name = $1`, [tableName]);
  if (!res.rowCount) return new Date("1970-01-01T00:00:00Z").toISOString();
  return res.rows[0].last_synced_at;
}

async function setLastSync(remote, tableName, ts) {
  await remote.query(
    `
      INSERT INTO sync_state (table_name, last_synced_at, updated_at)
      VALUES ($1, $2, now())
      ON CONFLICT (table_name)
      DO UPDATE SET last_synced_at = EXCLUDED.last_synced_at, updated_at = now()
    `,
    [tableName, ts]
  );
}

function buildUpsertSQL(tableName, columns, pk) {
  const insertCols = columns.map((c) => `"${c}"`).join(", ");
  const valuesCols = columns.map((_, i) => `$${i + 1}`).join(", ");
  const conflictCols = pk.map((c) => `"${c}"`).join(", ");
  const updateCols = columns
    .filter((c) => !pk.includes(c))
    .map((c) => `"${c}" = EXCLUDED."${c}"`)
    .join(", ");
  return `
    INSERT INTO "${tableName}" (${insertCols})
    VALUES (${valuesCols})
    ON CONFLICT (${conflictCols})
    DO UPDATE SET ${updateCols || `"${pk[0]}" = EXCLUDED."${pk[0]}"`}
  `;
}

async function syncTable(local, remote, cfg) {
  const localCols = await tableColumns(local, cfg.name);
  const remoteCols = await tableColumns(remote, cfg.name);
  if (!localCols.length || !remoteCols.length) {
    console.log(`Skipped ${cfg.name}: table not found in one side`);
    return;
  }

  const cols = localCols.filter((c) => remoteCols.includes(c));
  if (!cfg.pk.every((k) => cols.includes(k))) {
    console.log(`Skipped ${cfg.name}: PK columns missing in common columns`);
    return;
  }

  const hasUpdatedAt = cols.includes("updated_at") && !FORCE_FULL_TABLES.has(cfg.name);
  const lastSync = await getLastSync(remote, cfg.name);
  const selectSQL = hasUpdatedAt
    ? `SELECT ${cols.map((c) => `"${c}"`).join(", ")} FROM "${cfg.name}" WHERE updated_at > $1 ORDER BY updated_at ASC`
    : `SELECT ${cols.map((c) => `"${c}"`).join(", ")} FROM "${cfg.name}"`;
  const rowsRes = await local.query(selectSQL, hasUpdatedAt ? [lastSync] : []);
  if (!rowsRes.rowCount) {
    console.log(`No changes: ${cfg.name}`);
    return;
  }

  const upsertSQL = buildUpsertSQL(cfg.name, cols, cfg.pk);
  const remoteClient = remote;
  try {
    await remoteClient.query("BEGIN");
    for (const row of rowsRes.rows) {
      const values = cols.map((c) => row[c]);
      await remoteClient.query(upsertSQL, values);
    }
    const maxTs =
      hasUpdatedAt && rowsRes.rows[rowsRes.rows.length - 1].updated_at
        ? rowsRes.rows[rowsRes.rows.length - 1].updated_at
        : new Date().toISOString();
    await setLastSync(remoteClient, cfg.name, maxTs);
    await remoteClient.query("COMMIT");
    console.log(`Synced ${cfg.name}: ${rowsRes.rowCount}`);
  } catch (e) {
    await remoteClient.query("ROLLBACK");
    throw e;
  }
}

async function main() {
  const localConn = getConn("LOCAL", process.env.LOCAL_DATABASE_URL);
  const remoteConn = getConn("REMOTE", process.env.REMOTE_DATABASE_URL);

  // For connection strings, allow opting out of TLS cert validation when needed.
  if (process.env.LOCAL_DATABASE_URL && process.env.LOCAL_PGSSL_INSECURE === "true") {
    localConn.ssl = { rejectUnauthorized: false };
  }
  if (process.env.REMOTE_DATABASE_URL && process.env.REMOTE_PGSSL_INSECURE === "true") {
    remoteConn.ssl = { rejectUnauthorized: false };
  }

  const local = new Client(localConn);
  const remote = new Client(remoteConn);

  await local.connect();
  await remote.connect();
  try {
    const [localDb, remoteDb] = await Promise.all([
      local.query("select current_database() as db, inet_server_addr()::text as host"),
      remote.query("select current_database() as db, inet_server_addr()::text as host"),
    ]);
    console.log(
      `Local DB: ${localDb.rows[0].db} @ ${localDb.rows[0].host || "local-socket"} | Remote DB: ${remoteDb.rows[0].db} @ ${remoteDb.rows[0].host || "remote"}`
    );

    await ensureSyncState(remote);
    for (const t of TABLES) {
      await syncTable(local, remote, t);
    }
    console.log("Sync complete.");
  } finally {
    await local.end();
    await remote.end();
  }
}

main().catch((err) => {
  console.error("Sync failed:", err.message);
  process.exit(1);
});
