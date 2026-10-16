const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", "..", ".env") });

const { initialize, isPostgres } = require("./db");

async function runMigration() {
  console.log(`Running migration (Target: ${isPostgres ? "PostgreSQL" : "SQLite"})...`);
  try {
    await initialize();
    console.log("Database migration completed successfully!");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

runMigration();
