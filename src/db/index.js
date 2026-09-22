import fs from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";
import { drizzle as drizzleSqlite } from "drizzle-orm/bun-sqlite";
import { CONFIG } from "../config.js";
import * as schema from "./schema/index.js";

let activeDb = null;
let rawSqliteDb = null;
let pgPool = null;
let mysqlPool = null;

export function getDatabaseConfig() {
  const dbType = CONFIG.DB_TYPE || "sqlite";

  if (dbType === "sqlite") {
    const dbDir = path.join(CONFIG.ROOT_DIR, ".DB_DND");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const isTest = process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test";
    const dbName = isTest ? "test.db" : (CONFIG.SQLITE_NAME || "bot.db");
    const storage = path.join(dbDir, dbName);
    return { dialect: "sqlite", storage };
  }

  // External database (Postgres or MySQL)
  if (CONFIG.DATABASE_URL) {
    const url = CONFIG.DATABASE_URL.replace(/^postgresql:\/\//, "postgres://");
    const dialect = url.startsWith("postgres") ? "postgres" : url.startsWith("mysql") ? "mysql" : dbType;
    return { dialect, url };
  }

  const { DB_USER, DB_PASS, DB_HOST, DB_PORT, DB_NAME } = CONFIG;

  if (dbType === "postgres") {
    const port = DB_PORT || "5432";
    const auth = DB_USER && DB_PASS ? `${DB_USER}:${encodeURIComponent(DB_PASS)}@` : "";
    const url = `postgres://${auth}${DB_HOST}:${port}/${DB_NAME || "postgres"}`;
    return { dialect: "postgres", url };
  }

  if (dbType === "mysql") {
    const port = DB_PORT || "3306";
    const auth = DB_USER && DB_PASS ? `${DB_USER}:${encodeURIComponent(DB_PASS)}@` : "";
    const url = `mysql://${auth}${DB_HOST}:${port}/${DB_NAME || "mysql"}`;
    return { dialect: "mysql", url };
  }

  throw new Error(`Unsupported DB_TYPE: ${dbType}`);
}

export function getDb() {
  if (!activeDb) {
    initDbSync();
  }
  return activeDb;
}

export function getRawSqlite() {
  return rawSqliteDb;
}

// Synchronous fast-init for SQLite (native to Bun)
function initDbSync() {
  const conf = getDatabaseConfig();
  if (conf.dialect === "sqlite") {
    if (!rawSqliteDb) {
      rawSqliteDb = new Database(conf.storage, { create: true });
      rawSqliteDb.exec("PRAGMA journal_mode = WAL;");
      rawSqliteDb.exec("PRAGMA synchronous = NORMAL;");
      rawSqliteDb.exec("PRAGMA foreign_keys = ON;");
      rawSqliteDb.exec("PRAGMA busy_timeout = 5000;");
      rawSqliteDb.exec("PRAGMA cache_size = -64000;");
      rawSqliteDb.exec("PRAGMA temp_store = MEMORY;");
      rawSqliteDb.exec("PRAGMA mmap_size = 268435456;");
      rawSqliteDb.exec("PRAGMA auto_vacuum = INCREMENTAL;");

      ensureSqliteSchema(rawSqliteDb);
    }
    activeDb = drizzleSqlite(rawSqliteDb, { schema });
    return activeDb;
  }
  return null;
}

function ensureSqliteSchema(sqlite) {
  // All Snowflake IDs are strictly created as TEXT to prevent 64-bit IEEE-754 truncation
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS guilds (
      guild_id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS role_restrictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      role_id TEXT NOT NULL,
      feature TEXT NOT NULL,
      restriction_type TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS channel_restrictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      feature TEXT NOT NULL,
      restriction_type TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      role_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS afk (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      user_id TEXT NOT NULL,
      afk_reason TEXT NOT NULL,
      since INTEGER NOT NULL,
      is_global INTEGER DEFAULT 0,
      original_nickname TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS media_only_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      sticky_message_id TEXT,
      whitelist_role_id TEXT,
      image_only INTEGER DEFAULT 0,
      auto_mute INTEGER DEFAULT 0,
      nsfw_bypass INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sticky_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      sticky_content TEXT NOT NULL,
      last_message_id TEXT,
      counter INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS disabled_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      command_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS restricted_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      command_name TEXT NOT NULL,
      restriction_scope TEXT DEFAULT 'both'
    );

    CREATE TABLE IF NOT EXISTS vc_role_config (
      guild_id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS verification_config (
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

    CREATE TABLE IF NOT EXISTS moderation_log_config (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tag_configs (
      guild_id TEXT PRIMARY KEY,
      tag TEXT NOT NULL,
      role_id TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auto_role_reward_config (
      guild_id TEXT PRIMARY KEY,
      role_id TEXT,
      top_vc_role_1 TEXT,
      top_vc_role_2 TEXT,
      top_vc_role_3 TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS channel_permission_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      permission_name TEXT NOT NULL,
      permission_value INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tempban_config (
      guild_id TEXT PRIMARY KEY,
      role_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tempban_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      tempban_reason TEXT,
      active INTEGER DEFAULT 1,
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS warnings (
      warn_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      reason TEXT DEFAULT 'No reason provided',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS punishment_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      moderator_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      reason TEXT DEFAULT 'No reason provided',
      duration_seconds INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS autoresponders (
      responder_id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      trigger_phrase TEXT NOT NULL,
      match_type TEXT DEFAULT 'contains',
      reply_content TEXT,
      is_embed INTEGER DEFAULT 0,
      embed_title TEXT,
      image_url TEXT,
      enabled INTEGER DEFAULT 1,
      ignore_bots INTEGER DEFAULT 1,
      delete_trigger INTEGER DEFAULT 0,
      cooldown INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS autoresponder_reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      responder_id INTEGER NOT NULL,
      emoji TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS member_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      left_at TEXT,
      is_active INTEGER DEFAULT 1,
      total_messages INTEGER DEFAULT 0,
      weekly_messages INTEGER DEFAULT 0,
      total_vc_seconds INTEGER DEFAULT 0,
      weekly_vc_seconds INTEGER DEFAULT 0,
      active_vc_start TEXT,
      last_active_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS daily_activity_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      date TEXT NOT NULL,
      joins_count INTEGER DEFAULT 0,
      leaves_count INTEGER DEFAULT 0,
      total_messages INTEGER DEFAULT 0,
      total_vc_seconds INTEGER DEFAULT 0,
      peak_active_members INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS channel_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      date TEXT NOT NULL,
      message_count INTEGER DEFAULT 0,
      vc_seconds_spent INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS hourly_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      hour_of_day INTEGER NOT NULL,
      message_count INTEGER DEFAULT 0,
      vc_seconds INTEGER DEFAULT 0
    );
  `);
}

export async function initDb(options = {}) {
  const conf = getDatabaseConfig();

  if (conf.dialect === "sqlite") {
    initDbSync();
    console.log(`[DB] Drizzle ORM connected to SQLite (${conf.storage}) | Schema initialized.`);
    return activeDb;
  }

  if (conf.dialect === "postgres") {
    const { Pool } = await import("pg");
    const { drizzle } = await import("drizzle-orm/node-postgres");
    pgPool = new Pool({
      connectionString: conf.url,
      ssl: CONFIG.DB_SSL ? { rejectUnauthorized: false } : undefined,
    });
    activeDb = drizzle(pgPool, { schema });
    console.log("[DB] Drizzle ORM connected to PostgreSQL.");
    return activeDb;
  }

  if (conf.dialect === "mysql") {
    const mysql = await import("mysql2/promise");
    const { drizzle } = await import("drizzle-orm/mysql2");
    mysqlPool = mysql.createPool(conf.url);
    activeDb = drizzle(mysqlPool, { schema });
    console.log("[DB] Drizzle ORM connected to MySQL.");
    return activeDb;
  }

  throw new Error(`Unsupported dialect: ${conf.dialect}`);
}

export async function closeDb() {
  try {
    if (rawSqliteDb) {
      rawSqliteDb.close();
      rawSqliteDb = null;
    }
    if (pgPool) {
      await pgPool.end();
      pgPool = null;
    }
    if (mysqlPool) {
      await mysqlPool.end();
      mysqlPool = null;
    }
    activeDb = null;
    console.log("[DB] Database connection closed cleanly.");
  } catch (error) {
    console.error("[DB ERROR] Error closing database connection:", error);
  }
}

// Compatibility wrapper for legacy Sequelize callers
export const sequelize = {
  authenticate: async () => true,
  sync: async () => true,
  close: closeDb,
  query: async (q) => {
    if (rawSqliteDb) {
      return rawSqliteDb.query(q).all();
    }
    return [];
  },
  getDialect: () => CONFIG.DB_TYPE || "sqlite",
  QueryTypes: { SELECT: "SELECT" },
};
export const db = new Proxy(
  {},
  {
    get(_, prop) {
      return getDb()[prop];
    },
  }
);
