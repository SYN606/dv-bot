import fs from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";
import { drizzle as drizzleSqlite } from "drizzle-orm/bun-sqlite";
import { CONFIG } from "../config.js";
import * as schema from "./schema/index.js";
import { logger } from "../utils/logger.js";

let activeDb = null;
let rawSqliteDb = null;
let pgPool = null;
let mysqlPool = null;

export function getDatabaseConfig() {
  const dbType = CONFIG.DB_TYPE || "sqlite";

  if (dbType === "sqlite") {
    const isTest = process.env.NODE_ENV === "test" || process.env.BUN_ENV === "test";
    let dbDir = isTest
      ? path.join(CONFIG.ROOT_DIR, ".DB_DND")
      : (CONFIG.DB_DIR || path.join(CONFIG.ROOT_DIR, ".DB_DND"));

    try {
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    } catch (err) {
      if (err.code === "EACCES" || err.code === "EPERM") {
        logger.warn(`[DB] Access denied to '${dbDir}'. Falling back to local '.DB_DND' directory.`);
        dbDir = path.join(CONFIG.ROOT_DIR, ".DB_DND");
        if (!fs.existsSync(dbDir)) {
          fs.mkdirSync(dbDir, { recursive: true });
        }
      } else {
        throw err;
      }
    }
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
      rawSqliteDb.exec("PRAGMA threads = 4;");
      rawSqliteDb.exec("PRAGMA wal_autocheckpoint = 1000;");

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
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, role_id, feature, restriction_type)
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
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      afk_reason TEXT NOT NULL,
      since INTEGER NOT NULL,
      original_nickname TEXT,
      mentions TEXT,
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

    CREATE TABLE IF NOT EXISTS auto_role_config (
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
      embed_description TEXT DEFAULT 'ðŸ›¡ï¸ Click the button below to verify and get access to the server.',
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
      events_config TEXT DEFAULT '{}',
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
      enabled INTEGER DEFAULT 0,
      announcement_channel_id TEXT,
      top_chat_role_1 TEXT,
      top_chat_role_2 TEXT,
      top_chat_role_3 TEXT,
      top_vc_role_1 TEXT,
      top_vc_role_2 TEXT,
      top_vc_role_3 TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS supporter_config (
      guild_id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      vanity_text TEXT,
      vanity_role_id TEXT,
      vanity_channel_id TEXT,
      vanity_message TEXT,
      clan_role_id TEXT,
      clan_channel_id TEXT,
      clan_message TEXT
    );

    CREATE TABLE IF NOT EXISTS system_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS channel_permission_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      permission_name TEXT NOT NULL,
      permission_value INTEGER,
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    
    CREATE TABLE IF NOT EXISTS warning_punishment_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      warn_count INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      duration INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, warn_count)
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
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS daily_activity_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      date TEXT NOT NULL,
      joins_count INTEGER DEFAULT 0,
      leaves_count INTEGER DEFAULT 0,
      total_messages INTEGER DEFAULT 0,
      total_vc_seconds INTEGER DEFAULT 0,
      peak_active_members INTEGER DEFAULT 0,
      UNIQUE(guild_id, date)
    );

    CREATE TABLE IF NOT EXISTS channel_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      date TEXT NOT NULL,
      message_count INTEGER DEFAULT 0,
      vc_seconds_spent INTEGER DEFAULT 0,
      UNIQUE(guild_id, channel_id, date)
    );

    CREATE TABLE IF NOT EXISTS hourly_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      hour_of_day INTEGER NOT NULL,
      message_count INTEGER DEFAULT 0,
      vc_seconds INTEGER DEFAULT 0,
      UNIQUE(guild_id, day_of_week, hour_of_day)
    );

    CREATE TABLE IF NOT EXISTS message_drafts (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT 'Untitled Message',
      mode TEXT NOT NULL DEFAULT 'normal',
      content TEXT DEFAULT '',
      embeds TEXT DEFAULT '[]',
      attachments TEXT DEFAULT '[]',
      channel_id TEXT,
      reply_config TEXT DEFAULT '{}',
      mention_config TEXT DEFAULT '{}',
      created_by TEXT,
      revision INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS message_templates (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'General',
      mode TEXT NOT NULL DEFAULT 'normal',
      content TEXT DEFAULT '',
      embeds TEXT DEFAULT '[]',
      attachments TEXT DEFAULT '[]',
      mention_config TEXT DEFAULT '{}',
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS message_history (
      id TEXT PRIMARY KEY,
      guild_id TEXT NOT NULL,
      message_id TEXT,
      channel_id TEXT NOT NULL,
      user_id TEXT,
      source_type TEXT DEFAULT 'direct',
      source_id TEXT,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'delivered',
      error_message TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS welcome_config (
      guild_id TEXT PRIMARY KEY,
      welcome_enabled INTEGER DEFAULT 0,
      welcome_channel_id TEXT,
      welcome_message TEXT DEFAULT 'Hey {user}, welcome to **{server}**! Glad to have you here. You are member #{memberCount}! 🎉',
      welcome_is_embed INTEGER DEFAULT 1,
      welcome_embed_title TEXT DEFAULT 'Welcome to {server}!',
      welcome_embed_title_url TEXT,
      welcome_embed_author TEXT,
      welcome_embed_author_icon TEXT,
      welcome_embed_author_url TEXT,
      welcome_embed_color TEXT DEFAULT '#6366F1',
      welcome_embed_footer TEXT DEFAULT 'Member #{memberCount}',
      welcome_embed_footer_icon TEXT,
      welcome_embed_fields TEXT DEFAULT '[]',
      welcome_show_thumbnail INTEGER DEFAULT 1,
      welcome_thumbnail_type TEXT DEFAULT 'user_avatar',
      welcome_thumbnail_custom TEXT,
      welcome_image_url TEXT,
      welcome_ping_user INTEGER DEFAULT 1,
      welcome_delete_seconds INTEGER DEFAULT 0,
      welcome_show_timestamp INTEGER DEFAULT 1,
      dm_enabled INTEGER DEFAULT 0,
      dm_message TEXT DEFAULT 'Welcome to **{server}**, {username}! Please check out our rules and enjoy your stay.',
      dm_is_embed INTEGER DEFAULT 0,
      dm_embed_title TEXT DEFAULT 'Welcome to {server}!',
      dm_embed_color TEXT DEFAULT '#10B981',
      dm_embed_footer TEXT DEFAULT '{server}',
      dm_show_thumbnail INTEGER DEFAULT 1,
      leave_enabled INTEGER DEFAULT 0,
      leave_channel_id TEXT,
      leave_message TEXT DEFAULT '{username} has left the server. We are down to {memberCount} members.',
      leave_is_embed INTEGER DEFAULT 0,
      leave_embed_title TEXT DEFAULT 'Goodbye!',
      leave_embed_color TEXT DEFAULT '#F43F5E',
      leave_embed_footer TEXT DEFAULT 'Remaining: {memberCount} members',
      leave_show_thumbnail INTEGER DEFAULT 1,
      leave_image_url TEXT,
      autorole_enabled INTEGER DEFAULT 0,
      join_role_ids TEXT DEFAULT '[]',
      bot_role_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS confession_config (
      guild_id TEXT PRIMARY KEY,
      enabled INTEGER DEFAULT 0,
      channel_id TEXT,
      review_channel_id TEXT,
      reviewer_role_ids TEXT DEFAULT '[]',
      show_author_in_review INTEGER DEFAULT 1,
      allow_anonymous INTEGER DEFAULT 1,
      require_approval INTEGER DEFAULT 1,
      auto_thread INTEGER DEFAULT 1,
      cooldown_seconds INTEGER DEFAULT 60,
      banned_words TEXT DEFAULT '',
      regex_filter TEXT DEFAULT '',
      regex_filter_enabled INTEGER DEFAULT 0,
      current_number INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS confessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      confession_number INTEGER NOT NULL,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_tag TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT,
      status TEXT DEFAULT 'pending',
      is_anonymous INTEGER DEFAULT 1,
      channel_id TEXT,
      message_id TEXT,
      review_message_id TEXT,
      reviewed_by TEXT,
      reviewed_by_tag TEXT,
      rejection_reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    sqlite.exec("CREATE INDEX IF NOT EXISTS idx_confessions_guild_number ON confessions (guild_id, confession_number);");
  } catch (_) {}
  try {
    sqlite.exec("CREATE INDEX IF NOT EXISTS idx_confessions_guild_status ON confessions (guild_id, status);");
  } catch (_) {}

  try {
    sqlite.exec("CREATE INDEX IF NOT EXISTS idx_message_drafts_guild ON message_drafts (guild_id);");
  } catch (_) {}
  try {
    sqlite.exec("CREATE INDEX IF NOT EXISTS idx_message_templates_guild ON message_templates (guild_id);");
  } catch (_) {}
  try {
    sqlite.exec("CREATE INDEX IF NOT EXISTS idx_message_history_guild ON message_history (guild_id, created_at);");
  } catch (_) {}
  try {
    sqlite.exec("CREATE INDEX IF NOT EXISTS idx_message_history_msg ON message_history (guild_id, message_id);");
  } catch (_) {}
  try {
    sqlite.exec("CREATE INDEX IF NOT EXISTS idx_warnings_guild_user ON warnings (guild_id, user_id);");
  } catch (_) {}
  try {
    sqlite.exec("CREATE INDEX IF NOT EXISTS idx_punishment_records_guild_user ON punishment_records (guild_id, user_id);");
  } catch (_) {}
  try {
    sqlite.exec("CREATE INDEX IF NOT EXISTS idx_tempban_records_active ON tempban_records (guild_id, user_id, active);");
  } catch (_) {}
  try {
    sqlite.exec("CREATE INDEX IF NOT EXISTS idx_channel_restrictions_lookup ON channel_restrictions (guild_id, channel_id);");
  } catch (_) {}
  try {
    sqlite.exec("CREATE INDEX IF NOT EXISTS idx_admin_roles_lookup ON admin_roles (guild_id);");
  } catch (_) {}
  try {
    sqlite.exec("CREATE INDEX IF NOT EXISTS idx_admin_users_lookup ON admin_users (guild_id);");
  } catch (_) {}

  try {
    sqlite.exec("ALTER TABLE afk ADD COLUMN mentions TEXT;");
  } catch (_) {}

  try {
    sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_afk_guild_user_unique ON afk (guild_id, user_id);");
  } catch (_) {}

  try {
    sqlite.exec("ALTER TABLE auto_role_reward_config ADD COLUMN enabled INTEGER DEFAULT 0;");
  } catch (_) {}
  try {
    sqlite.exec("ALTER TABLE auto_role_reward_config ADD COLUMN announcement_channel_id TEXT;");
  } catch (_) {}
  try {
    sqlite.exec("ALTER TABLE auto_role_reward_config ADD COLUMN top_chat_role_1 TEXT;");
  } catch (_) {}
  try {
    sqlite.exec("ALTER TABLE auto_role_reward_config ADD COLUMN top_chat_role_2 TEXT;");
  } catch (_) {}
  try {
    sqlite.exec("ALTER TABLE auto_role_reward_config ADD COLUMN top_chat_role_3 TEXT;");
  } catch (_) {}

  try {
    sqlite.exec("ALTER TABLE supporter_config ADD COLUMN enabled INTEGER DEFAULT 0;");
  } catch (_) {}
  try {
    sqlite.exec("ALTER TABLE supporter_config ADD COLUMN clan_tag TEXT;");
  } catch (_) {}
  try {
    sqlite.exec("ALTER TABLE supporter_config ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP;");
  } catch (_) {}
  try {
    sqlite.exec("ALTER TABLE supporter_config ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;");
  } catch (_) {}
  try {
    sqlite.exec("ALTER TABLE channel_permission_snapshots ADD COLUMN expires_at TEXT;");
  } catch (_) {}
  try {
    sqlite.exec("CREATE TABLE IF NOT EXISTS system_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);");
  } catch (_) {}
  try {
    sqlite.exec("CREATE TABLE IF NOT EXISTS auto_role_config (guild_id TEXT PRIMARY KEY, role_id TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);");
  } catch (_) {}
  try {
    sqlite.exec("CREATE TABLE IF NOT EXISTS welcome_config (guild_id TEXT PRIMARY KEY, welcome_enabled INTEGER DEFAULT 0, welcome_channel_id TEXT, welcome_message TEXT, welcome_is_embed INTEGER DEFAULT 1, welcome_embed_title TEXT, welcome_embed_color TEXT DEFAULT '#6366F1', welcome_embed_footer TEXT, welcome_show_thumbnail INTEGER DEFAULT 1, welcome_image_url TEXT, welcome_ping_user INTEGER DEFAULT 1, welcome_delete_seconds INTEGER DEFAULT 0, dm_enabled INTEGER DEFAULT 0, dm_message TEXT, leave_enabled INTEGER DEFAULT 0, leave_channel_id TEXT, leave_message TEXT, leave_is_embed INTEGER DEFAULT 0, leave_embed_title TEXT, leave_embed_color TEXT DEFAULT '#F43F5E', autorole_enabled INTEGER DEFAULT 0, join_role_ids TEXT DEFAULT '[]', bot_role_id TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);");
  } catch (_) {}

  // Upgrade welcome_config with modern embed columns
  const welcomeCols = [
    "welcome_embed_title_url TEXT",
    "welcome_embed_author TEXT",
    "welcome_embed_author_icon TEXT",
    "welcome_embed_author_url TEXT",
    "welcome_embed_footer_icon TEXT",
    "welcome_embed_fields TEXT DEFAULT '[]'",
    "welcome_thumbnail_type TEXT DEFAULT 'user_avatar'",
    "welcome_thumbnail_custom TEXT",
    "welcome_show_timestamp INTEGER DEFAULT 1",
    "dm_is_embed INTEGER DEFAULT 0",
    "dm_embed_title TEXT DEFAULT 'Welcome to {server}!'",
    "dm_embed_color TEXT DEFAULT '#10B981'",
    "dm_embed_footer TEXT DEFAULT '{server}'",
    "dm_show_thumbnail INTEGER DEFAULT 1",
    "leave_embed_footer TEXT DEFAULT 'Remaining: {memberCount} members'",
    "leave_show_thumbnail INTEGER DEFAULT 1",
    "leave_image_url TEXT",
    "leave_embed_author TEXT",
    "leave_embed_author_icon TEXT",
    "leave_embed_fields TEXT DEFAULT '[]'"
  ];
  for (const col of welcomeCols) {
    try {
      sqlite.exec(`ALTER TABLE welcome_config ADD COLUMN ${col};`);
    } catch (_) {}
  }

  // Migrate warning_punishment_config: add columns missing from earlier schema versions
  try {
    sqlite.exec("ALTER TABLE warning_punishment_config ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP;");
  } catch (_) {}
  try {
    sqlite.exec("ALTER TABLE warning_punishment_config ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;");
  } catch (_) {}
  try {
    sqlite.exec("ALTER TABLE moderation_log_config ADD COLUMN events_config TEXT DEFAULT '{}';");
  } catch (_) {}

  // Deduplicate and ensure unique indexes for existing SQLite databases to prevent analytics duplication & ON CONFLICT errors
  try {
    sqlite.exec("DELETE FROM member_analytics WHERE id NOT IN (SELECT MAX(id) FROM member_analytics GROUP BY guild_id, user_id);");
    sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_member_analytics_guild_user ON member_analytics (guild_id, user_id);");
  } catch (_) {}
  try {
    sqlite.exec("DELETE FROM daily_activity_snapshots WHERE id NOT IN (SELECT MAX(id) FROM daily_activity_snapshots GROUP BY guild_id, date);");
    sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_activity_guild_date ON daily_activity_snapshots (guild_id, date);");
  } catch (_) {}
  try {
    sqlite.exec("DELETE FROM channel_activities WHERE id NOT IN (SELECT MAX(id) FROM channel_activities GROUP BY guild_id, channel_id, date);");
    sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_activities_unique ON channel_activities (guild_id, channel_id, date);");
  } catch (_) {}
  try {
    sqlite.exec("DELETE FROM hourly_activities WHERE id NOT IN (SELECT MAX(id) FROM hourly_activities GROUP BY guild_id, day_of_week, hour_of_day);");
    sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_hourly_activities_unique ON hourly_activities (guild_id, day_of_week, hour_of_day);");
  } catch (_) {}
}

export async function initDb(options = {}) {
  const conf = getDatabaseConfig();

  if (conf.dialect === "sqlite") {
    initDbSync();
    logger.info(`[DB] Drizzle ORM connected to SQLite (${conf.storage}) | Schema initialized.`);
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
    logger.info("[DB] Drizzle ORM connected to PostgreSQL.");
    return activeDb;
  }

  if (conf.dialect === "mysql") {
    const mysql = await import("mysql2/promise");
    const { drizzle } = await import("drizzle-orm/mysql2");
    mysqlPool = mysql.createPool(conf.url);
    activeDb = drizzle(mysqlPool, { schema, mode: "default" });
    logger.info("[DB] Drizzle ORM connected to MySQL.");
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
    logger.info("[DB] Database connection closed cleanly.");
  } catch (error) {
    logger.error("[DB ERROR] Error closing database connection:", error);
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
