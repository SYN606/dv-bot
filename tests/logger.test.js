import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { logger } from "../src/utils/logger.js";
import { CONFIG } from "../src/config.js";

describe("Asynchronous Structured Logger Tests", () => {
  const logDir = path.join(CONFIG.ROOT_DIR, "logs");
  const appLogPath = path.join(logDir, "app.log");
  const errorLogPath = path.join(logDir, "error.log");

  it("should format and record info messages without throwing", async () => {
    logger.info("Test info message with param", { key: "value", num: 42 });
    await logger.flush();

    expect(fs.existsSync(appLogPath)).toBe(true);
    const content = fs.readFileSync(appLogPath, "utf8");
    expect(content).toContain("[INFO] Test info message with param");
    expect(content).toContain("key: 'value'");
  });

  it("should record error messages to both app.log and error.log with stack trace", async () => {
    const testError = new Error("Custom simulated failure for logger test");
    logger.error("A critical operation failed:", testError);
    await logger.flush();

    expect(fs.existsSync(errorLogPath)).toBe(true);
    const errContent = fs.readFileSync(errorLogPath, "utf8");
    expect(errContent).toContain("[ERROR] A critical operation failed:");
    expect(errContent).toContain("Custom simulated failure for logger test");

    const appContent = fs.readFileSync(appLogPath, "utf8");
    expect(appContent).toContain("[ERROR] A critical operation failed:");
  });

  it("should safely serialize circular objects without throwing", async () => {
    const circular = { name: "loop" };
    circular.self = circular;

    expect(() => {
      logger.warn("Circular reference warning test", circular);
    }).not.toThrow();

    await logger.flush();
    const content = fs.readFileSync(appLogPath, "utf8");
    expect(content).toContain("[WARN] Circular reference warning test");
  });

  it("should flush remaining buffer synchronously on flushSync()", () => {
    logger.info("Synchronous exit flush check");
    logger.flushSync();

    const content = fs.readFileSync(appLogPath, "utf8");
    expect(content).toContain("Synchronous exit flush check");
  });
});
