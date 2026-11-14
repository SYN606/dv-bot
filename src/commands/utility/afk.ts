import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { setAfkStatus } from "../../db/helpers/afk.js";
import { CONFIG } from "../../config.js";
import { extractAfkMedia, resolveDirectMediaUrl, formatAfkDescription } from "../../utils/afkMedia.js";

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
    const { cleanText, mediaUrl } = extractAfkMedia(rawReason, ctx.message?.attachments);
    const resolvedMediaUrl = await resolveDirectMediaUrl(mediaUrl);

    // Save reason into database. If media was extracted, preserve it in afk_reason so mention notifications can render it.
    const reasonToSave = resolvedMediaUrl && !cleanText.includes(resolvedMediaUrl)
      ? (cleanText && cleanText.toLowerCase() !== "afk" ? `${cleanText} ${resolvedMediaUrl}` : resolvedMediaUrl)
      : cleanText;

    let originalNick = ctx.member?.nickname || null;
    const botMember = ctx.guild.members?.me;
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

    await setAfkStatus(ctx.user.id, ctx.guild.id, reasonToSave, originalNick);

    const avatar = typeof ctx.user.displayAvatarURL === "function"
      ? ctx.user.displayAvatarURL({ size: 256 })
      : undefined;

    const displayName = ctx.member?.displayName || ctx.user.displayName || ctx.user.username;
    const description = formatAfkDescription(ctx.user.id, cleanText);

    const embed = makeEmbed({
      author: {
        name: displayName,
        iconURL: avatar,
      },
      description,
      image: resolvedMediaUrl || CONFIG.AFK_IMAGE_URL || null,
      level: "SUCCESS",
      emoji: false,
      headerDivider: false,
    });

    return await ctx.reply({
      embeds: [embed],
    }).catch(async () => {
      return await ctx.reply({
        content: description,
      });
    });
  },
});
