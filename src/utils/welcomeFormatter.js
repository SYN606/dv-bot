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
  const userId = user?.id || "0";
  const username = user?.username || user?.displayName || "Member";
  const tag = user?.tag || username;
  const serverName = guild?.name || "Server";
  const memberCount = guild?.memberCount ? String(guild.memberCount) : "1";
  const memberCountOrdinal = getOrdinalSuffix(memberCount);
  const userAvatar = typeof user?.displayAvatarURL === "function"
    ? user.displayAvatarURL({ size: 512, forceStatic: false })
    : (user?.avatarUrl || "");
  const serverIcon = typeof guild?.iconURL === "function"
    ? guild.iconURL({ size: 512 })
    : (guild?.iconUrl || "");
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
 * Resolves full payload for sending Welcome / Leave / DM messages.
 * @param {object} config - Database record or welcome config object
 * @param {object} member - Discord.js GuildMember or mock member
 * @param {'welcome'|'leave'|'dm'} type - Message type
 * @returns {{ content?: string, embeds?: EmbedBuilder[] }}
 */
export function buildWelcomePayload(config, member, type = "welcome") {
  if (!config || !member) return null;

  const isEmbed = type === "welcome"
    ? Boolean(config.welcome_is_embed)
    : type === "leave"
    ? Boolean(config.leave_is_embed)
    : false; // DMs are typically markdown text

  const messageText = type === "welcome"
    ? config.welcome_message
    : type === "leave"
    ? config.leave_message
    : config.dm_message;

  const formattedText = formatWelcomeText(messageText, member);

  if (!isEmbed) {
    return {
      content: formattedText || undefined,
      embeds: [],
    };
  }

  // Embed Mode
  const embed = new EmbedBuilder();

  // Color
  const rawColor = type === "welcome" ? config.welcome_embed_color : config.leave_embed_color;
  let colorInt = 0x6366f1; // Default modern indigo
  if (rawColor) {
    const cleanHex = rawColor.replace("#", "");
    const parsed = parseInt(cleanHex, 16);
    if (!isNaN(parsed)) colorInt = parsed;
  }
  embed.setColor(colorInt);

  // Title
  const rawTitle = type === "welcome" ? config.welcome_embed_title : config.leave_embed_title;
  if (rawTitle) {
    embed.setTitle(formatWelcomeText(rawTitle, member).slice(0, 256));
  }

  // Description
  if (formattedText) {
    embed.setDescription(formattedText.slice(0, 4096));
  }

  // Thumbnail (user avatar)
  if (type === "welcome" && config.welcome_show_thumbnail) {
    const user = member?.user || member;
    const avatar = typeof user?.displayAvatarURL === "function"
      ? user.displayAvatarURL({ size: 512, forceStatic: false })
      : user?.avatarUrl;
    if (avatar) embed.setThumbnail(avatar);
  }

  // Banner image URL
  if (type === "welcome" && config.welcome_image_url) {
    const formattedUrl = formatWelcomeText(config.welcome_image_url, member).trim();
    if (formattedUrl.startsWith("http://") || formattedUrl.startsWith("https://")) {
      embed.setImage(formattedUrl);
    }
  }

  // Footer
  const rawFooter = type === "welcome" ? config.welcome_embed_footer : null;
  if (rawFooter) {
    const formattedFooter = formatWelcomeText(rawFooter, member);
    const guild = member?.guild;
    const iconUrl = typeof guild?.iconURL === "function" ? guild.iconURL({ size: 128 }) : undefined;
    embed.setFooter({
      text: formattedFooter.slice(0, 2048),
      iconURL: iconUrl,
    });
  }

  embed.setTimestamp();

  // Prepend user mention ping if requested
  let pingContent = undefined;
  if (type === "welcome" && config.welcome_ping_user && member?.id) {
    pingContent = `<@${member.id}>`;
  }

  return {
    content: pingContent,
    embeds: [embed],
  };
}
