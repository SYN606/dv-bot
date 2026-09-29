export const PUNISHMENT_TYPES = [
  {
    id: "timeout",
    name: "Timeout",
    desc: "Temporarily prevent the member from chatting.",
    hasDuration: true,
  },
  {
    id: "kick",
    name: "Kick",
    desc: "Remove the member from the server.",
    hasDuration: false,
  },
  {
    id: "ban",
    name: "Ban",
    desc: "Ban the member from the server.",
    hasDuration: false,
  },
  {
    id: "tempban",
    name: "Tempban",
    desc: "Temporarily ban the member.",
    hasDuration: true,
  },
];

export const DURATION_OPTIONS = [
  { value: 300, label: "5 Minutes" },
  { value: 3600, label: "1 Hour" },
  { value: 10800, label: "3 Hours" },
  { value: 86400, label: "1 Day" },
  { value: 259200, label: "3 Days" },
  { value: 604800, label: "7 Days" },
  { value: 1209600, label: "14 Days" },
];

export function formatPunishmentDuration(seconds) {
  if (!seconds || seconds <= 0) return "";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor(seconds / 60);
  if (days > 0) return `${days} Day${days !== 1 ? "s" : ""}`;
  if (hours > 0) return `${hours} Hour${hours !== 1 ? "s" : ""}`;
  return `${mins} Minute${mins !== 1 ? "s" : ""}`;
}

export function getPunishmentType(actionType) {
  return PUNISHMENT_TYPES.find(p => p.id === actionType) || PUNISHMENT_TYPES[0];
}

export function findNextUnusedThreshold(existingRules, lastUsed) {
  const existingCounts = new Set(existingRules.map(r => r.warn_count));
  let next = lastUsed + 1;
  while (existingCounts.has(next) && next <= 100) {
    next++;
  }
  return Math.min(next, 100);
}
