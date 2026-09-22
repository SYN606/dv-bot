import { EmbedBuilder } from "discord.js";
import { EMOJIS } from "./emojis.js";

export const COLORS = {
  INFO: 0x2b2d31,       // Charcoal Obsidian
  PRIMARY: 0x5865f2,    // Blurple / Modern Indigo
  SECONDARY: 0x4e5058,  // Slate Grey
  SUCCESS: 0x57f287,    // Luminous Emerald
  WARNING: 0xfee75c,    // Warm Amber Yellow
  ERROR: 0xed4245,      // Vivid Crimson Rose
  DEBUG: 0x5865f2,      // Blurple
  SYSTEM: 0x9b59b6,     // Royal Amethyst
  MODERATION: 0xe67e22, // Warm Bronze
  ANALYTICS: 0x00e5ff,  // Neon Cyber Aqua
  PREMIUM: 0xeb459e,    // Hot Fuchsia
  DARK: 0x1e1f22,       // Discord Native Graphite
};

export const SEVERITY_EMOJI_MAP = {
  INFO: "announcement",
  PRIMARY: "announcement",
  SECONDARY: "developer",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "fail",
  DEBUG: "developer",
  SYSTEM: "okay",
  MODERATION: "moderation",
  ANALYTICS: "neonblue_arrow",
  PREMIUM: "premium",
};

export const DIVIDER_LINE = "───────────────────────────────";

export const LIMITS = {
  TITLE: 256,
  DESCRIPTION: 4096,
  FIELD_NAME: 256,
  FIELD_VALUE: 1024,
  FOOTER: 2048,
  AUTHOR: 256,
  MAX_FIELDS: 25,
  TOTAL: 6000,
};

/**
 * Safely truncate strings to Discord API embed limits
 */
export function safeTruncate(text, limit) {
  if (text === null || text === undefined) return null;
  const str = String(text).trim();
  if (!str) return null;
  return str.length > limit ? `${str.slice(0, limit - 3)}...` : str;
}

/**
 * Modern markdown formatting helper primitives
 */
export const md = {
  bold: (text) => `**${text}**`,
  italic: (text) => `*${text}*`,
  code: (text) => `\`${text}\``,
  codeBlock: (text, lang = "") => `\`\`\`${lang}\n${text}\n\`\`\``,
  quote: (text) =>
    String(text)
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n"),
  subtext: (text) => `-# ${text}`,
  time: (date = new Date(), format = "R") => {
    const ts = Math.floor((date instanceof Date ? date : new Date(date)).getTime() / 1000);
    return `<t:${ts}:${format}>`;
  },
  channel: (id) => `<#${id}>`,
  user: (id) => `<@${id}>`,
  role: (id) => `<@&${id}>`,
};

/**
 * Core universal embed builder matching modern Discord bot UI aesthetics.
 */
export function makeEmbed(options = {}) {
  const {
    title,
    description,
    level = "INFO",
    color,
    footer,
    footerIcon,
    headerDivider = true,
    author,
    authorName,
    authorIcon,
    authorUrl,
    thumbnail,
    image,
    timestamp = false,
    fields = [],
    quote = false,
    subtext = null,
  } = options;

  const normalizedLevel = (level || "INFO").toUpperCase();
  const embedColor = color ?? COLORS[normalizedLevel] ?? COLORS.INFO;

  // Title formatting with severity emoji
  let formattedTitle = null;
  if (title) {
    const emojiKey = SEVERITY_EMOJI_MAP[normalizedLevel] || "announcement";
    const emoji = EMOJIS.get(emojiKey);
    formattedTitle = emoji ? `${emoji} ${title}` : title;
    formattedTitle = safeTruncate(formattedTitle, LIMITS.TITLE);
  }

  // Description formatting with header divider line and blockquote support
  let formattedDesc = description ? String(description).trim() : "";
  if (quote && formattedDesc) {
    formattedDesc = md.quote(formattedDesc);
  }
  if (subtext) {
    formattedDesc = formattedDesc ? `${formattedDesc}\n\n${md.subtext(subtext)}` : md.subtext(subtext);
  }
  if (headerDivider) {
    formattedDesc = formattedDesc ? `${DIVIDER_LINE}\n\n${formattedDesc}` : DIVIDER_LINE;
  }
  formattedDesc = safeTruncate(formattedDesc, LIMITS.DESCRIPTION);

  const embed = new EmbedBuilder().setColor(embedColor);

  if (formattedTitle) embed.setTitle(formattedTitle);
  if (formattedDesc) embed.setDescription(formattedDesc);

  // Author Resolution
  const resolvedAuthorName = author?.name || authorName;
  const resolvedAuthorIcon = author?.iconURL || authorIcon;
  const resolvedAuthorUrl = author?.url || authorUrl;
  if (resolvedAuthorName) {
    const name = safeTruncate(resolvedAuthorName, LIMITS.AUTHOR);
    embed.setAuthor({
      name,
      iconURL: resolvedAuthorIcon,
      url: resolvedAuthorUrl,
    });
  }

  // Fields Resolution with automatic sanitization
  if (Array.isArray(fields) && fields.length > 0) {
    for (const field of fields.slice(0, LIMITS.MAX_FIELDS)) {
      if (!field || typeof field !== "object") continue;
      const rawName = field.name !== undefined ? String(field.name) : "";
      const rawValue = field.value !== undefined ? String(field.value) : "";
      embed.addFields({
        name: safeTruncate(rawName || "\u200b", LIMITS.FIELD_NAME),
        value: safeTruncate(rawValue || "\u200b", LIMITS.FIELD_VALUE) || "\u200b",
        inline: field.inline ?? false,
      });
    }
  }

  // Footer Resolution
  const resolvedFooterText = typeof footer === "object" ? footer?.text : footer;
  const resolvedFooterIcon = typeof footer === "object" ? footer?.iconURL : footerIcon;
  if (resolvedFooterText) {
    const footerText = safeTruncate(resolvedFooterText, LIMITS.FOOTER);
    embed.setFooter({ text: footerText, iconURL: resolvedFooterIcon });
  }

  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (timestamp) {
    embed.setTimestamp(timestamp instanceof Date ? timestamp : new Date());
  }

  return embed;
}

/**
 * Pre-configured level builders
 */
export function successEmbed(title, description, options = {}) {
  return makeEmbed({ title, description, level: "SUCCESS", ...options });
}

export function errorEmbed(title, description, options = {}) {
  return makeEmbed({ title, description, level: "ERROR", ...options });
}

export function warningEmbed(title, description, options = {}) {
  return makeEmbed({ title, description, level: "WARNING", ...options });
}

export function infoEmbed(title, description, options = {}) {
  return makeEmbed({ title, description, level: "INFO", ...options });
}

/**
 * Formats a clean list of key-value attributes
 */
export function keyValueEmbed(title, pairs = [], options = {}) {
  const embed = makeEmbed({ title, level: "INFO", ...options });
  for (const [key, value] of pairs.slice(0, LIMITS.MAX_FIELDS)) {
    embed.addFields({
      name: safeTruncate(`**${key}**`, LIMITS.FIELD_NAME),
      value: safeTruncate(String(value), LIMITS.FIELD_VALUE) || "\u200b",
      inline: options.inline ?? false,
    });
  }
  return embed;
}

/**
 * Modern High-Fidelity Moderation Action Embed
 */
export function moderationEmbed({
  action = "MODERATION",
  targetUser = null,
  moderator = null,
  reason = "No reason specified.",
  duration = null,
  extraFields = [],
  thumbnail = null,
  timestamp = true,
  ...options
}) {
  const targetTag = targetUser
    ? `${targetUser.tag || targetUser.username || "User"} (\`${targetUser.id}\`)`
    : "Unknown Member";

  const modTag = moderator
    ? `${moderator.tag || moderator.username || "Moderator"} (\`${moderator.id}\`)`
    : "System Automation";

  const resolvedThumb = thumbnail || targetUser?.displayAvatarURL?.() || null;

  const fields = [
    { name: "👤 **Target Member**", value: targetTag, inline: true },
    { name: "🛡️ **Moderator**", value: modTag, inline: true },
  ];

  if (duration) {
    fields.push({ name: "⏳ **Duration**", value: `\`${duration}\``, inline: true });
  }

  fields.push({
    name: "📋 **Reason**",
    value: `> ${reason}`,
    inline: false,
  });

  if (Array.isArray(extraFields)) {
    fields.push(...extraFields);
  }

  return makeEmbed({
    title: `Moderation Action • ${action.toUpperCase()}`,
    level: "MODERATION",
    thumbnail: resolvedThumb,
    timestamp,
    fields,
    ...options,
  });
}

/**
 * Modern Telemetry / Metrics Card Embed
 */
export function metricCardEmbed({
  title,
  description,
  metrics = [],
  level = "ANALYTICS",
  ...options
}) {
  const fields = metrics.map((m) => ({
    name: `• **${m.label}**`,
    value: m.monospace !== false ? `\`${m.value}\`` : String(m.value),
    inline: m.inline ?? true,
  }));

  return makeEmbed({
    title,
    description,
    level,
    fields,
    ...options,
  });
}

/**
 * Card Embed with Author Badge
 */
export function cardEmbed({
  title,
  subtitle,
  badge,
  description,
  fields = [],
  level = "PRIMARY",
  ...options
}) {
  let authorConfig = options.author;
  if (!authorConfig && (badge || subtitle)) {
    authorConfig = {
      name: badge ? `[${badge.toUpperCase()}] ${subtitle || ""}`.trim() : subtitle,
      iconURL: options.authorIcon,
    };
  }

  return makeEmbed({
    title,
    description,
    author: authorConfig,
    level,
    fields,
    ...options,
  });
}
