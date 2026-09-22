import { describe, expect, it } from "bun:test";
import { startPresence, stopPresence } from "../src/core/presence.js";
import { CONFIG } from "../src/config.js";

describe("Presence and Mention System Tests", () => {
  it("should start presence without throwing and set client presence", () => {
    let capturedPresence = null;
    const mockClient = {
      user: {
        setPresence: (payload) => {
          capturedPresence = payload;
        },
      },
      guilds: {
        cache: {
          size: 5,
          reduce: (fn, init) => 150,
        },
      },
    };

    startPresence(mockClient);
    expect(capturedPresence).not.toBeNull();
    expect(capturedPresence.status).toBe("online");
    expect(Array.isArray(capturedPresence.activities)).toBe(true);
    expect(capturedPresence.activities.length).toBeGreaterThan(0);

    stopPresence();
  });

  it("should configure prefix from CONFIG.PREFIX defaulting to ts", () => {
    expect(CONFIG.PREFIX).toBe("ts");
  });

  it("should match mention regex for both standard and nickname mention formats", () => {
    const botId = "1468995670797975614";
    const mentionRegex = new RegExp(`^<@!?${botId}>(?:\\s+)?`);

    // Pure mentions
    expect(mentionRegex.test(`<@${botId}>`)).toBe(true);
    expect(mentionRegex.test(`<@!${botId}>`)).toBe(true);
    expect(mentionRegex.test(`<@${botId}> `)).toBe(true);

    // Mention with command
    expect(mentionRegex.test(`<@${botId}> afk sleeping`)).toBe(true);
    const stripped = `<@${botId}> afk sleeping`.replace(mentionRegex, "").trim();
    expect(stripped).toBe("afk sleeping");

    // Negative case
    expect(mentionRegex.test(`<@999999999999999999> afk`)).toBe(false);
  });

  it("should parse prefix commands case-insensitively with ts", () => {
    const prefix = CONFIG.PREFIX.toLowerCase();

    const parseCommand = (content) => {
      const trimmed = content.trim();
      let commandString = null;

      if (trimmed.toLowerCase().startsWith(prefix)) {
        commandString = trimmed.slice(prefix.length).trim();
      } else if (trimmed.startsWith("!")) {
        commandString = trimmed.slice(1).trim();
      }

      if (!commandString) return null;
      const parts = commandString.split(/\s+/);
      return {
        cmd: parts.shift()?.toLowerCase(),
        args: parts,
      };
    };

    expect(parseCommand("ts afk")).toEqual({ cmd: "afk", args: [] });
    expect(parseCommand("ts afk sleeping")).toEqual({ cmd: "afk", args: ["sleeping"] });
    expect(parseCommand("tsafk sleeping")).toEqual({ cmd: "afk", args: ["sleeping"] });
    expect(parseCommand("TS afk playing")).toEqual({ cmd: "afk", args: ["playing"] });
    expect(parseCommand("Ts help")).toEqual({ cmd: "help", args: [] });
    expect(parseCommand("!afk")).toEqual({ cmd: "afk", args: [] });
    expect(parseCommand("random chatter")).toBeNull();
  });
});
