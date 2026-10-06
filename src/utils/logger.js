import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import { CONFIG } from "../config.js";

const LOG_DIR = path.join(CONFIG.ROOT_DIR, "logs");
const APP_LOG_PATH = path.join(LOG_DIR, "app.log");
const ERROR_LOG_PATH = path.join(LOG_DIR, "error.log");

const MAX_LOG_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per log file

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  SUCCESS: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

// ANSI terminal color codes
const COLOR_RESET = "\x1b[0m";
const COLOR_DIM = "\x1b[90m";
const COLOR_BOLD = "\x1b[1m";

const LEVEL_STYLES = {
  DEBUG: {
    color: "\x1b[90m",
    badge: "\x1b[90mDEBUG  \x1b[0m",
  },
  INFO: {
    color: "\x1b[36m",
    badge: "\x1b[36m\x1b[1mINFO   \x1b[0m",
  },
  SUCCESS: {
    color: "\x1b[32m",
    badge: "\x1b[32m\x1b[1mSUCCESS\x1b[0m",
  },
  WARN: {
    color: "\x1b[33m",
    badge: "\x1b[33m\x1b[1mWARN   \x1b[0m",
  },
  ERROR: {
    color: "\x1b[31m",
    badge: "\x1b[31m\x1b[1mERROR  \x1b[0m",
  },
  FATAL: {
    color: "\x1b[35m",
    badge: "\x1b[35m\x1b[1mFATAL  \x1b[0m",
  },
};

/**
 * Remove ANSI escape sequences from strings
 */
function stripAnsi(str) {
  if (typeof str !== "string") return String(str);
  return str.replace(/\x1b\[[0-9;]*m/g, "");
}

/**
 * Format local time in HH:mm:ss.SSS
 */
function formatLocalTime(date = new Date()) {
  const pad = (n, s = 2) => String(n).padStart(s, "0");
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(), 3);
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * Format ISO timestamp
 */
function formatIsoTime(date = new Date()) {
  return date.toISOString();
}

class AsyncLogger {
  constructor() {
    this.buffer = [];
    this.flushTimer = null;
    this.currentFlushPromise = null;
    this.minLevel = process.env.LOG_LEVEL
      ? (LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] ?? LOG_LEVELS.INFO)
      : (CONFIG.ENV === "dev" ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO);

    this.ensureLogDirectory();
    this.startFlushInterval();
    this.registerExitHooks();
  }

  ensureLogDirectory() {
    try {
      if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true });
      }
    } catch (_) {}
  }

  startFlushInterval() {
    if (!this.flushTimer) {
      this.flushTimer = setInterval(() => {
        if (this.buffer.length > 0) {
          this.flush().catch(() => {});
        }
      }, 500);

      if (this.flushTimer.unref) {
        this.flushTimer.unref();
      }
    }
  }

  registerExitHooks() {
    // Ensure all logs are flushed on process termination
    const onExit = () => this.flushSync();
    if (typeof process !== "undefined") {
      process.once("beforeExit", onExit);
    }
  }

  /**
   * Safely format arbitrary values (handles Discord objects, errors, circular structures)
   */
  formatValue(val, colorize = false) {
    if (val === null || val === undefined) return String(val);
    if (val instanceof Error) {
      return val.stack || `${val.name}: ${val.message}`;
    }

    // Friendly serialization for Discord.js complex entities
    if (typeof val === "object") {
      if (val.id && (val.tag || val.username)) {
        return `[User: ${val.tag || val.username} (${val.id})]`;
      }
      if (val.id && val.name && val.channels) {
        return `[Guild: ${val.name} (${val.id})]`;
      }
      if (val.id && val.name && val.guild) {
        return `[Channel: #${val.name} (${val.id})]`;
      }
      try {
        return util.inspect(val, {
          depth: 3,
          colors: colorize,
          compact: true,
          breakLength: 120,
        });
      } catch (_) {
        return String(val);
      }
    }

    return String(val);
  }

  /**
   * Enhance module tags like [GATEWAY], [DB], [CLIENT] with stylish coloring
   */
  highlightTags(message) {
    if (typeof message !== "string") return String(message);

    return message.replace(/^(\[[^\]]+\])/, (match) => {
      return `${COLOR_BOLD}\x1b[35m${match}${COLOR_RESET}`;
    });
  }

  formatConsoleMessage(level, message, ...args) {
    const time = formatLocalTime();
    const style = LEVEL_STYLES[level] || LEVEL_STYLES.INFO;
    const timePrefix = `${COLOR_DIM}[${time}]${COLOR_RESET}`;
    const badge = style.badge;

    const formattedMessage = this.highlightTags(message);
    const formattedArgs = args.map((a) => this.formatValue(a, true)).join(" ");

    return `${timePrefix} ${badge} ${formattedMessage}${formattedArgs ? " " + formattedArgs : ""}`;
  }

  formatFileEntry(level, message, ...args) {
    const time = formatIsoTime();
    const formattedArgs = args.map((a) => this.formatValue(a, false)).join(" ");
    const fullMessage = `${message}${formattedArgs ? " " + formattedArgs : ""}`;
    const cleanMessage = stripAnsi(fullMessage);
    return `[${time}] [${level.padEnd(5)}] ${cleanMessage}\n`;
  }

  rotateIfNeeded(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        if (stats.size > MAX_LOG_SIZE_BYTES) {
          const oldPath = `${filePath}.old`;
          try {
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            fs.renameSync(filePath, oldPath);
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  writeEntry(level, message, args) {
    const levelVal = LOG_LEVELS[level] ?? LOG_LEVELS.INFO;
    if (levelVal < this.minLevel) return;

    // 1. Console Output
    const consoleFormatted = this.formatConsoleMessage(level, message, ...args);
    if (levelVal >= LOG_LEVELS.ERROR) {
      console.error(consoleFormatted);
    } else if (levelVal === LOG_LEVELS.WARN) {
      console.warn(consoleFormatted);
    } else {
      console.log(consoleFormatted);
    }

    // 2. Queue for Async Non-Blocking File Append
    const fileEntry = this.formatFileEntry(level, message, ...args);
    this.buffer.push({ levelVal, entry: fileEntry });

    // Flush immediately on severe errors or when buffer fills up
    if (levelVal >= LOG_LEVELS.ERROR || this.buffer.length >= 25) {
      this.flush().catch(() => {});
    }
  }

  debug(message, ...args) {
    this.writeEntry("DEBUG", message, args);
  }

  info(message, ...args) {
    this.writeEntry("INFO", message, args);
  }

  success(message, ...args) {
    this.writeEntry("SUCCESS", message, args);
  }

  warn(message, ...args) {
    this.writeEntry("WARN", message, args);
  }

  error(message, ...args) {
    this.writeEntry("ERROR", message, args);
  }

  fatal(message, ...args) {
    this.writeEntry("FATAL", message, args);
  }

  /**
   * Create a scoped logger that automatically prefixes all log lines with [TAG]
   */
  scope(tag) {
    const prefix = `[${tag}]`;
    return {
      debug: (msg, ...args) => this.debug(`${prefix} ${msg}`, ...args),
      info: (msg, ...args) => this.info(`${prefix} ${msg}`, ...args),
      success: (msg, ...args) => this.success(`${prefix} ${msg}`, ...args),
      warn: (msg, ...args) => this.warn(`${prefix} ${msg}`, ...args),
      error: (msg, ...args) => this.error(`${prefix} ${msg}`, ...args),
      fatal: (msg, ...args) => this.fatal(`${prefix} ${msg}`, ...args),
    };
  }

  withTag(tag) {
    return this.scope(tag);
  }

  async flush() {
    if (this.currentFlushPromise) {
      await this.currentFlushPromise;
      if (this.buffer.length === 0) return;
    }

    if (this.buffer.length === 0) return;

    this.currentFlushPromise = this._doFlush();
    try {
      await this.currentFlushPromise;
    } finally {
      this.currentFlushPromise = null;
    }
  }

  async _doFlush() {
    const itemsToWrite = this.buffer.splice(0, this.buffer.length);
    let appContent = "";
    let errorContent = "";

    for (const item of itemsToWrite) {
      appContent += item.entry;
      if (item.levelVal >= LOG_LEVELS.WARN) {
        errorContent += item.entry;
      }
    }

    try {
      this.ensureLogDirectory();
      this.rotateIfNeeded(APP_LOG_PATH);
      if (appContent) {
        await fs.promises.appendFile(APP_LOG_PATH, appContent, "utf8");
      }

      if (errorContent) {
        this.rotateIfNeeded(ERROR_LOG_PATH);
        await fs.promises.appendFile(ERROR_LOG_PATH, errorContent, "utf8");
      }
    } catch (err) {
      // In worst-case disk write failure, don't crash process
      console.error("[LOGGER I/O ERROR]:", err.message);
    }
  }

  flushSync() {
    if (this.buffer.length === 0) return;
    const itemsToWrite = this.buffer.splice(0, this.buffer.length);
    let appContent = "";
    let errorContent = "";

    for (const item of itemsToWrite) {
      appContent += item.entry;
      if (item.levelVal >= LOG_LEVELS.WARN) {
        errorContent += item.entry;
      }
    }

    try {
      this.ensureLogDirectory();
      if (appContent) {
        fs.appendFileSync(APP_LOG_PATH, appContent, "utf8");
      }
      if (errorContent) {
        fs.appendFileSync(ERROR_LOG_PATH, errorContent, "utf8");
      }
    } catch (_) {}
  }
}

export const logger = new AsyncLogger();
