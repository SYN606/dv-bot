import fs from "node:fs";
import path from "node:path";
import { Sequelize } from "sequelize";
import { CONFIG } from "../config.js";

export function getDatabaseConfig() {
  const dbType = CONFIG.DB_TYPE || "sqlite";

  if (dbType === "sqlite") {
    const dbDir = path.join(CONFIG.ROOT_DIR, ".DB_DND");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const storage = path.join(dbDir, CONFIG.SQLITE_NAME || "bot.db");
    return { dialect: "sqlite", storage };
  }

  // External database (Postgres or MySQL)
  if (CONFIG.DATABASE_URL) {
    const url = CONFIG.DATABASE_URL.replace(/^postgresql:\/\//, "postgres://");
    const dialect = url.startsWith("postgres") ? "postgres" : (url.startsWith("mysql") ? "mysql" : dbType);
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

export function createSequelize(customConfig = null) {
  const dbConf = customConfig || getDatabaseConfig();

  if (dbConf.dialect === "sqlite") {
    return new Sequelize({
      dialect: "sqlite",
      storage: dbConf.storage,
      logging: false,
      define: {
        underscored: true,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    });
  }

  if (dbConf.dialect === "postgres") {
    const dialectOptions = {};
    if (CONFIG.DB_SSL) {
      dialectOptions.ssl = {
        require: true,
        rejectUnauthorized: false,
      };
    }
    return new Sequelize(dbConf.url, {
      dialect: "postgres",
      logging: false,
      dialectOptions,
      pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        underscored: true,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    });
  }

  if (dbConf.dialect === "mysql") {
    return new Sequelize(dbConf.url, {
      dialect: "mysql",
      logging: false,
      pool: {
        max: 10,
        min: 2,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        underscored: true,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
    });
  }

  throw new Error(`Unsupported dialect: ${dbConf.dialect}`);
}

export const sequelize = createSequelize();

export async function initDb(options = { alter: false }) {
  try {
    await sequelize.authenticate();

    // High performance tuning for SQLite
    if (sequelize.getDialect() === "sqlite") {
      await sequelize.query("PRAGMA journal_mode = WAL;");
      await sequelize.query("PRAGMA synchronous = NORMAL;");
      await sequelize.query("PRAGMA foreign_keys = ON;");
      await sequelize.query("PRAGMA busy_timeout = 5000;");
      await sequelize.query("PRAGMA cache_size = -64000;");
      await sequelize.query("PRAGMA temp_store = MEMORY;");
      await sequelize.query("PRAGMA mmap_size = 268435456;");
      await sequelize.query("PRAGMA auto_vacuum = INCREMENTAL;");

      // Clean up any stale sqlite alter tables
      await sequelize.query("DROP TABLE IF EXISTS guilds_backup;").catch(() => {});
    }

    // Sync all models
    await sequelize.sync(options);

    // Ensure verification_config columns exist for existing databases without full destructive rebuilds
    if (sequelize.getDialect() === "sqlite") {
      try {
        const tableInfo = await sequelize.query("PRAGMA table_info(verification_config);", {
          type: sequelize.QueryTypes.SELECT,
        });
        const cols = new Set(tableInfo.map((col) => col.name));
        if (!cols.has("enabled")) {
          await sequelize.query("ALTER TABLE verification_config ADD COLUMN enabled BOOLEAN DEFAULT 0;").catch(() => {});
        }
        if (!cols.has("mode")) {
          await sequelize.query("ALTER TABLE verification_config ADD COLUMN mode VARCHAR(16) DEFAULT 'button';").catch(() => {});
        }
        if (!cols.has("min_account_age_hours")) {
          await sequelize.query("ALTER TABLE verification_config ADD COLUMN min_account_age_hours INTEGER DEFAULT 0;").catch(() => {});
        }
        if (!cols.has("embed_title")) {
          await sequelize.query("ALTER TABLE verification_config ADD COLUMN embed_title VARCHAR(128);").catch(() => {});
        }
        if (!cols.has("embed_description")) {
          await sequelize.query("ALTER TABLE verification_config ADD COLUMN embed_description TEXT;").catch(() => {});
        }
        if (!cols.has("button_label")) {
          await sequelize.query("ALTER TABLE verification_config ADD COLUMN button_label VARCHAR(64) DEFAULT 'Verify Access';").catch(() => {});
        }
        if (!cols.has("button_emoji")) {
          await sequelize.query("ALTER TABLE verification_config ADD COLUMN button_emoji VARCHAR(32) DEFAULT '✅';").catch(() => {});
        }
      } catch {}
    }

    console.log(`[DB] Using ${sequelize.getDialect().toUpperCase()} database | Connection & Schema ready.`);
    return sequelize;
  } catch (error) {
    console.error(`[DB ERROR] Failed to connect to ${sequelize.getDialect().toUpperCase()} database:`, error);
    throw error;
  }
}

export async function closeDb() {
  try {
    await sequelize.close();
    console.log("[DB] Database connection closed cleanly.");
  } catch (error) {
    console.error("[DB ERROR] Error closing database connection:", error);
  }
}
