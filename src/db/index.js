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
    }

    // Sync all models
    await sequelize.sync(options);
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
