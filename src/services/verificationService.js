import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  parseEmoji,
} from "discord.js";
import { TempbanRecord, VerificationConfig } from "../db/models/index.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
import { formatServerVariables, parseServerVariables } from "../utils/templateParser.js";
import { sendModLog } from "../utils/modLog.js";

/**
 * Get verification configuration for a guild
 */
export async function getVerificationConfig(guildId) {
  const [config] = await VerificationConfig.findOrCreate({
    where: { guild_id: String(guildId) },
    defaults: {
      guild_id: String(guildId),
      enabled: false,
      mode: "button",
      min_account_age_hours: 0,
      embed_title: "Server Verification",
      embed_description: "🛡️ Click the button below to verify and get access to the server.",
      button_label: "Verify Access",
      button_emoji: "✅",
    },
  });
  return config;
}

/**
 * Save verification configuration
 */
export async function saveVerificationConfig(guildId, data) {
  const config = await getVerificationConfig(guildId);
  const allowed = [
    "enabled",
    "mode",
    "min_account_age_hours",
    "embed_title",
    "embed_description",
    "button_label",
    "button_emoji",
    "verify_channel_id",
    "log_channel_id",
    "verified_role_id",
    "unverified_role_id",
  ];

  for (const field of allowed) {
    if (data[field] !== undefined) {
      if (field === "enabled") config[field] = Boolean(data[field]);
      else if (field === "min_account_age_hours") config[field] = Number(data[field]) || 0;
      else config[field] = data[field] ? String(data[field]) : null;
    }
  }

  await config.save();
  return config;
}

/**
 * Reset verification configuration to defaults
 */
export async function resetVerificationConfig(guildId) {
  const config = await getVerificationConfig(guildId);
  config.enabled = false;
  config.mode = "button";
  config.min_account_age_hours = 0;
  config.embed_title = "Server Verification";
  config.embed_description = "🛡️ Click the button below to verify and get access to the server.";
  config.button_label = "Verify Access";
  config.button_emoji = "✅";
  config.verify_channel_id = null;
  config.log_channel_id = null;
  config.verified_role_id = null;
  config.unverified_role_id = null;
  await config.save();
  return config;
}

/**
 * Check if account meets minimum age requirement in hours
 */
export function checkAccountAge(user, minHours = 0) {
  if (!minHours || minHours <= 0) return { passed: true, ageHours: 0 };
  const accountCreatedMs = user.createdTimestamp;
  const ageHours = (Date.now() - accountCreatedMs) / (1000 * 60 * 60);
  return {
    passed: ageHours >= minHours,
    ageHours,
    requiredHours: minHours,
    shortfallHours: Math.max(0, minHours - ageHours),
  };
}

/**
 * Execute verification grant for a member
 */
export async function verifyMember({ guild, user, member, config }) {
  if (user.bot) {
    return { success: false, code: "IS_BOT", message: "Automated bots cannot verify." };
  }

  // Check tempban isolation
  const activeTempban = await TempbanRecord.findOne({
    where: {
      guild_id: String(guild.id),
      user_id: String(user.id),
      active: true,
    },
  });

  if (activeTempban) {
    return { success: false, code: "TEMPBANNED", message: "You are currently temporarily banned on this server." };
  }

  // Check account age requirement
  const minHours = config.min_account_age_hours || 0;
  const ageCheck = checkAccountAge(user, minHours);
  if (!ageCheck.passed) {
    return {
      success: false,
      code: "ACCOUNT_TOO_NEW",
      message: `Your account must be at least ${minHours} hours old. Wait another ${Math.ceil(ageCheck.shortfallHours)}h.`,
    };
  }

  const verifiedRoleId = config.verified_role_id ? String(config.verified_role_id) : null;
  if (!verifiedRoleId) {
    return { success: false, code: "NO_ROLE_CONFIGURED", message: "Verified role is not configured by server staff." };
  }

  let verifiedRole = guild.roles.cache.get(verifiedRoleId);
  if (!verifiedRole && guild.roles?.fetch) {
    verifiedRole = await guild.roles.fetch(verifiedRoleId).catch(() => null);
  }
  if (!verifiedRole) {
    return { success: false, code: "ROLE_NOT_FOUND", message: "Configured verified role was not found in guild." };
  }

  // Check bot permissions
  const botMember = guild.members?.me;
  if (botMember?.permissions && typeof botMember.permissions.has === "function") {
    if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return { success: false, code: "BOT_MISSING_PERMISSIONS", message: "Bot lacks Manage Roles permission." };
    }
  }

  if (botMember?.roles?.highest && verifiedRole?.position !== undefined && botMember.roles.highest.position !== undefined) {
    if (verifiedRole.position >= botMember.roles.highest.position) {
      return { success: false, code: "ROLE_HIERARCHY_ERROR", message: "Bot role must be higher than verified role." };
    }
  }

  // Assign verified role
  await member.roles.add(verifiedRoleId, "Member completed server verification");

  // Remove unverified role if present
  if (config.unverified_role_id) {
    const unverifiedRoleId = String(config.unverified_role_id);
    let hasUnverified = false;
    if (member.roles.cache && typeof member.roles.cache.has === "function") {
      hasUnverified = member.roles.cache.has(unverifiedRoleId);
    }
    if (hasUnverified || !member.roles.cache) {
      await member.roles.remove(unverifiedRoleId, "Verification completed (removing unverified role)").catch(() => {});
    }
  }

  // Custom log channel if configured
  if (config.log_channel_id) {
    let logChannel = guild.channels?.cache?.get(String(config.log_channel_id));
    if (!logChannel && guild.channels?.fetch) {
      logChannel = await guild.channels.fetch(String(config.log_channel_id)).catch(() => null);
    }
    if (logChannel && logChannel.send) {
      const timestamp = Math.floor(Date.now() / 1000);
      const logEmbed = makeEmbed({
        title: "🛡️ Member Verified",
        description:
          `**Member:** <@${user.id}> (\`${user.id}\`)\n` +
          `**Role Granted:** <@&${verifiedRoleId}>\n` +
          (config.unverified_role_id ? `**Role Removed:** <@&${config.unverified_role_id}>\n` : "") +
          `**Time:** <t:${timestamp}:R>`,
        level: "SUCCESS",
        footer: `Server: ${guild.name}`,
      });
      if (user.displayAvatarURL) {
        logEmbed.data.thumbnail = { url: user.displayAvatarURL() };
      }
      await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
    }
  }

  // Mod log
  await sendModLog({
    guild,
    category: "VERIFICATION",
    title: "Member Verified",
    description: `<@${user.id}> successfully verified.`,
    level: "SUCCESS",
    actor: user,
    extraFields: {
      Role: verifiedRole.name,
      AccountAge: `${Math.floor(ageCheck.ageHours)}h`,
    },
  });

  return { success: true, verifiedRole };
}

/**
 * Deploy the verification prompt card and button to a channel
 */
export async function deployVerificationPrompt({ guild, channelId, config }) {
  let channel = guild.channels?.cache?.get(String(channelId));
  if (!channel && guild.channels?.fetch) {
    channel = await guild.channels.fetch(String(channelId)).catch(() => null);
  }
  if (!channel) {
    throw new Error("Target channel not found.");
  }

  const botMember = guild.members?.me || (guild.members?.fetchMe ? await guild.members.fetchMe().catch(() => null) : null);
  if (channel.permissionsFor && botMember) {
    const perms = channel.permissionsFor(botMember);
    if (perms && (!perms.has(PermissionFlagsBits.SendMessages) || !perms.has(PermissionFlagsBits.ViewChannel))) {
      throw new Error("Bot lacks Send Messages or View Channel permission in target channel.");
    }
  }

  const title = formatServerVariables(config.embed_title || "Server Verification", { guild, channel, config });
  const desc = formatServerVariables(config.embed_description || "Click below to verify", { guild, channel, config });
  const btnLabel = formatServerVariables(config.button_label || "Verify Access", { guild, channel, config });

  const embed = makeEmbed({
    title,
    description: desc,
    level: "INFO",
    color: COLORS.DARK,
    footer: { text: `${guild.name} • Security Verification` },
  });

  const emojiVal = config.button_emoji || "✅";
  const parsedEmoji = parseEmoji(emojiVal) || emojiVal;

  const button = new ButtonBuilder()
    .setCustomId("verify_member_btn")
    .setLabel(btnLabel || "Verify Access")
    .setStyle(ButtonStyle.Success)
    .setEmoji(parsedEmoji);

  const row = new ActionRowBuilder().addComponents(button);
  return await channel.send({ embeds: [embed], components: [row] });
}
