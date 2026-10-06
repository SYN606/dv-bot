import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { sendModLog } from "../../utils/modLog.js";
import { isBotAdmin } from "../../core/permissions.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("fakeban")
  .setDescription("Simulate a user ban completely (Sends DM and custom channel warnings)")
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
  .setDMPermission(false)
  .addUserOption((opt) =>
    opt
      .setName("user")
      .setDescription("The target member to fake ban")
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("reason")
      .setDescription("The mock reason for the ban logs")
      .setRequired(false)
  );

export default createCommand({
  name: "fakeban",
  description: "Simulate a user ban completely (Sends DM and custom channel warnings)",
  category: "Moderation",
  slashOnly: true,
  modOnly: true,
  requiredPermission: PermissionFlagsBits.BanMembers,
  slashBuilder,

  async execute(ctx) {
    if (!ctx.isInteraction) return;

    const { guild, user, member, interaction } = ctx;
    if (!guild) return;

    const targetUser =
      interaction?.options?.getUser?.("user") ||
      (ctx.options.user ? await ctx.client.users.fetch(ctx.options.user).catch(() => null) : null);
    const reason = (
      interaction?.options?.getString?.("reason") ||
      ctx.options.reason ||
      "No reason provided"
    ).trim();

    if (!targetUser) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "User Not Found",
            description: `${EMOJIS.get("fail") || "❌"} Provide a valid user.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    // Permission Verification (Mimicking Python exactly)
    const hasPerms =
      member?.id === guild.ownerId ||
      member?.permissions?.has(PermissionFlagsBits.Administrator) ||
      member?.permissions?.has(PermissionFlagsBits.BanMembers) ||
      member?.permissions?.has(PermissionFlagsBits.ManageMessages);

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

    if (targetUser.id === user.id) {
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

    if (targetUser.id === guild.ownerId) {
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

    if (ctx.client?.user && targetUser.id === ctx.client.user.id) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You cannot fake ban the bot.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (targetMember) {
      const modIsOwner = guild.ownerId === user.id;
      const modIsAdmin = member?.permissions?.has(PermissionFlagsBits.Administrator);

      if (!modIsOwner && !modIsAdmin) {
        if (targetMember.permissions?.has(PermissionFlagsBits.Administrator)) {
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

        if (member && targetMember.roles?.highest && member.roles?.highest) {
          if (targetMember.roles.highest.position >= member.roles.highest.position) {
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

    await targetUser
      .send({
        embeds: [
          makeEmbed({
            title: "You Were Banned",
            description: dmDescription,
            level: "ERROR",
          }),
        ],
      })
      .catch(() => {});

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
          footerIcon: typeof user.displayAvatarURL === "function" ? user.displayAvatarURL() : null,
        }),
      ],
    });

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
