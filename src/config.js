import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const ROOT_DIR = path.resolve(__dirname, "..");

const env = (process.env.ENV || "production").toLowerCase();
const isDev = env === "dev" || env === "development" || env === "test";

const dashboardPort = parseInt(process.env.DASHBOARD_PORT || process.env.PORT || "3000", 10);
const dashboardUrlDev = process.env.DASHBOARD_URL_DEV || `http://localhost:${dashboardPort}`;
const dashboardUrlProd = process.env.DASHBOARD_URL_PROD || process.env.DASHBOARD_DOMAIN || "https://bot.digitalvigital.fun";

// Dynamic Dashboard & OAuth2 Redirect URL:
// Automatically selects dev URL (localhost) in dev mode and production domain in prod mode.
let dashboardUrl;
if (process.env.DASHBOARD_URL) {
  if (isDev && process.env.DASHBOARD_URL_DEV) {
    dashboardUrl = process.env.DASHBOARD_URL_DEV;
  } else if (!isDev && process.env.DASHBOARD_URL_PROD) {
    dashboardUrl = process.env.DASHBOARD_URL_PROD;
  } else if (!isDev && process.env.DASHBOARD_URL === "http://localhost:3000") {
    dashboardUrl = dashboardUrlProd;
  } else {
    dashboardUrl = process.env.DASHBOARD_URL;
  }
} else {
  dashboardUrl = isDev ? dashboardUrlDev : dashboardUrlProd;
}

export const CONFIG = {
  TOKEN: process.env.DISCORD_TOKEN || "",
  PREFIX: process.env.PREFIX || process.env.BOT_PREFIX || "dv",
  BOT_NAME: process.env.BOT_NAME || "Digital Vigital",
  ENV: env,
  DEV_GUILD_ID: process.env.DEV_GUILD_ID || null,
  SYNC_COMMANDS: (process.env.SYNC_COMMANDS || "true").toLowerCase() === "true",

  // Bot Presence Configuration
  BOT_STATUS: process.env.BOT_STATUS || "online",
  BOT_ACTIVITY_TYPE: process.env.BOT_ACTIVITY_TYPE || "LISTENING",
  BOT_ACTIVITY_TEXT: process.env.BOT_ACTIVITY_TEXT || null,

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
  DASHBOARD_PORT: dashboardPort,
  DASHBOARD_URL: dashboardUrl,
  DASHBOARD_URL_DEV: dashboardUrlDev,
  DASHBOARD_URL_PROD: dashboardUrlProd,
  SESSION_SECRET: process.env.SESSION_SECRET || "dv-bot-super-secure-secret-key-2026",

  // Superusers (comma-separated list of up to 3 Discord User IDs)
  SUPERUSERS: (process.env.SUPERUSER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 3),

  ROOT_DIR,
};
