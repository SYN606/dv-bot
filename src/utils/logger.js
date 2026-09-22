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
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

const COLOR_RESET = "\x1b[0m";
const LEVEL_COLORS = {
  DEBUG: "\x1b[90m", // Gray
  INFO: "\x1b[36m",  // Cyan
  WARN: "\x1b[33m",  // Yellow
  ERROR: "\x1b[31m", // Red
  FATAL: "\x1b[35m", // Magenta
};

class AsyncLogger {
  constructor() {
    this.buffer = [];
    this.flushTimer = null;
    this.isFlushing = false;
    this.minLevel = process.env.LOG_LEVEL
      ? (LOG_LEVELS[process.env.LOG_LEVEL.toUpperCase()] ?? LOG_LEVELS.INFO)
      : (CONFIG.ENV === "dev" ? LOG_LEVELS.DEBUG : LOG_LEVELS.INFO);

    this.ensureLogDirectory();
    this.startFlushInterval();
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

      // Unref timer so it doesn't prevent clean process exit
      if (this.flushTimer.unref) {
        this.flushTimer.unref();
      }
    }
  }

  formatValue(val) {
    if (val === null || val === undefined) return String(val);
    if (val instanceof Error) {
      return val.stack || `${val.name}: ${val.message}`;
    }
    if (typeof val === "object") {
      try {
        return util.inspect(val, { depth: 3, colors: false, compact: true, breakLength: Infinity });
      } catch (_) {
        return String(val);
      }
    }
    return String(val);
  }

  formatConsoleMessage(level, message, ...args) {
    const time = new Date().toISOString().replace("T", " ").replace("Z", "");
    const color = LEVEL_COLORS[level] || "";
    const prefix = `${color}[${time}] [${level}]${COLOR_RESET}`;
    const formattedArgs = args.map((a) => this.formatValue(a)).join(" ");
    return `${prefix} ${message}${formattedArgs ? " " + formattedArgs : ""}`;
  }

  formatFileEntry(level, message, ...args) {
    const time = new Date().toISOString();
    const formattedArgs = args.map((a) => this.formatValue(a)).join(" ");
    const fullMessage = `${message}${formattedArgs ? " " + formattedArgs : ""}`;
    return `[${time}] [${level}] ${fullMessage}\n`;
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

    // Flush immediately for high-priority errors or buffer overflow
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

  warn(message, ...args) {
    this.writeEntry("WARN", message, args);
  }

  error(message, ...args) {
    this.writeEntry("ERROR", message, args);
  }

  fatal(message, ...args) {
    this.writeEntry("FATAL", message, args);
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
