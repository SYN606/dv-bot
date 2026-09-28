import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { sendModLog } from "../../utils/modLog.js";
import { isBotAdmin } from "../../core/permissions.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("fakeban")
  .setDescription("Simulate a user ban completely (Sends DM and custom channel warnings)")
  .addUserOption((opt) => opt.setName("user").setDescription("The target member to fake ban (Mention or ID)").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("The mock reason for the ban logs").setRequired(false));

export default createCommand({
  name: "fakeban",
  description: "Simulate a user ban completely (Sends DM and custom channel warnings)",
  category: "Moderation",
  aliases: ["fban", "fb"],
  modOnly: true,
  slashBuilder,

  async execute(ctx) {
    const { guild, user, member, message, interaction } = ctx;
    if (!guild) return;

    let targetUserId = ctx.options.user || ctx.options._args?.[0]?.replace(/[<@!>]/g, "");
    let reason = ctx.options.reason;

    // Resolve Target (Mention, ID, or Reply)
    if (!targetUserId && message?.reference?.messageId) {
      const referenced = await ctx.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (referenced?.author) {
        targetUserId = referenced.author.id;
        if (!reason && ctx.options._args?.length > 0) {
          reason = ctx.options._args.join(" ");
        }
      }
    } else if (!reason && ctx.options._args?.length > 1) {
      reason = ctx.options._args.slice(1).join(" ");
    }

    reason = reason?.trim() || "No reason provided";

    if (!targetUserId) {
      const prefix = ctx.client?.config?.PREFIX || "!";
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "User Not Found",
            description: `${EMOJIS.get("fail") || "❌"} Provide a valid user.\nUsage: \`${prefix}fakeban <user | id | reply> [reason]\``,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Permission Verification (Mimicking Python exactly)
    const hasPerms = 
        member.id === guild.ownerId || 
        member.permissions.has(PermissionFlagsBits.Administrator) ||
        member.permissions.has(PermissionFlagsBits.BanMembers) ||
        member.permissions.has(PermissionFlagsBits.ManageMessages);

    if (!hasPerms && !(await isBotAdmin(ctx))) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You do not have permission to use mock operations.`,
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
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You cannot fake ban yourself.`,
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
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You cannot fake ban the server owner.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const targetUser = await ctx.client.users.fetch(targetUserId).catch(() => null);
    if (!targetUser) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "User Not Found",
            description: `${EMOJIS.get("fail") || "❌"} Invalid target user.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (targetMember) {
      const modIsOwner = guild.ownerId === user.id;
      const modIsAdmin = member?.permissions?.has(PermissionFlagsBits.Administrator);

      if (!modIsOwner && !modIsAdmin) {
        if (targetMember.permissions.has(PermissionFlagsBits.Administrator)) {
          return await ctx.reply({
            embeds: [
              makeEmbed({
                title: "Permission Denied",
                description: `${EMOJIS.get("fail") || "❌"} You do not have permission to fake ban an administrator.`,
                level: "ERROR",
              }),
            ],
            ephemeral: true,
          });
        }

        if (member && targetMember.roles.highest.position >= member.roles.highest.position) {
          return await ctx.reply({
            embeds: [
              makeEmbed({
                title: "Permission Denied",
                description: `${EMOJIS.get("fail") || "❌"} You cannot fake ban someone with an equal or higher role.`,
                level: "ERROR",
              }),
            ],
            ephemeral: true,
          });
        }
      }
    }

    // Send mock direct message notice
    let dmDescription = "";
    if (reason !== "No reason provided") {
      dmDescription = 
        `${EMOJIS.get("ban") || "🔨"} You were banned from **${guild.name}**\n\n` +
        `${EMOJIS.get("arrow_point") || "➡️"} **Moderator:** ${user.tag || user.username}\n` +
        `${EMOJIS.get("arrow_point") || "➡️"} **Reason:** ${reason}`;
    } else {
      dmDescription = `${EMOJIS.get("ban") || "🔨"} You were banned from **${guild.name}**.`;
    }

    await targetUser.send({
      embeds: [
        makeEmbed({
          title: "You Were Banned",
          description: dmDescription,
          level: "ERROR",
        }),
      ],
    }).catch(() => {});

    // Channel response embed
    await ctx.reply({
      embeds: [
        makeEmbed({
          title: "User Banned",
          description: 
            `${EMOJIS.get("ban") || "🔨"} **${targetUser.tag || targetUser.username}** has been banned.\n\n` +
            `${EMOJIS.get("arrow_point") || "➡️"} **Reason:** ${reason}`,
          level: "ERROR",
          footer: `Action by : ${user.tag || user.username}`,
          footerIcon: user.displayAvatarURL ? user.displayAvatarURL() : null,
        }),
      ],
    });

    // Cleanup prefix invocation message for authenticity
    if (message) {
      await message.delete().catch(() => {});
    }

    // Log mock moderation action
    await sendModLog({
      guild,
      category: "BAN",
      title: "User Banned",
      description: `<@${targetUser.id}> was banned by administrative controls.`,
      level: "ERROR",
      actor: user,
      target: targetUser,
      extraFields: {
        Reason: reason,
        Type: "Simulated Action",
      },
    }).catch((exc) => {
      console.error("Failed sending mod log for fakeban:", exc);
    });
  },
});
