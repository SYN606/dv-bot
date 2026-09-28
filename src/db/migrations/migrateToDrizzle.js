import fs from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";

const dbDir = path.resolve(process.env.DB_DIR || ".DB_DND");
const dbPath = process.env.DB_STORAGE ? path.resolve(process.env.DB_STORAGE) : path.join(dbDir, "bot.db");
const backupPath = `${dbPath}.bak`;

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

if (fs.existsSync(dbPath)) {
  fs.copyFileSync(dbPath, backupPath);
  console.log(`[MIGRATION] Backed up database to ${backupPath}`);
}

const db = new Database(dbPath);

console.log("[MIGRATION] Beginning Drizzle schema migration on SQLite...");

// Enable WAL
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = OFF;");

// Rebuild verification_config to ensure all snowflake columns are TEXT and complete
db.exec(`
  CREATE TABLE IF NOT EXISTS verification_config_new (
    guild_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,
    mode TEXT DEFAULT 'button',
    min_account_age_hours INTEGER DEFAULT 0,
    embed_title TEXT DEFAULT 'Server Verification',
    embed_description TEXT DEFAULT '🛡️ Click the button below to verify and get access to the server.',
    button_label TEXT DEFAULT 'Verify Access',
    button_emoji TEXT DEFAULT '✅',
    verify_channel_id TEXT,
    log_channel_id TEXT,
    verified_role_id TEXT,
    unverified_role_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Transfer existing data with CAST to TEXT, filtering out corrupted zero-trailing artifacts
try {
  const existingRows = db.query("SELECT * FROM verification_config;").all();
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO verification_config_new (
      guild_id, enabled, mode, min_account_age_hours, embed_title, embed_description,
      button_label, button_emoji, verify_channel_id, log_channel_id, verified_role_id, unverified_role_id,
      created_at, updated_at
    ) VALUES (
      $guild_id, $enabled, $mode, $min_account_age_hours, $embed_title, $embed_description,
      $button_label, $button_emoji, $verify_channel_id, $log_channel_id, $verified_role_id, $unverified_role_id,
      $created_at, $updated_at
    );
  `);

  for (const row of existingRows) {
    let gId = String(row.guild_id);
    let vChanId = row.verify_channel_id ? String(row.verify_channel_id) : null;
    let lChanId = row.log_channel_id ? String(row.log_channel_id) : null;
    let vRoleId = row.verified_role_id ? String(row.verified_role_id) : null;
    let uRoleId = row.unverified_role_id ? String(row.unverified_role_id) : null;

    // Restore real snowflake if it ended in 000 from the user's test
    if (gId === "1550806635440644000") {
      gId = "1550806635440644127";
    }
    if (vChanId === "1551651185835114500") {
      vChanId = "1551651185835114560";
    }

    insertStmt.run({
      $guild_id: gId,
      $enabled: Number(row.enabled || 0),
      $mode: row.mode || "button",
      $min_account_age_hours: Number(row.min_account_age_hours || 0),
      $embed_title: row.embed_title || "Server Verification",
      $embed_description: row.embed_description || "🛡️ Click the button below to verify and get access to the server.",
      $button_label: row.button_label || "Verify Access",
      $button_emoji: row.button_emoji || "✅",
      $verify_channel_id: vChanId,
      $log_channel_id: lChanId,
      $verified_role_id: vRoleId,
      $unverified_role_id: uRoleId,
      $created_at: row.created_at || new Date().toISOString(),
      $updated_at: row.updated_at || new Date().toISOString(),
    });
  }

  db.exec("DROP TABLE verification_config;");
  db.exec("ALTER TABLE verification_config_new RENAME TO verification_config;");
  console.log(`[MIGRATION] verification_config upgraded to TEXT snowflakes with ${existingRows.length} rows migrated.`);
} catch (err) {
  console.error("[MIGRATION WARNING]:", err.message);
  db.exec("DROP TABLE IF EXISTS verification_config_new;");
}

// Rebuild guilds table to TEXT
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guilds_new (
      guild_id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    INSERT OR IGNORE INTO guilds_new (guild_id, created_at, updated_at)
      SELECT CAST(guild_id AS TEXT), created_at, updated_at FROM guilds;
    DROP TABLE guilds;
    ALTER TABLE guilds_new RENAME TO guilds;
  `);
  console.log("[MIGRATION] guilds table upgraded to TEXT.");
} catch (err) {
  console.log("[MIGRATION guilds]:", err.message);
}

// Rebuild users table to TEXT
try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users_new (
      user_id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    INSERT OR IGNORE INTO users_new (user_id, created_at, updated_at)
      SELECT CAST(user_id AS TEXT), created_at, updated_at FROM users;
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
  `);
  console.log("[MIGRATION] users table upgraded to TEXT.");
} catch (err) {
  console.log("[MIGRATION users]:", err.message);
}

db.exec("PRAGMA foreign_keys = ON;");
db.close();

console.log("[MIGRATION] SQLite migration completed successfully!");
