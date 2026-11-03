import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { getTempbanConfig } from "../../db/helpers/tempban.js";
import { executeTempban, parseDuration } from "../../services/tempbanService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("tempban")
  .setDescription("Temporarily restrict a member using an isolation role.")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .setDMPermission(false)
  .addUserOption((opt) => opt.setName("user").setDescription("The target member").setRequired(true))
  .addStringOption((opt) => opt.setName("duration").setDescription("Duration (e.g. 10m, 1h, 1d)").setRequired(false))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the tempban").setRequired(false));

export default createCommand({
  name: "tempban",
  description: "Temporarily restrict a member using an isolation role.",
  category: "Moderation",
  aliases: ["tb", "jail"],
  usage: "<user> [duration] [reason]",
  examples: [
    "/tempban user:@User duration:24h reason:Severe toxicity",
    "dvtempban @User 7d Rule violations",
  ],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageRoles,
  slashBuilder,

  async execute(ctx) {
    const { guild, user: moderator, member: modMember } = ctx;
    if (!guild) return;

    await ctx.defer({ ephemeral: false });

    try {
      const config = await getTempbanConfig(guild.id);
      const isolationRoleId = config?.role_id ? String(config.role_id) : null;
      const isolationRole = isolationRoleId ? guild.roles.cache.get(isolationRoleId) : null;

      if (!isolationRole) {
        const dashboardUrl = process.env.DASHBOARD_URL || "https://digitalvigital.com/dashboard";
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Configuration Missing",
              description: `${EMOJIS.get("fail") || "❌"} The Tempban Isolation Role has not been configured.\n\n` +
                           `Administrators must configure this module from the **[Web Dashboard](${dashboardUrl}/${guild.id})** before it can be used.`,
              level: "ERROR",
              color: COLORS.ERROR,
            }),
          ],
          ephemeral: true,
        });
      }

      const rawUser = ctx.options.user || ctx.options._args?.[0];
      const targetUserId = rawUser?.match(/\d{17,20}/)?.[0];

      if (!targetUserId) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Missing Argument",
              description: `${EMOJIS.get("fail") || "❌"} Please specify a valid user.\nUsage: \`/tempban <user> [duration] [reason]\``,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
      if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Missing Permissions",
              description: `${EMOJIS.get("fail") || "❌"} I lack the \`Manage Roles\` permission to assign isolation roles.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      if (targetUserId === ctx.client.user.id) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Self Action Blocked",
              description: `${EMOJIS.get("fail") || "❌"} I cannot tempban myself.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
      if (!targetMember) {
        return await ctx.reply({
          embeds: [makeEmbed({ title: "Not Found", description: `${EMOJIS.get("fail") || "❌"} Member not found in this server.`, level: "ERROR" })],
          ephemeral: true,
        });
      }

      if (targetMember.id === moderator.id) {
        return await ctx.reply({ embeds: [makeEmbed({ title: "Error", description: "You cannot tempban yourself.", level: "ERROR" })], ephemeral: true });
      }
      if (targetMember.user.bot) {
        return await ctx.reply({ embeds: [makeEmbed({ title: "Error", description: "You cannot tempban bots.", level: "ERROR" })], ephemeral: true });
      }
      if (targetMember.id === guild.ownerId) {
        return await ctx.reply({ embeds: [makeEmbed({ title: "Error", description: "You cannot tempban the server owner.", level: "ERROR" })], ephemeral: true });
      }

      let modHighest = 0;
      if (modMember && "roles" in modMember) {
        if (modMember.roles?.highest) {
          modHighest = modMember.roles.highest.position;
        } else if (Array.isArray(modMember.roles)) {
          for (const rId of modMember.roles) {
            const r = guild.roles.cache.get(rId);
            if (r && r.position > modHighest) modHighest = r.position;
          }
        }
      }

      if (guild.ownerId !== moderator.id && targetMember.roles.highest.position >= modHighest) {
        return await ctx.reply({ embeds: [makeEmbed({ title: "Permission Denied", description: "Target has an equal or higher role than you.", level: "ERROR" })], ephemeral: true });
      }
      if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
        return await ctx.reply({ embeds: [makeEmbed({ title: "Hierarchy Error", description: "I cannot manage this user due to role hierarchy.", level: "ERROR" })], ephemeral: true });
      }
      if (isolationRole.position >= botMember.roles.highest.position) {
        return await ctx.reply({ embeds: [makeEmbed({ title: "Configuration Error", description: "The isolation role is higher than my highest role. I cannot assign it.", level: "ERROR" })], ephemeral: true });
      }

      let durationSeconds = 600; // 10 minutes default
      let reasonStr = "No reason provided";

      if (ctx.isInteraction) {
        if (ctx.options.duration) {
          const parsed = parseDuration(ctx.options.duration);
          if (parsed) durationSeconds = parsed;
        }
        if (ctx.options.reason) {
          reasonStr = ctx.options.reason;
        }
      } else {
        const arg1 = ctx.options._args?.[1];
        const parsedArg1 = arg1 ? parseDuration(arg1) : null;
        if (parsedArg1) {
          durationSeconds = parsedArg1;
          reasonStr = ctx.options._args?.slice(2).join(" ") || "No reason provided";
        } else {
          reasonStr = ctx.options._args?.slice(1).join(" ") || "No reason provided";
        }
      }

      const result = await executeTempban({
        guild,
        moderator,
        targetMember,
        durationSeconds,
        reason: reasonStr.slice(0, 512),
      });

      if (result.success) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "User Tempbanned",
              description: `${EMOJIS.get("ban") || "🔨"} ${targetMember} isolated successfully.\n\n` +
                           `${EMOJIS.get("arrow_point") || "➡️"} **Duration:** ${result.formattedTime}\n` +
                           `${EMOJIS.get("arrow_point") || "➡️"} **Reason:** ${reasonStr}`,
              level: "SUCCESS",
            })
          ]
        });
      } else {
        return await ctx.reply({
          embeds: [makeEmbed({ title: "Execution Error", description: result.error || "Failed to apply tempban isolation.", level: "ERROR" })],
          ephemeral: true,
        });
      }
    } catch (err: any) {
      return await ctx.reply({
        embeds: [makeEmbed({ title: "Command Error", description: err?.message || "An unexpected error occurred.", level: "ERROR" })],
        ephemeral: true,
      });
    }
  },
});
