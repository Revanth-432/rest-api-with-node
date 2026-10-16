const path = require("path");
const { Pool } = require("pg");

const isPostgres = Boolean(process.env.DATABASE_URL);

let pgPool = null;
let sqliteDb = null;

if (isPostgres) {
  const isLocalPg =
    process.env.DATABASE_URL.includes("localhost") ||
    process.env.DATABASE_URL.includes("127.0.0.1");

  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocalPg ? false : { rejectUnauthorized: false },
  });

  pgPool.on("error", (err) => {
    console.error("Unexpected error on idle PostgreSQL client", err);
  });
} else {
  const Database = require("better-sqlite3");
  const dbPath = path.join(__dirname, "..", "..", "taskmanager.db");
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma("journal_mode = WAL");
  sqliteDb.pragma("foreign_keys = ON");
}

/**
 * Replaces ? placeholders with $1, $2, etc. for PostgreSQL queries.
 */
function toPgQuery(sql) {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

/**
 * Initialize database schema
 */
async function initialize() {
  if (isPostgres) {
    console.log("📦 Connecting to hosted PostgreSQL database...");
    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) NOT NULL UNIQUE,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT DEFAULT '',
          status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
          priority VARCHAR(50) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
          due_date TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("✅ PostgreSQL tables initialized successfully.");
    } finally {
      client.release();
    }
  } else {
    console.log("📦 Using local SQLite database (taskmanager.db)...");
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        username   TEXT    NOT NULL UNIQUE,
        email      TEXT    NOT NULL UNIQUE,
        password   TEXT    NOT NULL,
        created_at TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id     INTEGER NOT NULL,
        title       TEXT    NOT NULL,
        description TEXT    DEFAULT '',
        status      TEXT    NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'in_progress', 'completed')),
        priority    TEXT    NOT NULL DEFAULT 'medium'
                            CHECK (priority IN ('low', 'medium', 'high')),
        due_date    TEXT,
        created_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at  TEXT    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log("✅ SQLite tables initialized successfully.");
  }
}

/**
 * Helper to fetch a single row
 */
async function getOne(sql, params = []) {
  if (isPostgres) {
    const res = await pgPool.query(toPgQuery(sql), params);
    return res.rows[0] || null;
  } else {
    const row = sqliteDb.prepare(sql).get(...params);
    return row || null;
  }
}

/**
 * Helper to fetch all matching rows
 */
async function getAll(sql, params = []) {
  if (isPostgres) {
    const res = await pgPool.query(toPgQuery(sql), params);
    return res.rows;
  } else {
    return sqliteDb.prepare(sql).all(...params);
  }
}

/**
 * Helper to execute INSERT, UPDATE, DELETE
 */
async function execute(sql, params = []) {
  if (isPostgres) {
    const res = await pgPool.query(toPgQuery(sql), params);
    return {
      rowCount: res.rowCount,
      rows: res.rows,
    };
  } else {
    const info = sqliteDb.prepare(sql).run(...params);
    return {
      rowCount: info.changes,
      lastInsertRowid: info.lastInsertRowid,
    };
  }
}

module.exports = {
  isPostgres,
  initialize,
  getOne,
  getAll,
  execute,
  pgPool,
  sqliteDb,
};
