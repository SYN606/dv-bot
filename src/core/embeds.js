import { EmbedBuilder } from "discord.js";
import { EMOJIS } from "./emojis.js";

export const COLORS = {
  INFO: 0x2b2d31,       // Charcoal
  PRIMARY: 0x5865f2,    // Blurple
  SECONDARY: 0x4e5058,  // Slate Grey
  SUCCESS: 0x57f287,    // Emerald
  WARNING: 0xfee75c,    // Amber Yellow
  ERROR: 0xed4245,      // Vivid Crimson
  DEBUG: 0x5865f2,      // Blurple
  SYSTEM: 0x9b59b6,     // Royal Purple
  MODERATION: 0xe67e22, // Warm Bronze
  ANALYTICS: 0x00e5ff,  // Neon Aqua
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

function safeTruncate(text, limit) {
  if (!text) return null;
  const str = String(text).trim();
  if (!str) return null;
  return str.length > limit ? `${str.slice(0, limit - 3)}...` : str;
}

export function makeEmbed(options = {}) {
  const {
    title,
    description,
    level = "INFO",
    color,
    footer,
    footerIcon,
    headerDivider = true,
    authorName,
    authorIcon,
    authorUrl,
    thumbnail,
    image,
    timestamp = false,
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

  // Description formatting with header divider line
  let formattedDesc = description ? String(description).trim() : "";
  if (headerDivider) {
    formattedDesc = formattedDesc ? `${DIVIDER_LINE}\n\n${formattedDesc}` : DIVIDER_LINE;
  }
  formattedDesc = safeTruncate(formattedDesc, LIMITS.DESCRIPTION);

  const embed = new EmbedBuilder().setColor(embedColor);

  if (formattedTitle) embed.setTitle(formattedTitle);
  if (formattedDesc) embed.setDescription(formattedDesc);

  if (footer) {
    const footerText = safeTruncate(footer, LIMITS.FOOTER);
    embed.setFooter({ text: footerText, iconURL: footerIcon });
  }

  if (authorName) {
    const name = safeTruncate(authorName, LIMITS.AUTHOR);
    embed.setAuthor({ name, iconURL: authorIcon, url: authorUrl });
  }

  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);
  if (timestamp) embed.setTimestamp(timestamp instanceof Date ? timestamp : new Date());

  return embed;
}

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
