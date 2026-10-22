import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { sendModLog } from "../../utils/modLog.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("nick")
  .setDescription("Change or reset a nickname (self or another member)")
  .addStringOption((opt) =>
    opt
      .setName("nickname")
      .setDescription("The new nickname, or 'reset' to clear")
      .setRequired(true)
      .setMaxLength(32)
  )
  .addUserOption((opt) =>
    opt
      .setName("user")
      .setDescription("Target member (leave empty to rename yourself)")
      .setRequired(false)
  );

export default createCommand({
  name: "nick",
  description: "Change or reset a nickname (self or another member)",
  category: "Utility",
  aliases: ["rename", "setnick", "selfnick"],
  usage: "[user] <nickname> | reset",
  examples: [
    "/nick nickname:Ace",
    "/nick user:@User nickname:Ace",
    "/nick nickname:reset",
    "dvnick Ace",
    "dvnick @User Ace",
    "dvnick reset",
  ],
  slashBuilder,

  async execute(ctx) {
    const { guild, user, member: callerMember } = ctx;
    if (!guild) {
      return await ctx.reply({
        content: "This command can only be used in a server.",
        ephemeral: true,
      });
    }

    // 1. Check Bot permissions
    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (!botMember?.permissions?.has(PermissionFlagsBits.ManageNicknames)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Bot Missing Permission",
            description: `${EMOJIS.get("fail") || "❌"} I need the **Manage Nicknames** permission in this server to modify nicknames.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // 2. Resolve Target & Nickname arguments
    let targetUserId = ctx.options.user;
    let newNick = ctx.options.nickname;

    if (!newNick && !targetUserId) {
      // Prefix handling
      if (ctx.message?.mentions?.members?.first()) {
        const mentioned = ctx.message.mentions.members.first();
        targetUserId = mentioned.id;
        newNick = ctx.options._args?.filter((arg) => !arg.includes(mentioned.id)).join(" ");
      } else if (ctx.options._args?.length > 1 && /^\d{17,20}$/.test(ctx.options._args[0])) {
        targetUserId = ctx.options._args[0];
        newNick = ctx.options._args.slice(1).join(" ");
      } else if (ctx.options._args?.length > 1 && /^\d{17,20}$/.test(ctx.options._args[1])) {
        targetUserId = ctx.options._args[1];
        newNick = ctx.options._args.filter((_, i) => i !== 1).join(" ");
      } else if (ctx.options._args?.length > 0) {
        // Renaming self if no user was mentioned
        targetUserId = user.id;
        newNick = ctx.options._args.join(" ");
      }
    } else if (newNick && !targetUserId) {
      // Slash command: user omitted -> target is self
      targetUserId = user.id;
    }

    if (!targetUserId || !newNick || !newNick.trim()) {
      const prefix = ctx.client?.config?.PREFIX || "!";
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Missing Arguments",
            description:
              `**Usage:**\n` +
              `• \`/nick nickname: <new nickname>\` *(self-rename)*\n` +
              `• \`/nick user: @User nickname: <new nickname>\` *(rename member)*\n` +
              `• \`/nick nickname: reset\` *(reset your own nickname)*\n` +
              `• \`${prefix}nick <new nickname>\`\n` +
              `• \`${prefix}nick @User <new nickname>\``,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const isSelf = targetUserId === user.id;

    // 3. Resolve Target Member
    const targetMember = isSelf
      ? callerMember
      : (guild.members.cache.get(targetUserId) || (await guild.members.fetch(targetUserId).catch(() => null)));

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

    const isOwner = guild.ownerId === user.id;

    // 4. Permission Validation
    if (isSelf) {
      // Self-rename requires ChangeNickname (or ManageNicknames / Admin / Owner)
      const canChangeNick =
        isOwner ||
        callerMember?.permissions?.has(PermissionFlagsBits.ChangeNickname) ||
        callerMember?.permissions?.has(PermissionFlagsBits.ManageNicknames) ||
        callerMember?.permissions?.has(PermissionFlagsBits.Administrator);

      if (!canChangeNick) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Permission Denied",
              description: `${EMOJIS.get("fail") || "❌"} You do not have the **Change Nickname** permission in this server.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }
    } else {
      // Renaming another member requires ManageNicknames or Administrator
      const canManageNick =
        isOwner ||
        callerMember?.permissions?.has(PermissionFlagsBits.ManageNicknames) ||
        callerMember?.permissions?.has(PermissionFlagsBits.Administrator);

      if (!canManageNick) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Permission Denied",
              description: `${EMOJIS.get("fail") || "❌"} You need the **Manage Nicknames** permission to change another member's nickname.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      // Hierarchy: Moderator cannot rename someone with an equal or higher role
      if (callerMember && !isOwner) {
        if (targetMember.roles.highest.position >= callerMember.roles.highest.position) {
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
    }

    // 5. Discord API Restriction: Server Owner cannot be renamed by bots
    if (targetMember.id === guild.ownerId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: isSelf ? "Action Not Permitted" : "Permission Denied",
            description: isSelf
              ? `${EMOJIS.get("warning") || "⚠️"} Discord does not permit bots to change the server owner's nickname. Please change your nickname manually in server settings.`
              : `${EMOJIS.get("fail") || "❌"} You cannot change the nickname of the server owner.`,
            level: isSelf ? "WARNING" : "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // 6. Bot Role Hierarchy Check
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
    const trimmedNick = newNick.trim();

    // 7. Reset Flow
    if (trimmedNick.toLowerCase() === "reset") {
      if (!targetMember.nickname) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "No Custom Nickname",
              description: isSelf
                ? `${EMOJIS.get("info") || "ℹ️"} You do not have an active custom nickname. Your display name is already your default username (**${user.username}**).`
                : `${EMOJIS.get("info") || "ℹ️"} ${targetMember} does not have an active custom nickname.`,
              level: "INFO",
            }),
          ],
          ephemeral: isSelf,
        });
      }

      const auditReason = isSelf
        ? `Nickname self-reset by ${user.tag || user.username}`
        : `Nickname reset by ${user.tag || user.username}`;

      try {
        await targetMember.setNickname(null, auditReason);
      } catch (err) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Reset Failed",
              description: `${EMOJIS.get("fail") || "❌"} Failed to reset nickname: ${err?.message || "Discord API error"}.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      await sendModLog({
        guild,
        category: "NICKNAME",
        title: isSelf ? "Self Nickname Reset" : "Nickname Reset",
        description: isSelf
          ? `<@${user.id}> reset their nickname back to **${user.username}**.`
          : `<@${user.id}> reset the nickname of <@${targetMember.id}>.`,
        level: "INFO",
        actor: user,
        target: targetMember.user || targetMember,
        extraFields: { "Previous Display Name": oldNick },
      }).catch(() => {});

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Nickname Reset",
            description: isSelf
              ? `${EMOJIS.get("success") || "✅"} Your nickname has been reset back to **${user.username}**.`
              : `${EMOJIS.get("success") || "✅"} Nickname reset successfully for ${targetMember}.`,
            level: "SUCCESS",
          }),
        ],
      });
    }

    // 8. Sanitize & Validate Nickname
    const cleaned = trimmedNick.replace(/[\u200B-\u200D\uFEFF]/g, "").trim();

    if (!cleaned) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Nickname",
            description: `${EMOJIS.get("fail") || "❌"} Nickname cannot be empty or contain only invisible / zero-width characters.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

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

    if (targetMember.nickname === clampedNick) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "No Change",
            description: isSelf
              ? `${EMOJIS.get("info") || "ℹ️"} Your nickname is already set to **${clampedNick}**.`
              : `${EMOJIS.get("info") || "ℹ️"} ${targetMember}'s nickname is already set to **${clampedNick}**.`,
            level: "INFO",
          }),
        ],
        ephemeral: true,
      });
    }

    // 9. Apply Nickname
    const auditReason = isSelf
      ? `Nickname self-changed by ${user.tag || user.username}`
      : `Nickname changed by ${user.tag || user.username}`;

    try {
      await targetMember.setNickname(clampedNick, auditReason);
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
      category: "NICKNAME",
      title: isSelf ? "Self Nickname Changed" : "Nickname Changed",
      description: isSelf
        ? `<@${user.id}> changed their nickname to **${clampedNick}**.`
        : `<@${user.id}> changed the nickname of <@${targetMember.id}> to **${clampedNick}**.`,
      level: "INFO",
      actor: user,
      target: targetMember.user || targetMember,
      extraFields: {
        "Previous Display Name": oldNick,
        "New Nickname": clampedNick,
      },
    }).catch(() => {});

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Nickname Updated",
          description: isSelf
            ? `${EMOJIS.get("success") || "✅"} Your nickname has been changed to **${clampedNick}**.`
            : `${EMOJIS.get("success") || "✅"} ${targetMember} is now **${clampedNick}**.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
