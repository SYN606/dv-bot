import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import {
  getTempbanConfig,
  setTempbanConfig,
  removeTempbanConfig,
} from "../../db/helpers/tempban.js";
import {
  executeTempban,
  liftTempban,
  parseDuration,
  formatDuration,
} from "../../services/tempbanService.js";

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
      .setDescription("Configure or view the role used for isolation-based tempbans")
      .addRoleOption((opt) => opt.setName("role").setDescription("The isolation role to set").setRequired(false))
      .addBooleanOption((opt) => opt.setName("clear").setDescription("Remove isolation role to revert to native server bans").setRequired(false))
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

    // ── 1. SUBCOMMAND: ROLE ──────────────────────────────────────────────────
    if (sub === "role") {
      if (!member?.permissions?.has(PermissionFlagsBits.Administrator) && guild.ownerId !== user.id) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Permission Denied",
              description: `${EMOJIS.get("fail") || "❌"} Only Administrators can configure the tempban isolation role.`,
              level: "ERROR",
              color: COLORS.DARK,
              headerDivider: false,
            }),
          ],
          ephemeral: true,
        });
      }

      const rawRoleArg = ctx.options.role || ctx.options._args?.[1];
      const isClear = ctx.options.clear || ["none", "clear", "reset", "remove", "disable", "off"].includes(String(rawRoleArg || "").toLowerCase().trim());

      if (isClear) {
        await removeTempbanConfig(guild.id);
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Tempban Role Cleared",
              description: `${EMOJIS.get("success") || "✅"} Tempban isolation role has been removed.\n\n• Tempbans will now execute **native Discord server bans** and automatically unban when expired.\n• You can also configure this in the **Web Dashboard** under Roles & Audit Logs.`,
              level: "SUCCESS",
              color: COLORS.DARK,
              headerDivider: false,
            }),
          ],
        });
      }

      const roleId = rawRoleArg ? String(rawRoleArg).replace(/[<@&>]/g, "").trim() : null;
      if (!roleId) {
        const config = await getTempbanConfig(guild.id);
        const currentRole = config?.role_id ? guild.roles.cache.get(String(config.role_id)) : null;
        const roleName = currentRole?.name || "Configured Role";
        return await ctx.reply({
          embeds: [
            makeEmbed({
              author: { name: "Tempban Configuration", iconURL: guild.iconURL?.({ dynamic: true }) || undefined },
              title: "Tempban Isolation Role",
              description: currentRole
                ? `• **Current Isolation Role:** <@&${config.role_id}> (${roleName})\n• **Mode:** Role-Based Isolation (strips verification, applies isolation role, and auto-restores on expiry).\n\n-# To clear and revert to native bans: \`/tempban role clear:True\` or \`ts tempban role clear\``
                : `• **Current Mode:** Native Discord Server Ban (no isolation role configured).\n\n-# To set a role: \`/tempban role role:@Role\` or \`ts tempban role @Role\`, or use the **Web Dashboard** under Roles & Audit Logs.`,
              level: "INFO",
              color: COLORS.DARK,
              headerDivider: false,
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
              description: `${EMOJIS.get("fail") || "❌"} Could not find role with ID or mention \`${roleId}\`.`,
              level: "ERROR",
              color: COLORS.DARK,
              headerDivider: false,
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
              color: COLORS.DARK,
              headerDivider: false,
            }),
          ],
          ephemeral: true,
        });
      }

      await setTempbanConfig(guild.id, targetRole.id);
      return await ctx.reply({
        embeds: [
          makeEmbed({
            author: { name: "Tempban Configuration", iconURL: guild.iconURL?.({ dynamic: true }) || undefined },
            title: "Tempban Role Configured",
            description: `${EMOJIS.get("success") || "✅"} Tempban isolation role set to ${targetRole}.\n\n• **Behavior:** When members are tempbanned via \`/tempban add\` or \`ts tempban\`, this role is assigned, verified status is temporarily removed, and everything is automatically restored when the timer ends.\n• Can also be changed anytime in the **Web Dashboard** (Roles & Audit Logs).`,
            level: "SUCCESS",
            color: COLORS.DARK,
            headerDivider: false,
          }),
        ],
      });
    }

    // ── 2. SUBCOMMAND: REMOVE / UNTEMPBAN ─────────────────────────────────────
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

      reason = reason?.trim() || "Early lift by staff";

      await liftTempban({
        guild,
        targetUserId,
        moderator: user,
        reason,
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            author: { name: "Moderation Enforcement", iconURL: guild.iconURL?.({ dynamic: true }) || undefined },
            title: "Tempban Lifted",
            description: `${EMOJIS.get("success") || "✅"} Active tempban has been lifted for <@${targetUserId}>.\n\n• **Reason:** \`${reason}\`\n• **Staff Moderator:** <@${user.id}>`,
            level: "SUCCESS",
            color: COLORS.DARK,
            headerDivider: false,
          }),
        ],
      });
    }

    // ── 3. SUBCOMMAND: ADD / TEMPBAN ─────────────────────────────────────────
    let targetUserId = ctx.options.user;
    let durationStr = ctx.options.duration;
    let reason = ctx.options.reason;

    if (!targetUserId && ctx.options._args) {
      const args = ctx.options._args;
      const startIndex = args[0]?.toLowerCase() === "add" ? 1 : 0;
      targetUserId = args[startIndex]?.replace(/[<@!>]/g, "");
      durationStr = args[startIndex + 1];
      reason = args.slice(startIndex + 2).join(" ");
    }

    if (!targetUserId && ctx.message?.reference?.messageId) {
      const ref = await ctx.channel.messages.fetch(ctx.message.reference.messageId).catch(() => null);
      if (ref?.author) {
        targetUserId = ref.author.id;
        if (!durationStr && ctx.options._args?.[0]) {
          durationStr = ctx.options._args[0];
          reason = ctx.options._args.slice(1).join(" ");
        }
      }
    }

    if (!targetUserId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing User",
            description: `${EMOJIS.get("fail") || "❌"} Please mention or provide the ID of the user you want to tempban.`,
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

    const res = await executeTempban({
      guild,
      moderator: user,
      targetMember: targetMember || { id: targetUserId, send: async () => {} },
      durationSeconds: durationSec,
      reason,
    });

    const modeLabel = res.isRoleIsolation
      ? `Role-Based Isolation (<@&${res.isolationRole.id}>)`
      : "Native Discord Server Ban";

    return await ctx.reply({
      embeds: [
        makeEmbed({
          author: { name: "Moderation Enforcement", iconURL: guild.iconURL?.({ dynamic: true }) || undefined },
          title: "Member Tempbanned",
          description: `${EMOJIS.get("ban") || "🔨"} Successfully tempbanned <@${targetUserId}>.\n\n` +
            `• **Duration:** ${res.formattedTime}\n` +
            `• **Expires:** <t:${Math.floor(res.expiresAt.getTime() / 1000)}:R> (<t:${Math.floor(res.expiresAt.getTime() / 1000)}:F>)\n` +
            `• **Action Taken:** ${modeLabel}\n` +
            `• **Reason:** \`${reason}\`\n\n` +
            `- # Automatic unban / isolation lift worker will restore access once time expires.`,
          level: "SUCCESS",
          color: COLORS.DARK,
          headerDivider: false,
        }),
      ],
    });
  },
});
