export interface TimezoneOption {
  value: string;
  label: string;
  region: string;
}

export const POPULAR_TIMEZONES: TimezoneOption[] = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)", region: "Global" },
  { value: "America/New_York", label: "US Eastern (New York, Miami, Atlanta)", region: "North America" },
  { value: "America/Chicago", label: "US Central (Chicago, Dallas, Houston)", region: "North America" },
  { value: "America/Denver", label: "US Mountain (Denver, Phoenix, Salt Lake)", region: "North America" },
  { value: "America/Los_Angeles", label: "US Pacific (Los Angeles, SF, Seattle)", region: "North America" },
  { value: "America/Toronto", label: "Canada Eastern (Toronto, Montreal)", region: "North America" },
  { value: "America/Vancouver", label: "Canada Pacific (Vancouver)", region: "North America" },
  { value: "America/Sao_Paulo", label: "Brazil Time (São Paulo, Rio)", region: "South America" },
  { value: "Europe/London", label: "UK / GMT (London, Dublin, Lisbon)", region: "Europe" },
  { value: "Europe/Paris", label: "Central Europe (Paris, Madrid, Rome)", region: "Europe" },
  { value: "Europe/Berlin", label: "Central Europe (Berlin, Frankfurt, Munich)", region: "Europe" },
  { value: "Europe/Amsterdam", label: "Central Europe (Amsterdam, Brussels)", region: "Europe" },
  { value: "Europe/Istanbul", label: "Turkey (Istanbul)", region: "Europe" },
  { value: "Europe/Moscow", label: "Moscow Standard Time (Moscow)", region: "Europe" },
  { value: "Africa/Cairo", label: "Egypt Time (Cairo)", region: "Africa" },
  { value: "Africa/Johannesburg", label: "South Africa (Johannesburg, Cape Town)", region: "Africa" },
  { value: "Asia/Dubai", label: "Gulf Time (Dubai, Abu Dhabi)", region: "Middle East" },
  { value: "Asia/Riyadh", label: "Arabia Standard (Riyadh, Kuwait)", region: "Middle East" },
  { value: "Asia/Kolkata", label: "India Standard Time (IST - New Delhi, Mumbai)", region: "Asia" },
  { value: "Asia/Karachi", label: "Pakistan Standard Time (Karachi)", region: "Asia" },
  { value: "Asia/Dhaka", label: "Bangladesh Time (Dhaka)", region: "Asia" },
  { value: "Asia/Bangkok", label: "Indochina Time (Bangkok, Jakarta)", region: "Asia" },
  { value: "Asia/Singapore", label: "Singapore Time (Singapore)", region: "Asia" },
  { value: "Asia/Hong_Kong", label: "Hong Kong Time (Hong Kong)", region: "Asia" },
  { value: "Asia/Tokyo", label: "Japan Standard Time (JST - Tokyo)", region: "Asia" },
  { value: "Asia/Seoul", label: "Korea Standard Time (KST - Seoul)", region: "Asia" },
  { value: "Australia/Perth", label: "Western Australia (Perth)", region: "Australia" },
  { value: "Australia/Sydney", label: "Eastern Australia (Sydney, Melbourne)", region: "Australia" },
  { value: "Pacific/Auckland", label: "New Zealand (Auckland, Wellington)", region: "Pacific" },
];

/**
 * Format a date or timestamp string into the specified timezone.
 */
export function formatInTimezone(
  dateInput: string | number | Date,
  timeZone: string = "UTC",
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone || "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      ...options,
    }).format(date);
  } catch {
    try {
      return new Date(dateInput).toLocaleString();
    } catch {
      return String(dateInput);
    }
  }
}

/**
 * Format date in a shorter human-friendly style in the target timezone
 * e.g., "Nov 5, 2026, 08:35 PM"
 */
export function formatTimezoneShort(
  dateInput: string | number | Date,
  timeZone: string = "UTC"
): string {
  return formatInTimezone(dateInput, timeZone, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format relative time (e.g., "5m ago", "Just now")
 */
export function formatRelativeTime(dateInput: string | number | Date): string {
  try {
    const diff = Date.now() - new Date(dateInput).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateInput).toLocaleDateString();
  } catch {
    return String(dateInput);
  }
}
