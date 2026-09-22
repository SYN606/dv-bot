import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { sendModLog } from "../../utils/modLog.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("rename")
  .setDescription("Change or reset a member's server nickname")
  .addUserOption((opt) => opt.setName("user").setDescription("The target member").setRequired(true))
  .addStringOption((opt) => opt.setName("nickname").setDescription("The new nickname or 'reset' to clear").setRequired(true));

export default createCommand({
  name: "rename",
  description: "Change or reset a member's server nickname",
  category: "Admin",
  aliases: ["nick", "setnick"],
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageNicknames,
  slashBuilder,

  async execute(ctx) {
    const { guild, user, member: moderator } = ctx;
    if (!guild) return;

    const botMember = guild.members.me;
    if (!botMember?.permissions?.has(PermissionFlagsBits.ManageNicknames)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Permissions",
            description: `${EMOJIS.get("fail") || "❌"} I need the **Manage Nicknames** permission to change nicknames.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    let targetUserId = ctx.options.user;
    let newNick = ctx.options.nickname;

    if (!targetUserId) {
      // Prefix handling
      if (ctx.message?.mentions?.members?.first()) {
        const mentioned = ctx.message.mentions.members.first();
        targetUserId = mentioned.id;
        newNick = ctx.options._args?.slice(1).join(" ");
      } else if (ctx.options._args?.length > 1 && /^\d{17,20}$/.test(ctx.options._args[0])) {
        targetUserId = ctx.options._args[0];
        newNick = ctx.options._args.slice(1).join(" ");
      } else if (ctx.options._args?.length > 0) {
        // Renaming self if no user mentioned
        targetUserId = user.id;
        newNick = ctx.options._args.join(" ");
      }
    }

    if (!targetUserId || !newNick) {
      const prefix = ctx.client?.config?.PREFIX || "!";
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Arguments",
            description: `Usage:\n• \`${prefix}rename @user <nickname>\`\n• \`${prefix}rename @user reset\`\n• \`/rename user: @user nickname: <new nickname>\``,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (!targetMember) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Member Not Found",
            description: `${EMOJIS.get("fail") || "❌"} The specified member is not in this server.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Role hierarchy checks
    const isOwner = guild.ownerId === user.id;
    if (targetMember.id === guild.ownerId && !isOwner) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You cannot change the nickname of the server owner.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (moderator && targetMember.id !== user.id && !isOwner) {
      if (targetMember.roles.highest.position >= moderator.roles.highest.position) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Permission Denied",
              description: `${EMOJIS.get("fail") || "❌"} You cannot rename someone with an equal or higher role than yourself.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }
    }

    if (targetMember.id !== botMember.id && targetMember.roles.highest.position >= botMember.roles.highest.position) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Role Hierarchy Issue",
            description: `${EMOJIS.get("fail") || "❌"} My role is not high enough to modify ${targetMember}'s nickname.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const oldNick = targetMember.displayName;

    // Reset flow
    if (newNick.toLowerCase() === "reset") {
      if (!targetMember.nickname) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "No Nickname Set",
              description: `${EMOJIS.get("warning") || "ℹ️"} ${targetMember} does not have an active custom nickname.`,
              level: "INFO",
            }),
          ],
        });
      }

      try {
        await targetMember.setNickname(null, `Nickname reset by ${user.tag || user.username}`);
      } catch (err) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Update Failed",
              description: `${EMOJIS.get("fail") || "❌"} Failed to reset nickname: ${err?.message || "Discord API error"}.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      await sendModLog({
        guild,
        category: "MODERATION",
        title: "Nickname Reset",
        description: `<@${user.id}> reset the nickname of <@${targetMember.id}>.`,
        level: "INFO",
        actor: user,
        target: targetMember.user,
        extraFields: { "Old Nickname": oldNick },
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Nickname Reset",
            description: `${EMOJIS.get("success") || "✅"} Nickname reset successfully for ${targetMember}.`,
            level: "SUCCESS",
          }),
        ],
      });
    }

    // Sanitize nickname
    const cleaned = newNick.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
    if (cleaned.includes("@everyone") || cleaned.includes("@here")) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Nickname",
            description: `${EMOJIS.get("fail") || "❌"} Mass mentions (\`@everyone\`, \`@here\`) are not allowed in nicknames.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const clampedNick = cleaned.slice(0, 32);

    try {
      await targetMember.setNickname(clampedNick, `Nickname changed by ${user.tag || user.username}`);
    } catch (err) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Update Failed",
            description: `${EMOJIS.get("fail") || "❌"} Failed to change nickname: ${err?.message || "Discord API error"}.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    await sendModLog({
      guild,
      category: "MODERATION",
      title: "Nickname Changed",
      description: `<@${user.id}> changed the nickname of <@${targetMember.id}> to **${clampedNick}**.`,
      level: "INFO",
      actor: user,
      target: targetMember.user,
      extraFields: {
        "Old Nickname": oldNick,
        "New Nickname": clampedNick,
      },
    });

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Nickname Updated",
          description: `${EMOJIS.get("success") || "✅"} ${targetMember} is now **${clampedNick}**.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
