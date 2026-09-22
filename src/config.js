import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, "..");

export const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN || "",
  PREFIX: process.env.BOT_PREFIX || "!",
  ENV: process.env.ENV || "production",
  DEV_GUILD_ID: process.env.DEV_GUILD_ID || null,
  SYNC_COMMANDS: (process.env.SYNC_COMMANDS || "true").toLowerCase() === "true",

  // Multi-Database Configuration
  DB_TYPE: (process.env.DB_TYPE || "sqlite").toLowerCase(),
  DB_DIR: process.env.DB_DIR || null,
  DB_STORAGE: process.env.DB_STORAGE || null,
  SQLITE_NAME: process.env.SQLITE_NAME || "bot.db",
  DATABASE_URL: process.env.DATABASE_URL || null,
  DB_USER: process.env.DB_USER || null,
  DB_PASS: process.env.DB_PASS || null,
  DB_HOST: process.env.DB_HOST || "localhost",
  DB_PORT: process.env.DB_PORT || null,
  DB_NAME: process.env.DB_NAME || null,
  // Dashboard & OAuth2 Configuration
  CLIENT_ID: process.env.DISCORD_CLIENT_ID || "",
  CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || "",
  DASHBOARD_PORT: parseInt(process.env.DASHBOARD_PORT || process.env.PORT || "3000", 10),
  DASHBOARD_URL: process.env.DASHBOARD_URL || "http://localhost:3000",
  SESSION_SECRET: process.env.SESSION_SECRET || "dv-bot-super-secure-secret-key-2026",

  ROOT_DIR,
};
