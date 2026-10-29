import { EmbedBuilder } from "discord.js";
import { ModerationLogConfig } from "../db/models/index.js";

/**
 * Standard action theme definitions (colors, emojis, and display badges)
 * Styled in alignment with modern professional Discord audit logging (Carl-bot, Dyno, ProBot).
 */
const ACTION_THEMES = {
  BAN: { color: 0xed4245, emoji: "🔨", label: "Member Banned" },
  FAKEBAN: { color: 0xed4245, emoji: "🔨", label: "Simulated Ban" },
  TEMPBAN: { color: 0xe67e22, emoji: "⏳", label: "Temporary Ban" },
  KICK: { color: 0xe67e22, emoji: "👢", label: "Member Kicked" },
  TIMEOUT: { color: 0xfee75c, emoji: "⏳", label: "Member Timed Out" },
  UNBAN: { color: 0x57f287, emoji: "🔓", label: "Member Unbanned" },
  WARN: { color: 0xf1c40f, emoji: "⚠️", label: "Member Warned" },

  LOCK: { color: 0xe74c3c, emoji: "🔒", label: "Channel Locked" },
  UNLOCK: { color: 0x2ecc71, emoji: "🔓", label: "Channel Unlocked" },
  HIDE: { color: 0x95a5a6, emoji: "🙈", label: "Channel Hidden" },
  UNHIDE: { color: 0x2ecc71, emoji: "👁️", label: "Channel Unhidden" },
  SLOWMODE: { color: 0x3498db, emoji: "⏱️", label: "Slowmode Updated" },

  PURGE: { color: 0x00a8ff, emoji: "🧹", label: "Message Purge" },
  ROLE: { color: 0x5865f2, emoji: "🎭", label: "Role Modified" },
  NICKNAME: { color: 0x9b59b6, emoji: "📝", label: "Nickname Changed" },
  VERIFICATION: { color: 0x57f287, emoji: "✅", label: "Member Verified" },
  MEDIA: { color: 0xfee75c, emoji: "🖼️", label: "Media Filter Violation" },
  CONFIG: { color: 0x8e44ad, emoji: "⚙️", label: "Configuration Updated" },
  VOICE: { color: 0x5865f2, emoji: "🔊", label: "Voice Channel Action" },
  DEFAULT: { color: 0x2b2d31, emoji: "🛡️", label: "Moderation Audit" },
};

/**
 * Determine the visual theme based on category, title, and extraFields.
 */
function resolveActionTheme(category = "", title = "") {
  const normCategory = String(category).toUpperCase();
  const normTitle = String(title).toLowerCase();

  if (normCategory === "BAN" || normTitle.includes("ban")) {
    if (normTitle.includes("temp") || normTitle.includes("isolated")) return ACTION_THEMES.TEMPBAN;
    if (normTitle.includes("unban") || normTitle.includes("lift")) return ACTION_THEMES.UNBAN;
    if (normTitle.includes("fake") || normTitle.includes("simulated")) return ACTION_THEMES.FAKEBAN;
    return ACTION_THEMES.BAN;
  }
  if (normTitle.includes("kick")) return ACTION_THEMES.KICK;
  if (normTitle.includes("timed out") || normTitle.includes("timeout") || normTitle.includes("mute")) {
    return ACTION_THEMES.TIMEOUT;
  }
  if (normTitle.includes("warn")) return ACTION_THEMES.WARN;

  if (normTitle.includes("unlock")) return ACTION_THEMES.UNLOCK;
  if (normTitle.includes("unhide") || normTitle.includes("unhidded")) return ACTION_THEMES.UNHIDE;
  if (normTitle.includes("lock")) return ACTION_THEMES.LOCK;
  if (normTitle.includes("hide") || normTitle.includes("hidded")) return ACTION_THEMES.HIDE;
  if (normTitle.includes("slowmode")) return ACTION_THEMES.SLOWMODE;

  if (normTitle.includes("purge") || normTitle.includes("clean")) return ACTION_THEMES.PURGE;
  if (normTitle.includes("role")) return ACTION_THEMES.ROLE;
  if (normTitle.includes("nick") || normTitle.includes("rename")) return ACTION_THEMES.NICKNAME;
  if (normCategory === "VERIFICATION" || normTitle.includes("verif")) return ACTION_THEMES.VERIFICATION;
  if (normCategory === "MEDIA" || normTitle.includes("media")) return ACTION_THEMES.MEDIA;
  if (normCategory === "CONFIG" || normTitle.includes("command")) return ACTION_THEMES.CONFIG;
  if (normCategory === "VOICE" || normTitle.includes("voice") || normTitle.includes("move")) return ACTION_THEMES.VOICE;

  return ACTION_THEMES.DEFAULT;
}

/**
 * Extract a target user from parameter, guild cache, or extraFields
 */
function resolveTargetUser(guild, target, extraFields = {}) {
  if (target) {
    if (typeof target === "object") {
      const userObj = target.user || target;
      return {
        id: userObj.id,
        tag: userObj.tag || userObj.username || userObj.displayName || userObj.id,
        avatar: typeof userObj.displayAvatarURL === "function" ? userObj.displayAvatarURL({ size: 256 }) : null,
      };
    }
    const targetStr = String(target).trim();
    const idMatch = targetStr.match(/(\d{17,20})/);
    if (idMatch) {
      const id = idMatch[1];
      const member = guild.members?.cache?.get(id);
      const user = member?.user || guild.client?.users?.cache?.get(id);
      return {
        id,
        tag: user?.tag || user?.username || targetStr,
        avatar: user?.displayAvatarURL?.({ size: 256 }) || null,
      };
    }
  }

  // Scan extraFields for target hints
  const candidateKeys = ["Target", "Member", "Filtered User", "Target Member", "User"];
  for (const key of candidateKeys) {
    const val = extraFields[key];
    if (val) {
      const valStr = String(val);
      const idMatch = valStr.match(/(\d{17,20})/);
      if (idMatch) {
        const id = idMatch[1];
        const member = guild.members?.cache?.get(id);
        const user = member?.user || guild.client?.users?.cache?.get(id);
        return {
          id,
          tag: user?.tag || user?.username || valStr.replace(/<@!?\d+>/g, "").trim() || id,
          avatar: user?.displayAvatarURL?.({ size: 256 }) || null,
        };
      }
    }
  }

  return null;
}

/**
 * High-fidelity audit & moderation logger.
 * Formats structured, professional embeds with emojis, actor/target cards,
 * color banners, and target thumbnails.
 */
export async function sendModLog({
  guild,
  category = "MODERATION",
  title,
  description,
  level = "INFO",
  actor = null,
  target = null,
  extraFields = {},
}) {
  if (!guild) return;

  try {
    const config = await ModerationLogConfig.findByPk(String(guild.id));
    if (!config || !config.enabled || !config.channel_id) return;

    const channel = guild.channels.cache.get(String(config.channel_id));
    if (!channel || typeof channel.send !== "function") return;

    const theme = resolveActionTheme(category, title);
    const resolvedTarget = resolveTargetUser(guild, target, extraFields);

    const embed = new EmbedBuilder()
      .setColor(theme.color)
      .setTimestamp(new Date());

    // Title with action emoji
    const cleanTitle = title ? title.replace(/^[^\w\s]+/, "").trim() : theme.label;
    embed.setTitle(`${theme.emoji} ${cleanTitle}`);

    // Moderator details
    const actorUser = actor?.user || actor;
    const actorTag = actorUser?.tag || actorUser?.username || actorUser?.displayName || "System Automation";
    const actorId = actorUser?.id || null;
    const actorAvatar = typeof actorUser?.displayAvatarURL === "function"
      ? actorUser.displayAvatarURL({ size: 128 })
      : null;

    // Header thumbnail: Target avatar (preferred) or guild icon
    if (resolvedTarget?.avatar) {
      embed.setThumbnail(resolvedTarget.avatar);
    } else if (guild.iconURL?.()) {
      embed.setThumbnail(guild.iconURL({ size: 256 }));
    }

    // 1. Target Member Field
    if (resolvedTarget) {
      embed.addFields({
        name: "👤 Target User",
        value: `<@${resolvedTarget.id}>\n\`${resolvedTarget.tag}\`\n\`ID: ${resolvedTarget.id}\``,
        inline: true,
      });
    }

    // 2. Moderator Field
    embed.addFields({
      name: "🛡️ Moderator",
      value: actorId
        ? `<@${actorId}>\n\`${actorTag}\`\n\`ID: ${actorId}\``
        : `\`${actorTag}\``,
      inline: true,
    });

    // Extract specialized fields from extraFields
    const fieldsToOmit = new Set();
    const findField = (names) => {
      for (const name of names) {
        for (const [key, val] of Object.entries(extraFields)) {
          if (key.toLowerCase() === name.toLowerCase()) {
            fieldsToOmit.add(key);
            return val;
          }
        }
      }
      return null;
    };

    const reasonVal = findField(["Reason", "auditReason"]);
    const durationVal = findField(["Duration", "Expires", "Interval"]);
    const channelVal = findField(["Channel"]);
    const roleVal = findField(["Role"]);

    // If target was resolved, omit Target/Member fields from extraFields to prevent redundancy
    for (const key of Object.keys(extraFields)) {
      if (["target", "member", "filtered user", "target member", "user"].includes(key.toLowerCase())) {
        fieldsToOmit.add(key);
      }
    }

    // 3. Contextual Field (Duration, Channel, or Role) in row 1
    if (durationVal) {
      embed.addFields({
        name: "⏱️ Duration / Expiration",
        value: String(durationVal),
        inline: true,
      });
    } else if (channelVal) {
      embed.addFields({
        name: "📁 Channel",
        value: String(channelVal),
        inline: true,
      });
    } else if (roleVal) {
      embed.addFields({
        name: "🎭 Role",
        value: String(roleVal),
        inline: true,
      });
    }

    // 4. Reason (Blockquoted, full width)
    if (reasonVal && reasonVal !== "None") {
      embed.addFields({
        name: "📝 Reason",
        value: `> ${String(reasonVal).replace(/\n/g, "\n> ")}`,
        inline: false,
      });
    }

    // 5. Additional / Contextual fields
    for (const [key, val] of Object.entries(extraFields)) {
      if (!fieldsToOmit.has(key) && val !== undefined && val !== null) {
        embed.addFields({
          name: `**${key}**`,
          value: String(val),
          inline: true,
        });
      }
    }

    // Clean description if it provides details not already in fields
    if (description) {
      // If description is just repeating "<@id> was banned by moderator", avoid redundancy
      const isRedundant =
        description.includes("was banned by") ||
        description.includes("was kicked by") ||
        description.includes("was timed out by") ||
        description.includes("was warned by");

      if (!isRedundant) {
        embed.setDescription(description);
      }
    }

    // Professional Footer with Case / User ID Metadata
    const footerParts = [];
    if (resolvedTarget?.id) {
      footerParts.push(`User ID: ${resolvedTarget.id}`);
    }
    if (actorId && actorId !== resolvedTarget?.id) {
      footerParts.push(`Mod ID: ${actorId}`);
    }
    footerParts.push(guild.name);

    embed.setFooter({
      text: footerParts.join(" • "),
      iconURL: actorAvatar || guild.iconURL?.() || undefined,
    });

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    // Audit log failures should never disrupt moderation execution
  }
}
