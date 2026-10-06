import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { unhideChannel } from "../../services/channelLockService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("unhide")
  .setDescription("Unhide a previously hidden channel to restore its visibility")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .setDMPermission(false)
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Target channel to unhide (defaults to current)")
      .setRequired(false)
  )
  .addStringOption((opt) =>
    opt
      .setName("reason")
      .setDescription("Reason for unhiding the channel")
      .setRequired(false)
  );

export default createCommand({
  name: "unhide",
  description: "Unhide a previously hidden channel to restore its visibility.",
  category: "Channels",
  usage: "[channel] [reason]",
  examples: [
    "/unhide",
    "/unhide channel:#announcements",
    "/unhide reason:Renovation complete",
  ],
  slashOnly: true,
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageChannels,
  slashBuilder,

  async execute(ctx) {
    if (!ctx.isInteraction) return;

    const { guild, channel, user } = ctx;
    if (!guild) return;

    let targetChannel = ctx.interaction?.options?.getChannel?.("channel");
    if (!targetChannel && ctx.options?.channel) {
      const channelId = typeof ctx.options.channel === "string" ? ctx.options.channel : ctx.options.channel.id;
      targetChannel =
        guild.channels.cache.get(channelId) ||
        (await guild.channels.fetch(channelId).catch(() => null));

      if (!targetChannel) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Channel Not Found",
              description: "The specified channel could not be found in this server.",
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }
    }
    if (!targetChannel) targetChannel = channel;

    const reason = ctx.interaction?.options?.getString?.("reason") || ctx.options?.reason;

    const res = await unhideChannel({
      channel: targetChannel,
      guild,
      moderator: user,
      reason,
    });

    if (res.error) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Unhide Failed",
            description: `${EMOJIS.get("fail") || "❌"} ${res.error}`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const roleLabel = res.usingVerifiedRole
      ? `\`@${res.verifiedRoleName}\` (verified members)`
      : "`@everyone`";
    const scopeNote = res.usingVerifiedRole
      ? `-# 🔐 Verification mode active — targeting **@${res.verifiedRoleName}** instead of @everyone.`
      : `-# 🌐 No verification role configured — targeting **@everyone**.`;

    if (res.notHidden) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Channel Not Hidden",
            description:
              `${EMOJIS.get("info") || "ℹ️"} ${targetChannel} is not currently hidden from ${roleLabel}.\n\n` +
              `${scopeNote}\n-# No snapshot found. The channel already has normal visibility.`,
            level: "INFO",
            color: COLORS.DARK,
            headerDivider: false,
          }),
        ],
        ephemeral: true,
      });
    }

    return await ctx.reply({
      embeds: [
        makeEmbed({
          author: { name: "Channel Visibility", iconURL: guild.iconURL?.() || undefined },
          title: "👁️ Channel Unhidden",
          description:
            `${targetChannel} is now **visible** again to ${roleLabel}.\n\n` +
            `${scopeNote}\n-# Original permission state has been fully restored.`,
          level: "SUCCESS",
          color: COLORS.DARK,
          headerDivider: false,
        }),
      ],
    });
  },
});
