import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { setAfkStatus } from "../../db/helpers/afk.js";
import { CONFIG } from "../../config.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("afk")
  .setDescription("Set your Away-From-Keyboard status for this server")
  .addStringOption((opt) => opt.setName("reason").setDescription("Why are you going AFK?").setRequired(false));

export default createCommand({
  name: "afk",
  description: "Set your Away-From-Keyboard status for this server",
  category: "Utility",
  usage: "[reason]",
  examples: [
    "/afk",
    "/afk reason:Studying for exams",
    "dvafk Taking a quick break",
  ],
  slashBuilder,

  async execute(ctx) {
    if (!ctx.guild) {
      return await ctx.reply({
        content: "The AFK command can only be used inside a server.",
        ephemeral: true,
      });
    }

    const rawReason = ctx.options.reason || ctx.options.raw || "AFK";
    const reason = rawReason.slice(0, 200).replace(/[`\r\n]+/g, " ").trim() || "AFK";

    let originalNick = ctx.member?.nickname || null;
    const botMember = ctx.guild.members?.me || ctx.guild.me;
    const isOwner = ctx.guild.ownerId === ctx.user.id;
    const botHasHigherRole =
      botMember?.roles?.highest && ctx.member?.roles?.highest
        ? botMember.roles.highest.position > ctx.member.roles.highest.position
        : false;

    if (
      ctx.member &&
      !isOwner &&
      botMember?.permissions?.has("ManageNicknames") &&
      botHasHigherRole &&
      !ctx.member.permissions.has("Administrator")
    ) {
      // Strip off any existing [AFK] prefix from displayName to prevent nested [AFK] [AFK] tags
      const cleanName = ctx.member.displayName.replace(/^(\[AFK\]\s*)+/i, "").trim() || ctx.user.username;
      const newNick = `[AFK] ${cleanName}`.slice(0, 32);
      if (ctx.member.displayName !== newNick) {
        await ctx.member.setNickname(newNick).catch(() => {});
      }
    }

    await setAfkStatus(ctx.user.id, ctx.guild.id, reason, originalNick);

    const avatar = typeof ctx.user.displayAvatarURL === "function"
      ? ctx.user.displayAvatarURL({ dynamic: true, size: 256 })
      : undefined;

    const embed = makeEmbed({
      author: {
        name: "Away From Keyboard",
        iconURL: avatar,
      },
      title: `${ctx.user.username} is now AFK`,
      description:
        `• **Reason:** \`${reason}\`\n\n` +
        `-# Sending a message in this server will clear your AFK status and show any mentions you received.`,
      thumbnail: avatar,
      image: CONFIG.AFK_IMAGE_URL || null,
      level: "SUCCESS",
      headerDivider: false,
    });

    return await ctx.reply({
      embeds: [embed],
    }).catch(async () => {
      return await ctx.reply({
        content: `✅ **${ctx.user.username}** is now AFK: \`${reason}\``,
      });
    });
  },
});
