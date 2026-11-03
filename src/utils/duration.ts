/**
 * Duration parsing and formatting utilities
 */

/**
 * Parses a human-readable duration string (e.g. "30s", "10m", "2h", "7d", "2w") into seconds.
 * Returns null if the format is invalid or undefined.
 */
export function parseDuration(str: string | null | undefined): number | null {
  if (!str) return null;
  const match = String(str).trim().match(/^(\d+)\s*([smhdw])$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  if (isNaN(num) || num <= 0) return null;
  switch (unit) {
    case "s": return num;
    case "m": return num * 60;
    case "h": return num * 3600;
    case "d": return num * 86400;
    case "w": return num * 604800;
    default: return null;
  }
}

/**
 * Formats a duration in seconds into human-readable string (e.g. "2 days", "3 hours", "10 minutes").
 */
export function formatDuration(seconds: number): string {
  if (seconds >= 86400) {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days > 1 ? "s" : ""}`;
  }
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours > 1 ? "s" : ""}`;
  }
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? "s" : ""}`;
  }
  return `${seconds} second${seconds !== 1 ? "s" : ""}`;
}
