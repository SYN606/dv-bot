import { Guild, User } from "../models/coreModels.js";
import { logger } from "../../utils/logger.js";

/**
 * Curated list of popular, recognized IANA timezones spanning all global regions
 */
export const COMMON_TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)", region: "Global" },
  
  // Americas
  { value: "America/New_York", label: "US Eastern Time (New York, Miami, Atlanta)", region: "North America" },
  { value: "America/Chicago", label: "US Central Time (Chicago, Dallas, Houston)", region: "North America" },
  { value: "America/Denver", label: "US Mountain Time (Denver, Phoenix, Salt Lake City)", region: "North America" },
  { value: "America/Los_Angeles", label: "US Pacific Time (Los Angeles, SF, Seattle)", region: "North America" },
  { value: "America/Anchorage", label: "Alaska Time (Anchorage)", region: "North America" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (Honolulu)", region: "North America" },
  { value: "America/Toronto", label: "Canada Eastern Time (Toronto, Montreal, Ottawa)", region: "North America" },
  { value: "America/Vancouver", label: "Canada Pacific Time (Vancouver)", region: "North America" },
  { value: "America/Sao_Paulo", label: "Brazil Time (São Paulo, Rio de Janeiro)", region: "South America" },
  { value: "America/Buenos_Aires", label: "Argentina Time (Buenos Aires)", region: "South America" },
  { value: "America/Santiago", label: "Chile Time (Santiago)", region: "South America" },
  { value: "America/Mexico_City", label: "Mexico Central Time (Mexico City)", region: "North America" },

  // Europe
  { value: "Europe/London", label: "Western European / GMT (London, Dublin, Lisbon)", region: "Europe" },
  { value: "Europe/Paris", label: "Central European Time (Paris, Brussels, Madrid)", region: "Europe" },
  { value: "Europe/Berlin", label: "Central European Time (Berlin, Frankfurt, Munich)", region: "Europe" },
  { value: "Europe/Rome", label: "Central European Time (Rome, Milan)", region: "Europe" },
  { value: "Europe/Amsterdam", label: "Central European Time (Amsterdam)", region: "Europe" },
  { value: "Europe/Athens", label: "Eastern European Time (Athens, Bucharest, Sofia)", region: "Europe" },
  { value: "Europe/Istanbul", label: "Turkey Time (Istanbul)", region: "Europe" },
  { value: "Europe/Moscow", label: "Moscow Standard Time (Moscow, St. Petersburg)", region: "Europe" },

  // Middle East & Africa
  { value: "Asia/Dubai", label: "Gulf Standard Time (Dubai, Abu Dhabi, Muscat)", region: "Middle East" },
  { value: "Asia/Riyadh", label: "Arabia Standard Time (Riyadh, Kuwait)", region: "Middle East" },
  { value: "Asia/Jerusalem", label: "Israel Time (Jerusalem, Tel Aviv)", region: "Middle East" },
  { value: "Africa/Cairo", label: "Egypt Time (Cairo)", region: "Africa" },
  { value: "Africa/Johannesburg", label: "South Africa Time (Johannesburg, Cape Town)", region: "Africa" },
  { value: "Africa/Lagos", label: "West Africa Time (Lagos)", region: "Africa" },
  { value: "Africa/Nairobi", label: "East Africa Time (Nairobi)", region: "Africa" },

  // Asia & Oceania
  { value: "Asia/Kolkata", label: "India Standard Time (IST - New Delhi, Mumbai, Bengaluru)", region: "Asia" },
  { value: "Asia/Karachi", label: "Pakistan Standard Time (Karachi, Islamabad)", region: "Asia" },
  { value: "Asia/Dhaka", label: "Bangladesh Standard Time (Dhaka)", region: "Asia" },
  { value: "Asia/Bangkok", label: "Indochina Time (Bangkok, Hanoi, Jakarta)", region: "Asia" },
  { value: "Asia/Singapore", label: "Singapore Standard Time (Singapore)", region: "Asia" },
  { value: "Asia/Hong_Kong", label: "Hong Kong Time (Hong Kong)", region: "Asia" },
  { value: "Asia/Shanghai", label: "China Standard Time (Beijing, Shanghai)", region: "Asia" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST - Tokyo, Osaka)", region: "Asia" },
  { value: "Asia/Seoul", label: "Korea Standard Time (KST - Seoul)", region: "Asia" },
  { value: "Australia/Perth", label: "Australian Western Time (Perth)", region: "Australia" },
  { value: "Australia/Adelaide", label: "Australian Central Time (Adelaide)", region: "Australia" },
  { value: "Australia/Sydney", label: "Australian Eastern Time (Sydney, Canberra, Melbourne)", region: "Australia" },
  { value: "Pacific/Auckland", label: "New Zealand Standard Time (Auckland, Wellington)", region: "Pacific" },
];

/**
 * Validates whether an IANA timezone string is recognized by the V8/Intl engine
 */
export function isValidTimezone(tz?: string | null): boolean {
  if (!tz || typeof tz !== "string") return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Computes human-readable GMT/UTC offset string, e.g. "GMT+5:30" or "GMT-4:00"
 */
export function getTimezoneOffsetString(tz: string, date: Date = new Date()): string {
  if (!isValidTimezone(tz)) return "UTC+0";
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    }).formatToParts(date);
    const tzPart = parts.find((p) => p.type === "timeZoneName");
    return tzPart ? tzPart.value : "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * Formats a Date/timestamp into a human-readable string in the specified timezone
 */
export function formatInTimezone(
  date: Date | number | string = new Date(),
  tz: string = "UTC",
  options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "medium",
  }
): string {
  const d = date instanceof Date ? date : new Date(date);
  const targetTz = isValidTimezone(tz) ? tz.trim() : "UTC";
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: targetTz,
      ...options,
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

/**
 * Retrieves the configured timezone for a guild (defaults to "UTC")
 */
export async function getGuildTimezone(guildId: string): Promise<string> {
  if (!guildId) return "UTC";
  try {
    const record = await Guild.findByPk(String(guildId));
    if (record?.timezone && isValidTimezone(record.timezone)) {
      return String(record.timezone).trim();
    }
  } catch (err: any) {
    logger.warn(`[TIMEZONE] Failed fetching timezone for guild ${guildId}:`, err?.message);
  }
  return "UTC";
}

/**
 * Updates the configured timezone for a guild
 */
export async function setGuildTimezone(guildId: string, timezone: string): Promise<boolean> {
  const cleanTz = timezone?.trim();
  if (!guildId || !isValidTimezone(cleanTz)) return false;

  try {
    const [record, created]: any = await Guild.findOrCreate({
      where: { guild_id: String(guildId) },
      defaults: { guild_id: String(guildId), timezone: cleanTz },
    });

    if (!created && record) {
      if (typeof record.update === "function") {
        await record.update({ timezone: cleanTz });
      } else {
        await Guild.update({ timezone: cleanTz }, { where: { guild_id: String(guildId) } });
      }
    }
    return true;
  } catch (err: any) {
    logger.error(`[TIMEZONE] Failed setting timezone for guild ${guildId}:`, err);
    return false;
  }
}

/**
 * Retrieves the personal timezone for a user (or null if not configured)
 */
export async function getUserTimezone(userId: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const record = await User.findByPk(String(userId));
    if (record?.timezone && isValidTimezone(record.timezone)) {
      return String(record.timezone).trim();
    }
  } catch (err: any) {
    logger.warn(`[TIMEZONE] Failed fetching timezone for user ${userId}:`, err?.message);
  }
  return null;
}

/**
 * Updates the personal timezone for a user
 */
export async function setUserTimezone(userId: string, timezone: string): Promise<boolean> {
  const cleanTz = timezone?.trim();
  if (!userId || !isValidTimezone(cleanTz)) return false;

  try {
    const [record, created]: any = await User.findOrCreate({
      where: { user_id: String(userId) },
      defaults: { user_id: String(userId), timezone: cleanTz },
    });

    if (!created && record) {
      if (typeof record.update === "function") {
        await record.update({ timezone: cleanTz });
      } else {
        await User.update({ timezone: cleanTz }, { where: { user_id: String(userId) } });
      }
    }
    return true;
  } catch (err: any) {
    logger.error(`[TIMEZONE] Failed setting timezone for user ${userId}:`, err);
    return false;
  }
}
