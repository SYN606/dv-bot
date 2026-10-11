/**
 * Unit tests for Warning Punishments utility functions
 * Run: bun test tests/punishmentUtils.test.js
 */
import { describe, it, expect } from "bun:test";
import {
  PUNISHMENT_TYPES,
  DURATION_OPTIONS,
  SECONDS_PER_MINUTE,
  SECONDS_PER_HOUR,
  SECONDS_PER_DAY,
  MIN_WARNING_THRESHOLD,
  MAX_WARNING_THRESHOLD,
  formatPunishmentDuration,
  getPunishmentType,
  isValidPunishmentType,
  getDurationOptionsForPunishment,
  isValidPunishmentDuration,
  findNextUnusedThreshold,
} from "../src/web/frontend/src/utils/warning-punishments/punishment.js";

describe("PUNISHMENT_TYPES configuration", () => {
  it("contains all required punishment actions", () => {
    const ids = PUNISHMENT_TYPES.map((p) => p.id);
    expect(ids).toEqual(["timeout", "kick", "ban", "tempban"]);
  });

  it("defines metadata for each punishment action", () => {
    for (const p of PUNISHMENT_TYPES) {
      expect(typeof p.id).toBe("string");
      expect(typeof p.name).toBe("string");
      expect(typeof p.description).toBe("string");
      expect(typeof p.requiresDuration).toBe("boolean");
      expect(typeof p.hasDuration).toBe("boolean");
      expect(typeof p.isPermanent).toBe("boolean");
      if (p.requiresDuration) {
        expect(typeof p.defaultDuration).toBe("number");
        expect(p.defaultDuration).toBeGreaterThan(0);
      } else {
        expect(p.defaultDuration).toBeNull();
      }
    }
  });

  it("uses 'Temporary Ban' as display name and 'tempban' as internal ID", () => {
    const tempban = PUNISHMENT_TYPES.find((p) => p.id === "tempban");
    expect(tempban).toBeDefined();
    expect(tempban.name).toBe("Temporary Ban");
    expect(tempban.requiresDuration).toBe(true);
    expect(tempban.isPermanent).toBe(false);
  });

  it("correctly identifies permanent punishments", () => {
    const ban = PUNISHMENT_TYPES.find((p) => p.id === "ban");
    expect(ban.isPermanent).toBe(true);
    expect(ban.requiresDuration).toBe(false);

    const kick = PUNISHMENT_TYPES.find((p) => p.id === "kick");
    expect(kick.isPermanent).toBe(false);
    expect(kick.requiresDuration).toBe(false);
  });

  it("is immutable", () => {
    expect(Object.isFrozen(PUNISHMENT_TYPES)).toBe(true);
    expect(Object.isFrozen(PUNISHMENT_TYPES[0])).toBe(true);
  });
});

describe("DURATION_OPTIONS configuration", () => {
  it("includes all 12 requested practical moderation durations in seconds", () => {
    const expected = [
      { value: 300, label: "5 Minutes" },
      { value: 600, label: "10 Minutes" },
      { value: 1800, label: "30 Minutes" },
      { value: 3600, label: "1 Hour" },
      { value: 10800, label: "3 Hours" },
      { value: 21600, label: "6 Hours" },
      { value: 43200, label: "12 Hours" },
      { value: 86400, label: "1 Day" },
      { value: 259200, label: "3 Days" },
      { value: 604800, label: "7 Days" },
      { value: 1209600, label: "14 Days" },
      { value: 2419200, label: "28 Days" },
    ];

    expect(DURATION_OPTIONS.length).toBe(12);
    for (let i = 0; i < expected.length; i++) {
      expect(DURATION_OPTIONS[i].value).toBe(expected[i].value);
      expect(DURATION_OPTIONS[i].label).toBe(expected[i].label);
    }
  });

  it("is immutable", () => {
    expect(Object.isFrozen(DURATION_OPTIONS)).toBe(true);
    expect(Object.isFrozen(DURATION_OPTIONS[0])).toBe(true);
  });
});

describe("formatPunishmentDuration", () => {
  it("formats single-unit durations accurately", () => {
    expect(formatPunishmentDuration(300)).toBe("5 Minutes");
    expect(formatPunishmentDuration(3600)).toBe("1 Hour");
    expect(formatPunishmentDuration(10800)).toBe("3 Hours");
    expect(formatPunishmentDuration(86400)).toBe("1 Day");
    expect(formatPunishmentDuration(604800)).toBe("7 Days");
  });

  it("supports compound durations", () => {
    expect(formatPunishmentDuration(90000)).toBe("1 Day 1 Hour");
    expect(formatPunishmentDuration(86460)).toBe("1 Day 1 Minute");
    expect(formatPunishmentDuration(93660)).toBe("1 Day 2 Hours 1 Minute");
    expect(formatPunishmentDuration(3660)).toBe("1 Hour 1 Minute");
  });

  it("handles pluralization properly", () => {
    expect(formatPunishmentDuration(60)).toBe("1 Minute");
    expect(formatPunishmentDuration(120)).toBe("2 Minutes");
    expect(formatPunishmentDuration(3600)).toBe("1 Hour");
    expect(formatPunishmentDuration(7200)).toBe("2 Hours");
    expect(formatPunishmentDuration(86400)).toBe("1 Day");
    expect(formatPunishmentDuration(172800)).toBe("2 Days");
  });

  it("safely returns an empty string for invalid, non-positive, or non-finite inputs", () => {
    expect(formatPunishmentDuration(0)).toBe("");
    expect(formatPunishmentDuration(-100)).toBe("");
    expect(formatPunishmentDuration(null)).toBe("");
    expect(formatPunishmentDuration(undefined)).toBe("");
    expect(formatPunishmentDuration("3600")).toBe("");
    expect(formatPunishmentDuration(NaN)).toBe("");
    expect(formatPunishmentDuration(Infinity)).toBe("");
  });
});

describe("getPunishmentType", () => {
  it("returns matching punishment definition for valid action IDs", () => {
    expect(getPunishmentType("timeout")?.name).toBe("Timeout");
    expect(getPunishmentType("kick")?.name).toBe("Kick");
    expect(getPunishmentType("ban")?.name).toBe("Ban");
    expect(getPunishmentType("tempban")?.name).toBe("Temporary Ban");
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(getPunishmentType("  TIMEOUT  ")?.id).toBe("timeout");
    expect(getPunishmentType("TempBan")?.id).toBe("tempban");
    expect(getPunishmentType("KICK")?.id).toBe("kick");
  });

  it("returns null for unknown, missing, or invalid types", () => {
    expect(getPunishmentType("warn")).toBeNull();
    expect(getPunishmentType("mute")).toBeNull();
    expect(getPunishmentType("")).toBeNull();
    expect(getPunishmentType(null)).toBeNull();
    expect(getPunishmentType(undefined)).toBeNull();
    expect(getPunishmentType(123)).toBeNull();
    expect(getPunishmentType({})).toBeNull();
  });
});

describe("isValidPunishmentType", () => {
  it("returns true for registered punishment IDs", () => {
    expect(isValidPunishmentType("timeout")).toBe(true);
    expect(isValidPunishmentType("kick")).toBe(true);
    expect(isValidPunishmentType("ban")).toBe(true);
    expect(isValidPunishmentType("tempban")).toBe(true);
  });

  it("returns false for unregistered or invalid IDs", () => {
    expect(isValidPunishmentType("mute")).toBe(false);
    expect(isValidPunishmentType("warn")).toBe(false);
    expect(isValidPunishmentType(null)).toBe(false);
    expect(isValidPunishmentType(undefined)).toBe(false);
    expect(isValidPunishmentType("")).toBe(false);
  });
});

describe("getDurationOptionsForPunishment", () => {
  it("returns duration options for punishments requiring duration", () => {
    const timeoutOpts = getDurationOptionsForPunishment("timeout");
    expect(timeoutOpts.length).toBe(12);

    const tempbanOpts = getDurationOptionsForPunishment("tempban");
    expect(tempbanOpts.length).toBe(12);
  });

  it("returns an empty array for actions without duration", () => {
    expect(getDurationOptionsForPunishment("kick")).toEqual([]);
    expect(getDurationOptionsForPunishment("ban")).toEqual([]);
    expect(getDurationOptionsForPunishment("unknown")).toEqual([]);
    expect(getDurationOptionsForPunishment(null)).toEqual([]);
  });
});

describe("isValidPunishmentDuration", () => {
  it("validates timeout durations", () => {
    expect(isValidPunishmentDuration("timeout", 300)).toBe(true);
    expect(isValidPunishmentDuration("timeout", 2419200)).toBe(true); // 28 days
    expect(isValidPunishmentDuration("timeout", 2419201)).toBe(false); // exceeds 28 days
    expect(isValidPunishmentDuration("timeout", 0)).toBe(false);
    expect(isValidPunishmentDuration("timeout", -60)).toBe(false);
    expect(isValidPunishmentDuration("timeout", null)).toBe(false);
    expect(isValidPunishmentDuration("timeout", 3600.5)).toBe(false); // non-integer
  });

  it("validates tempban durations", () => {
    expect(isValidPunishmentDuration("tempban", 86400)).toBe(true);
    expect(isValidPunishmentDuration("tempban", 0)).toBe(false);
    expect(isValidPunishmentDuration("tempban", null)).toBe(false);
  });

  it("validates non-duration punishments (kick, ban)", () => {
    expect(isValidPunishmentDuration("kick", null)).toBe(true);
    expect(isValidPunishmentDuration("kick", undefined)).toBe(true);
    expect(isValidPunishmentDuration("kick", 0)).toBe(true);
    expect(isValidPunishmentDuration("kick", 3600)).toBe(false);

    expect(isValidPunishmentDuration("ban", null)).toBe(true);
    expect(isValidPunishmentDuration("ban", undefined)).toBe(true);
    expect(isValidPunishmentDuration("ban", 0)).toBe(true);
    expect(isValidPunishmentDuration("ban", 86400)).toBe(false);
  });

  it("returns false for unknown punishment types", () => {
    expect(isValidPunishmentDuration("invalid", 3600)).toBe(false);
    expect(isValidPunishmentDuration(null, 3600)).toBe(false);
  });
});

describe("findNextUnusedThreshold", () => {
  it("finds next available threshold after lastUsed", () => {
    const rules = [{ warn_count: 1 }, { warn_count: 2 }, { warn_count: 3 }, { warn_count: 5 }];
    expect(findNextUnusedThreshold(rules, 3)).toBe(4);
  });

  it("continues searching if immediate next is occupied", () => {
    const rules = [
      { warn_count: 1 },
      { warn_count: 2 },
      { warn_count: 3 },
      { warn_count: 4 },
      { warn_count: 5 },
      { warn_count: 7 },
    ];
    expect(findNextUnusedThreshold(rules, 3)).toBe(6);
  });

  it("wraps around to the beginning if all thresholds above lastUsed are occupied", () => {
    const rules = [{ warn_count: 98 }, { warn_count: 99 }, { warn_count: 100 }];
    expect(findNextUnusedThreshold(rules, 98)).toBe(1);
  });

  it("wraps around when lastUsed is 100", () => {
    const rules = [{ warn_count: 100 }];
    expect(findNextUnusedThreshold(rules, 100)).toBe(1);
  });

  it("returns null when all thresholds between 1 and 100 are occupied", () => {
    const fullRules = Array.from({ length: 100 }, (_, i) => ({ warn_count: i + 1 }));
    expect(findNextUnusedThreshold(fullRules, 50)).toBeNull();
    expect(findNextUnusedThreshold(fullRules, 100)).toBeNull();
  });

  it("safely handles empty or missing rules array", () => {
    expect(findNextUnusedThreshold([], 3)).toBe(4);
    expect(findNextUnusedThreshold(null, 3)).toBe(4);
    expect(findNextUnusedThreshold(undefined, 3)).toBe(4);
  });

  it("safely handles invalid lastUsed values", () => {
    const rules = [{ warn_count: 1 }];
    expect(findNextUnusedThreshold(rules, null)).toBe(2);
    expect(findNextUnusedThreshold(rules, undefined)).toBe(2);
    expect(findNextUnusedThreshold(rules, NaN)).toBe(2);
    expect(findNextUnusedThreshold(rules, "not-a-number")).toBe(2);
    expect(findNextUnusedThreshold(rules, -10)).toBe(2);
    expect(findNextUnusedThreshold(rules, 0)).toBe(2);
  });

  it("safely extracts warn_count, warnCount, or plain numbers", () => {
    const mixedRules = [{ warn_count: 1 }, { warnCount: 2 }, 3, null, undefined, "4"];
    expect(findNextUnusedThreshold(mixedRules, 2)).toBe(5);
  });

  it("enforces threshold bounds between 1 and 100", () => {
    expect(MIN_WARNING_THRESHOLD).toBe(1);
    expect(MAX_WARNING_THRESHOLD).toBe(100);
    const result = findNextUnusedThreshold([], 0);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(100);
  });
});
