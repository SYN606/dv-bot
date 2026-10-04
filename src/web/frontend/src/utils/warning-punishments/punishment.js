/**
 * @file punishment.js
 * Utility definitions, metadata, validation, and threshold helpers
 * for the Warning Punishments moderation system.
 */

// Time unit conversion constants in seconds
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_DAY = 86400;
export const SECONDS_PER_WEEK = 604800;

// Discord timeout limit (28 days maximum)
export const MAX_TIMEOUT_DURATION = 28 * SECONDS_PER_DAY;

// Warning count bounds
export const MIN_WARNING_THRESHOLD = 1;
export const MAX_WARNING_THRESHOLD = 100;

/**
 * Supported punishment action definitions with comprehensive metadata.
 */
export const PUNISHMENT_TYPES = Object.freeze([
  Object.freeze({
    id: "timeout",
    name: "Timeout",
    description: "Temporarily prevent the member from chatting or reacting in channels.",
    desc: "Temporarily prevent the member from chatting or reacting in channels.",
    requiresDuration: true,
    hasDuration: true,
    isPermanent: false,
    defaultDuration: 1 * SECONDS_PER_HOUR,
  }),
  Object.freeze({
    id: "kick",
    name: "Kick",
    description: "Remove the member from the server. They may rejoin with a valid invite.",
    desc: "Remove the member from the server. They may rejoin with a valid invite.",
    requiresDuration: false,
    hasDuration: false,
    isPermanent: false,
    defaultDuration: null,
  }),
  Object.freeze({
    id: "ban",
    name: "Ban",
    description: "Permanently ban the member from the server.",
    desc: "Permanently ban the member from the server.",
    requiresDuration: false,
    hasDuration: false,
    isPermanent: true,
    defaultDuration: null,
  }),
  Object.freeze({
    id: "tempban",
    name: "Temporary Ban",
    description: "Temporarily ban the member from the server for a set duration.",
    desc: "Temporarily ban the member from the server for a set duration.",
    requiresDuration: true,
    hasDuration: true,
    isPermanent: false,
    defaultDuration: 1 * SECONDS_PER_DAY,
  }),
]);

/**
 * Standard selectable duration options for temporary punishments (values in seconds).
 */
export const DURATION_OPTIONS = Object.freeze([
  Object.freeze({ value: 5 * SECONDS_PER_MINUTE, label: "5 Minutes" }),
  Object.freeze({ value: 10 * SECONDS_PER_MINUTE, label: "10 Minutes" }),
  Object.freeze({ value: 30 * SECONDS_PER_MINUTE, label: "30 Minutes" }),
  Object.freeze({ value: 1 * SECONDS_PER_HOUR, label: "1 Hour" }),
  Object.freeze({ value: 3 * SECONDS_PER_HOUR, label: "3 Hours" }),
  Object.freeze({ value: 6 * SECONDS_PER_HOUR, label: "6 Hours" }),
  Object.freeze({ value: 12 * SECONDS_PER_HOUR, label: "12 Hours" }),
  Object.freeze({ value: 1 * SECONDS_PER_DAY, label: "1 Day" }),
  Object.freeze({ value: 3 * SECONDS_PER_DAY, label: "3 Days" }),
  Object.freeze({ value: 7 * SECONDS_PER_DAY, label: "7 Days" }),
  Object.freeze({ value: 14 * SECONDS_PER_DAY, label: "14 Days" }),
  Object.freeze({ value: 28 * SECONDS_PER_DAY, label: "28 Days" }),
]);

/**
 * Formats a duration in seconds into a clean, human-readable string.
 * Supports single-unit and compound durations (e.g. "5 Minutes", "1 Day", "1 Day 1 Hour").
 * Returns an empty string for invalid, non-positive, or non-finite inputs.
 *
 * @param {number} seconds - The duration in seconds.
 * @returns {string} Human-readable duration or empty string if invalid.
 */
export function formatPunishmentDuration(seconds) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return "";
  }

  const total = Math.floor(seconds);
  const days = Math.floor(total / SECONDS_PER_DAY);
  let remainder = total % SECONDS_PER_DAY;

  const hours = Math.floor(remainder / SECONDS_PER_HOUR);
  remainder = remainder % SECONDS_PER_HOUR;

  const minutes = Math.floor(remainder / SECONDS_PER_MINUTE);
  const secs = remainder % SECONDS_PER_MINUTE;

  const parts = [];
  if (days > 0) parts.push(`${days} Day${days === 1 ? "" : "s"}`);
  if (hours > 0) parts.push(`${hours} Hour${hours === 1 ? "" : "s"}`);
  if (minutes > 0) parts.push(`${minutes} Minute${minutes === 1 ? "" : "s"}`);
  if (parts.length === 0 && secs > 0) parts.push(`${secs} Second${secs === 1 ? "" : "s"}`);

  return parts.join(" ");
}

/**
 * Looks up a punishment definition by its action ID.
 * Case-insensitive. Returns null for unknown, missing, or invalid types.
 *
 * @param {string} actionType - The punishment action ID (e.g. "timeout", "tempban", "kick", "ban").
 * @returns {object|null} The matching punishment type metadata, or null.
 */
export function getPunishmentType(actionType) {
  if (!actionType || typeof actionType !== "string") {
    return null;
  }
  const normalized = actionType.trim().toLowerCase();
  return PUNISHMENT_TYPES.find((p) => p.id === normalized) || null;
}

/**
 * Checks whether a given action type is a valid registered punishment type.
 *
 * @param {string} type - Action type ID to validate.
 * @returns {boolean} True if recognized, false otherwise.
 */
export function isValidPunishmentType(type) {
  return getPunishmentType(type) !== null;
}

/**
 * Returns the duration options for the given punishment type.
 * Returns an empty array if the punishment action does not support or require a duration.
 *
 * @param {string} type - Punishment type ID.
 * @returns {ReadonlyArray<object>}
 */
export function getDurationOptionsForPunishment(type) {
  const punishment = getPunishmentType(type);
  if (!punishment || !punishment.requiresDuration) {
    return Object.freeze([]);
  }
  return DURATION_OPTIONS;
}

/**
 * Validates whether a duration in seconds is appropriate for the given punishment type.
 * - Actions without duration (kick, ban) must have null, undefined, or 0.
 * - Actions requiring duration (timeout, tempban) must have a positive integer <= max limit.
 *
 * @param {string} type - Punishment type ID.
 * @param {number|null|undefined} seconds - Duration in seconds.
 * @returns {boolean} True if the duration is valid for this action type.
 */
export function isValidPunishmentDuration(type, seconds) {
  const punishment = getPunishmentType(type);
  if (!punishment) return false;

  if (!punishment.requiresDuration) {
    return seconds == null || seconds === 0;
  }

  if (typeof seconds !== "number" || !Number.isInteger(seconds) || seconds <= 0) {
    return false;
  }

  if (punishment.id === "timeout" && seconds > MAX_TIMEOUT_DURATION) {
    return false;
  }

  return true;
}

/**
 * Finds the next available warning threshold between 1 and 100 that is not already occupied.
 * Searches sequentially starting after lastUsed, wrapping around if necessary.
 * Returns null if every valid threshold between 1 and 100 is occupied.
 *
 * @param {Array<object|number>} existingRules - Array of existing rule objects or numbers.
 * @param {number} [lastUsed] - The last-used warning count.
 * @returns {number|null} The next available threshold, or null if all are occupied.
 */
export function findNextUnusedThreshold(existingRules, lastUsed) {
  const occupied = new Set();

  if (Array.isArray(existingRules)) {
    for (const rule of existingRules) {
      if (rule == null) continue;
      const raw = typeof rule === "object" ? (rule.warn_count ?? rule.warnCount) : rule;
      const num = Number(raw);
      if (Number.isInteger(num) && num >= MIN_WARNING_THRESHOLD && num <= MAX_WARNING_THRESHOLD) {
        occupied.add(num);
      }
    }
  }

  const totalAvailable = MAX_WARNING_THRESHOLD - MIN_WARNING_THRESHOLD + 1;
  if (occupied.size >= totalAvailable) {
    return null;
  }

  let startCandidate = MIN_WARNING_THRESHOLD;
  const parsedLast = Number(lastUsed);
  if (Number.isInteger(parsedLast)) {
    startCandidate = Math.max(MIN_WARNING_THRESHOLD, parsedLast + 1);
  }

  // Search forward from startCandidate to MAX_WARNING_THRESHOLD
  for (let candidate = startCandidate; candidate <= MAX_WARNING_THRESHOLD; candidate++) {
    if (!occupied.has(candidate)) {
      return candidate;
    }
  }

  // Wrap around: search from MIN_WARNING_THRESHOLD up to startCandidate - 1
  for (let candidate = MIN_WARNING_THRESHOLD; candidate < startCandidate; candidate++) {
    if (!occupied.has(candidate)) {
      return candidate;
    }
  }

  return null;
}
