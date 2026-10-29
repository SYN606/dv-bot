import { EmbedBuilder } from "discord.js";

/**
 * Returns the ordinal suffix for a number (e.g., 1 -> '1st', 2 -> '2nd', 3 -> '3rd', 4 -> '4th').
 */
export function getOrdinalSuffix(num) {
  const n = Math.abs(parseInt(num, 10)) || 0;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * Calculates human-readable account age (e.g., "5 days old", "3 months old", "2 years old").
 */
export function getAccountAge(createdAt) {
  if (!createdAt) return "Unknown";
  const created = new Date(createdAt).getTime();
  const diffMs = Date.now() - created;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days < 1) return "Created today";
  if (days === 1) return "1 day old";
  if (days < 30) return `${days} days old`;
  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1 month old" : `${months} months old`;
  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  return remainingMonths > 0
    ? `${years}y ${remainingMonths}m old`
    : `${years} years old`;
}

/**
 * Replaces placeholders in template text with actual member/guild data.
 * Supported variables:
 * - {user}
 * - {username}
 * - {tag}
 * - {server}
 * - {memberCount}
 * - {memberCountOrdinal}
 * - {userAvatar}
 * - {serverIcon}
 * - {accountAge}
 */
export function formatWelcomeText(template, member) {
  if (!template || typeof template !== "string") return "";

  const user = member?.user || member;
  const guild = member?.guild;
  const userId = user?.id || member?.id || "0";
  const username = user?.username || member?.displayName || "Member";
  const tag = user?.tag || username;
  const serverName = guild?.name || "Server";
  const memberCount = guild?.memberCount ? String(guild.memberCount) : "1";
  const memberCountOrdinal = getOrdinalSuffix(memberCount);

  let userAvatar = "";
  if (typeof user?.displayAvatarURL === "function") {
    userAvatar = user.displayAvatarURL({ size: 512, forceStatic: false }) || "";
  } else if (user?.avatarUrl) {
    userAvatar = user.avatarUrl;
  } else if (user?.avatar) {
    userAvatar = `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.png?size=512`;
  } else {
    userAvatar = "https://cdn.discordapp.com/embed/avatars/0.png";
  }

  let serverIcon = "";
  if (typeof guild?.iconURL === "function") {
    serverIcon = guild.iconURL({ size: 512 }) || "";
  } else if (guild?.iconUrl) {
    serverIcon = guild.iconUrl;
  } else if (guild?.icon) {
    serverIcon = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=512`;
  }

  const accountAge = user?.createdAt ? getAccountAge(user.createdAt) : "Recently created";

  return template
    .replace(/\{user\}/gi, `<@${userId}>`)
    .replace(/\{username\}/gi, username)
    .replace(/\{tag\}/gi, tag)
    .replace(/\{server\}/gi, serverName)
    .replace(/\{memberCount\}/gi, memberCount)
    .replace(/\{memberCountOrdinal\}/gi, memberCountOrdinal)
    .replace(/\{userAvatar\}/gi, userAvatar)
    .replace(/\{serverIcon\}/gi, serverIcon)
    .replace(/\{accountAge\}/gi, accountAge);
}

/**
 * Safely resolves hex color integer between 0x000000 and 0xFFFFFF.
 */
function parseHexColor(rawColor, fallbackHex = 0x6366f1) {
  if (!rawColor) return fallbackHex;
  const cleanHex = String(rawColor).replace("#", "").trim();
  const parsed = parseInt(cleanHex, 16);
  if (!isNaN(parsed) && parsed >= 0 && parsed <= 0xffffff) {
    return parsed;
  }
  return fallbackHex;
}

/**
 * Validates and safely resolves an image or icon URL.
 */
function resolveSafeUrl(rawUrl, member) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const formatted = formatWelcomeText(rawUrl.trim(), member);
  if (formatted.startsWith("http://") || formatted.startsWith("https://")) {
    return formatted;
  }
  return null;
}

/**
 * Resolves full payload for sending Welcome / Leave / DM messages.
 * Supports modern bot rich embed formatting, author header, fields, thumbnail, banner, footer.
 *
 * @param {object} config - Database record or welcome config object
 * @param {object} member - Discord.js GuildMember or mock member
 * @param {'welcome'|'leave'|'dm'} type - Message type
 * @returns {{ content?: string, embeds: EmbedBuilder[] }}
 */
export function buildWelcomePayload(config, member, type = "welcome") {
  if (!config || !member) return null;

  const isEmbed = type === "welcome"
    ? Boolean(config.welcome_is_embed)
    : type === "leave"
    ? Boolean(config.leave_is_embed)
    : Boolean(config.dm_is_embed);

  const messageText = type === "welcome"
    ? (config.welcome_message || "Hey {user}, welcome to **{server}**!")
    : type === "leave"
    ? (config.leave_message || "{username} has left the server.")
    : (config.dm_message || "Welcome to **{server}**, {username}!");

  const formattedText = formatWelcomeText(messageText, member);

  // 1. Plain Text Mode
  if (!isEmbed) {
    let textContent = formattedText;
    if (type === "welcome" && config.welcome_ping_user && member?.id) {
      if (!textContent.includes(`<@${member.id}>`) && !textContent.includes(`<@!${member.id}>`)) {
        textContent = `<@${member.id}> ${textContent}`;
      }
    }
    return {
      content: textContent || "Welcome to the server!",
      embeds: [],
    };
  }

  // 2. Modern Rich Embed Mode
  const embed = new EmbedBuilder();

  // Color
  const rawColor = type === "welcome"
    ? config.welcome_embed_color
    : type === "leave"
    ? config.leave_embed_color
    : config.dm_embed_color;
  embed.setColor(parseHexColor(rawColor, type === "leave" ? 0xf43f5e : type === "dm" ? 0x10b981 : 0x6366f1));

  // Author Header
  if (type === "welcome" && config.welcome_embed_author) {
    const authorName = formatWelcomeText(config.welcome_embed_author, member).slice(0, 256);
    const authorIcon = resolveSafeUrl(config.welcome_embed_author_icon, member);
    const authorUrl = resolveSafeUrl(config.welcome_embed_author_url, member);
    if (authorName) {
      embed.setAuthor({
        name: authorName,
        iconURL: authorIcon || undefined,
        url: authorUrl || undefined,
      });
    }
  }

  // Title & Title URL
  const rawTitle = type === "welcome"
    ? config.welcome_embed_title
    : type === "leave"
    ? config.leave_embed_title
    : config.dm_embed_title;
  if (rawTitle) {
    const titleText = formatWelcomeText(rawTitle, member).slice(0, 256);
    if (titleText) {
      embed.setTitle(titleText);
      const titleUrl = type === "welcome" ? resolveSafeUrl(config.welcome_embed_title_url, member) : null;
      if (titleUrl) {
        embed.setURL(titleUrl);
      }
    }
  }

  // Description (ensuring embed never has empty body if title is also empty)
  if (formattedText) {
    embed.setDescription(formattedText.slice(0, 4096));
  } else if (!rawTitle) {
    embed.setDescription("Welcome to the server!");
  }

  // Thumbnail
  const showThumb = type === "welcome"
    ? Boolean(config.welcome_show_thumbnail)
    : type === "leave"
    ? Boolean(config.leave_show_thumbnail)
    : Boolean(config.dm_show_thumbnail);

  if (showThumb) {
    let thumbUrl = null;
    const thumbType = config.welcome_thumbnail_type || "user_avatar";

    if (type === "welcome" && thumbType === "server_icon") {
      thumbUrl = formatWelcomeText("{serverIcon}", member);
    } else if (type === "welcome" && thumbType === "custom" && config.welcome_thumbnail_custom) {
      thumbUrl = resolveSafeUrl(config.welcome_thumbnail_custom, member);
    } else {
      thumbUrl = formatWelcomeText("{userAvatar}", member);
    }

    if (thumbUrl && (thumbUrl.startsWith("http://") || thumbUrl.startsWith("https://"))) {
      embed.setThumbnail(thumbUrl);
    }
  }

  // Custom Embed Fields (Carl-bot / Dyno style)
  if (type === "welcome" && config.welcome_embed_fields) {
    let fieldsArray = [];
    try {
      fieldsArray = typeof config.welcome_embed_fields === "string"
        ? JSON.parse(config.welcome_embed_fields || "[]")
        : (config.welcome_embed_fields || []);
    } catch (_) {
      fieldsArray = [];
    }

    if (Array.isArray(fieldsArray)) {
      for (const field of fieldsArray.slice(0, 25)) {
        if (!field || !field.name || !field.value) continue;
        const name = formatWelcomeText(String(field.name), member).slice(0, 256);
        const value = formatWelcomeText(String(field.value), member).slice(0, 1024);
        if (name && value) {
          embed.addFields({
            name,
            value,
            inline: Boolean(field.inline),
          });
        }
      }
    }
  }

  // Banner / Main Image
  const rawImage = type === "welcome"
    ? config.welcome_image_url
    : type === "leave"
    ? config.leave_image_url
    : null;
  const safeImg = resolveSafeUrl(rawImage, member);
  if (safeImg) {
    embed.setImage(safeImg);
  }

  // Footer & Timestamp
  const rawFooter = type === "welcome"
    ? config.welcome_embed_footer
    : type === "leave"
    ? config.leave_embed_footer
    : config.dm_embed_footer;

  if (rawFooter) {
    const formattedFooter = formatWelcomeText(rawFooter, member).slice(0, 2048);
    const footerIcon = type === "welcome"
      ? resolveSafeUrl(config.welcome_embed_footer_icon, member)
      : resolveSafeUrl("{serverIcon}", member);

    if (formattedFooter) {
      embed.setFooter({
        text: formattedFooter,
        iconURL: footerIcon || undefined,
      });
    }
  }

  // Timestamp
  if (config.welcome_show_timestamp !== 0 && config.welcome_show_timestamp !== false) {
    embed.setTimestamp();
  }

  // User Ping outside embed (if requested)
  let pingContent = undefined;
  if (type === "welcome" && config.welcome_ping_user && member?.id) {
    pingContent = `<@${member.id}>`;
  }

  return {
    content: pingContent,
    embeds: [embed],
  };
}
