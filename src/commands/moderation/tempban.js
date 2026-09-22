import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import {
  createTempban,
  deactivateTempban,
  getTempbanConfig,
  setTempbanConfig,
} from "../../db/helpers/tempban.js";
import { TempbanRecord, VerificationConfig } from "../../db/models/index.js";
import { sendModLog } from "../../utils/modLog.js";

function parseDuration(str) {
  if (!str) return null;
  const match = str.match(/^(\d+)([smhdw])$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case "s": return num;
    case "m": return num * 60;
    case "h": return num * 3600;
    case "d": return num * 86400;
    case "w": return num * 604800;
    default: return null;
  }
}

function formatDuration(seconds) {
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
  return `${seconds} second${seconds > 1 ? "s" : ""}`;
}

const slashBuilder = new SlashCommandBuilder()
  .setName("tempban")
  .setDescription("Temporarily ban or isolate a member from the server")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Temporarily ban or isolate a member")
      .addUserOption((opt) => opt.setName("user").setDescription("The target member").setRequired(true))
      .addStringOption((opt) => opt.setName("duration").setDescription("Duration (e.g. 30m, 2h, 1d, 7d)").setRequired(true))
      .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the tempban").setRequired(false))
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Lift an active tempban early")
      .addUserOption((opt) => opt.setName("user").setDescription("The target member").setRequired(true))
      .addStringOption((opt) => opt.setName("reason").setDescription("Reason for early lift").setRequired(false))
  )
  .addSubcommand((sub) =>
    sub
      .setName("role")
      .setDescription("Configure a role used for isolation-based tempbans")
      .addRoleOption((opt) => opt.setName("role").setDescription("The isolation role (or leave empty to view)").setRequired(false))
  );

export default createCommand({
  name: "tempban",
  description: "Temporarily ban or isolate a member from the server",
  category: "Moderation",
  aliases: ["tb", "jail", "untempban", "untb", "unjail"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.BanMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, user, member } = ctx;
    if (!guild) return;

    const invokedName = ctx.command?.name || "tempban";
    let sub = ctx.subcommand || "add";

    // Detect prefix subcommand or untempban aliases
    const firstArg = ctx.options._args?.[0]?.toLowerCase();
    if (
      invokedName === "untempban" ||
      invokedName === "untb" ||
      invokedName === "unjail" ||
      firstArg === "remove" ||
      firstArg === "untempban"
    ) {
      sub = "remove";
    } else if (firstArg === "role") {
      sub = "role";
    }

    // 1. SUBCOMMAND: ROLE (Set or view isolation role)
    if (sub === "role") {
      if (!member?.permissions?.has(PermissionFlagsBits.Administrator) && guild.ownerId !== user.id) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Permission Denied",
              description: `${EMOJIS.get("fail") || "❌"} Only Administrators can configure the tempban isolation role.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      const roleId = ctx.options.role || ctx.options._args?.[1]?.replace(/[<@&>]/g, "");
      if (!roleId) {
        const config = await getTempbanConfig(guild.id);
        const currentRole = config?.role_id ? guild.roles.cache.get(config.role_id) : null;
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Tempban Configuration",
              description: currentRole
                ? `Current isolation role: ${currentRole} (\`${currentRole.id}\`)`
                : "No isolation role configured. Tempbans will execute native server bans.",
              level: "INFO",
            }),
          ],
        });
      }

      const targetRole = guild.roles.cache.get(roleId);
      if (!targetRole) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Role Not Found",
              description: `${EMOJIS.get("fail") || "❌"} Could not find role with ID \`${roleId}\`.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      const botMember = guild.members.me;
      if (botMember && targetRole.position >= botMember.roles.highest.position) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Role Hierarchy Issue",
              description: `${EMOJIS.get("fail") || "❌"} The bot's role must be higher than ${targetRole} to manage it.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      await setTempbanConfig(guild.id, targetRole.id);
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Tempban Role Configured",
            description: `${EMOJIS.get("success") || "✅"} Tempban isolation role set to ${targetRole}.`,
            level: "SUCCESS",
          }),
        ],
      });
    }

    // 2. SUBCOMMAND: REMOVE / UNTEMPBAN
    if (sub === "remove") {
      let targetUserId = ctx.options.user;
      let reason = ctx.options.reason;

      if (!targetUserId) {
        const argsOffset = (firstArg === "remove" || firstArg === "untempban") ? 1 : 0;
        targetUserId = ctx.options._args?.[argsOffset]?.replace(/[<@!>]/g, "");
        reason = ctx.options._args?.slice(argsOffset + 1).join(" ");
      }

      if (!targetUserId && ctx.message?.reference?.messageId) {
        const ref = await ctx.channel.messages.fetch(ctx.message.reference.messageId).catch(() => null);
        if (ref?.author) targetUserId = ref.author.id;
      }

      if (!targetUserId) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Missing User",
              description: "Please specify a target user to lift the tempban from.",
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      reason = reason?.trim() || "Manual untempban by moderator";

      const activeRecord = await TempbanRecord.findOne({
        where: {
          guild_id: String(guild.id),
          user_id: String(targetUserId),
          active: true,
        },
      });

      if (!activeRecord) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Not Tempbanned",
              description: `${EMOJIS.get("warning") || "⚠️"} <@${targetUserId}> has no active tempban record.`,
              level: "WARNING",
            }),
          ],
          ephemeral: true,
        });
      }

      const tempbanCfg = await getTempbanConfig(guild.id);
      if (tempbanCfg && tempbanCfg.role_id) {
        const isolationRole = guild.roles.cache.get(String(tempbanCfg.role_id));
        const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
        if (targetMember && isolationRole) {
          await targetMember.roles.remove(isolationRole, `Tempban lifted by ${user.tag}`).catch(() => {});
        }

        // Restore verified role if verification is configured
        try {
          const verifConfig = await VerificationConfig.findByPk(guild.id);
          if (verifConfig && verifConfig.enabled && verifConfig.verified_role_id && targetMember) {
            const verifiedRole = guild.roles.cache.get(String(verifConfig.verified_role_id));
            if (verifiedRole && !targetMember.roles.cache.has(verifiedRole.id)) {
              await targetMember.roles.add(verifiedRole, "Restoring verified status after tempban lift").catch(() => {});
            }
          }
        } catch {}
      } else {
        await guild.bans.remove(targetUserId, `Tempban lifted by ${user.tag}`).catch(() => {});
      }

      await deactivateTempban(guild.id, targetUserId);

      await sendModLog({
        guild,
        category: "MODERATION",
        title: "Tempban Lifted",
        description: `Tempban on <@${targetUserId}> was lifted by <@${user.id}>.\n\n• **Reason:** ${reason}`,
        level: "SUCCESS",
        actor: user,
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Tempban Lifted",
            description: `${EMOJIS.get("success") || "✅"} Active tempban successfully lifted for <@${targetUserId}>.`,
            level: "SUCCESS",
          }),
        ],
      });
    }

    // 3. SUBCOMMAND: ADD (Default)
    let targetUserId = ctx.options.user;
    let durationStr = ctx.options.duration;
    let reason = ctx.options.reason;

    if (!targetUserId) {
      targetUserId = ctx.options._args?.[0]?.replace(/[<@!>]/g, "");
      durationStr = ctx.options._args?.[1];
      reason = ctx.options._args?.slice(2).join(" ");
    }

    if (!targetUserId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Arguments",
            description: "Usage: `/tempban add <user> <duration> [reason]` or `!tempban <user> <duration> [reason]`\nExample: `!tempban @user 1d rule violation`",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (targetUserId === user.id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Action Denied",
            description: `${EMOJIS.get("fail") || "❌"} You cannot tempban yourself.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (targetUserId === guild.ownerId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Action Denied",
            description: `${EMOJIS.get("fail") || "❌"} You cannot tempban the server owner.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const durationSec = parseDuration(durationStr);
    if (!durationSec || durationSec <= 0) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Duration",
            description: `${EMOJIS.get("warning") || "⚠️"} Please provide a valid duration (e.g. \`30m\`, \`2h\`, \`1d\`, \`7d\`).`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    reason = reason?.trim() || "No reason provided";
    const humanDuration = formatDuration(durationSec);
    const expiresAt = new Date(Date.now() + durationSec * 1000);
    const discordTimestamp = Math.floor(expiresAt.getTime() / 1000);

    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (targetMember) {
      if (ctx.member && targetMember.roles.highest.position >= ctx.member.roles.highest.position && guild.ownerId !== user.id) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Permission Denied",
              description: `${EMOJIS.get("fail") || "❌"} You cannot tempban a member with an equal or higher role than yourself.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }
    }

    // Try sending DM to target
    if (targetMember) {
      await targetMember.send({
        embeds: [
          makeEmbed({
            title: "You Were Tempbanned",
            description: `${EMOJIS.get("warning") || "⚠️"} You were tempbanned in **${guild.name}**\n\n` +
              `• **Moderator:** <@${user.id}>\n` +
              `• **Duration:** ${humanDuration} (Expires <t:${discordTimestamp}:R>)\n` +
              `• **Reason:** ${reason}`,
            level: "WARNING",
          }),
        ],
      }).catch(() => {});
    }

    const tempbanCfg = await getTempbanConfig(guild.id);
    if (tempbanCfg && tempbanCfg.role_id) {
      // Role-based isolation
      const isolationRole = guild.roles.cache.get(String(tempbanCfg.role_id));
      if (!isolationRole) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Role Missing",
              description: `${EMOJIS.get("fail") || "❌"} The configured isolation role could not be found.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      if (targetMember) {
        // Strip verified role if present
        try {
          const verifConfig = await VerificationConfig.findByPk(guild.id);
          if (verifConfig && verifConfig.verified_role_id) {
            const verifiedRole = guild.roles.cache.get(String(verifConfig.verified_role_id));
            if (verifiedRole && targetMember.roles.cache.has(verifiedRole.id)) {
              await targetMember.roles.remove(verifiedRole, "Tempban applied").catch(() => {});
            }
          }
        } catch {}

        await targetMember.roles.add(isolationRole, `Tempban applied by ${user.tag} | ${humanDuration}`);
      }
    } else {
      // Native Discord ban
      try {
        await guild.bans.create(targetUserId, { reason: `Tempban by ${user.tag} | ${humanDuration} | ${reason}` });
      } catch (err) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Tempban Failed",
              description: `${EMOJIS.get("fail") || "❌"} Failed to ban <@${targetUserId}>: ${err?.message || "Discord API error"}.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }
    }

    await createTempban(guild.id, targetUserId, user.id, reason, expiresAt);

    await sendModLog({
      guild,
      category: "MODERATION",
      title: "Member Tempbanned",
      description: `<@${targetUserId}> was tempbanned by <@${user.id}>.\n\n` +
        `• **Duration:** ${humanDuration}\n` +
        `• **Expires:** <t:${discordTimestamp}:F> (<t:${discordTimestamp}:R>)\n` +
        `• **Reason:** ${reason}`,
      level: "WARNING",
      actor: user,
      extraFields: {
        Duration: humanDuration,
        "Expires At": `<t:${discordTimestamp}:F>`,
      },
    });

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Member Tempbanned",
          description: `${EMOJIS.get("ban") || "🔨"} Successfully tempbanned <@${targetUserId}>.\n\n` +
            `• **Duration:** ${humanDuration}\n` +
            `• **Expires:** <t:${discordTimestamp}:R>\n` +
            `• **Reason:** ${reason}`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
