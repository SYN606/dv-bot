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

let dashboardUrl: string;
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

export interface BotConfig {
  TOKEN: string;
  PREFIX: string;
  BOT_NAME: string;
  ENV: string;
  DEV_GUILD_ID: string | null;
  SYNC_COMMANDS: boolean;
  BOT_STATUS: string;
  BOT_ACTIVITY_TYPE: string;
  BOT_ACTIVITY_TEXT: string | null;
  DB_TYPE: string;
  DB_DIR: string | null;
  DB_STORAGE: string | null;
  SQLITE_NAME: string;
  DATABASE_URL: string | null;
  DB_USER: string | null;
  DB_PASS: string | null;
  DB_HOST: string;
  DB_SSL: boolean;
  DB_PORT: string | null;
  DB_NAME: string | null;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  DASHBOARD_PORT: number;
  DASHBOARD_URL: string;
  DASHBOARD_URL_DEV: string;
  DASHBOARD_URL_PROD: string;
  SESSION_SECRET: string | null;
  SUPERUSERS: string[];
  AFK_IMAGE_URL: string | null;
  MENTION_GIF_URL: string | null;
  ROOT_DIR: string;
}

export const CONFIG: BotConfig = {
  TOKEN: process.env.DISCORD_TOKEN || "",
  PREFIX: process.env.PREFIX || process.env.BOT_PREFIX || "dv",
  BOT_NAME: process.env.BOT_NAME || "Digital Vigital",
  ENV: env,
  DEV_GUILD_ID: process.env.DEV_GUILD_ID || null,
  SYNC_COMMANDS: (process.env.SYNC_COMMANDS || "true").toLowerCase() === "true",

  // Bot Presence Configuration
  BOT_STATUS: process.env.BOT_STATUS || "idle",
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
  DB_SSL: (process.env.DB_SSL || "false").toLowerCase() === "true",
  DB_PORT: process.env.DB_PORT || null,
  DB_NAME: process.env.DB_NAME || null,

  // Dashboard & OAuth2 Configuration
  CLIENT_ID: process.env.DISCORD_CLIENT_ID || "",
  CLIENT_SECRET: process.env.DISCORD_CLIENT_SECRET || "",
  DASHBOARD_PORT: dashboardPort,
  DASHBOARD_URL: dashboardUrl,
  DASHBOARD_URL_DEV: dashboardUrlDev,
  DASHBOARD_URL_PROD: dashboardUrlProd,
  SESSION_SECRET: process.env.SESSION_SECRET || (env === "production" ? null : "dv-bot-super-secure-secret-key-2026"),

  // Superusers
  SUPERUSERS: (process.env.SUPERUSER_IDS || process.env.SUPERUSERS || process.env.SUPERUSER || process.env.OWNER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),

  // Feature Media URLs
  AFK_IMAGE_URL: process.env.AFK_IMAGE_URL || null,
  MENTION_GIF_URL: process.env.MENTION_GIF_URL || null,

  ROOT_DIR,
};

if (CONFIG.ENV === "production" && !CONFIG.SESSION_SECRET) {
  throw new Error("FATAL SECURITY ERROR: You MUST set a secure SESSION_SECRET in .env for production environments.");
}
