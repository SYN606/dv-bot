import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { hideChannel } from "../../services/channelLockService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("hide")
  .setDescription("Hide a channel to make it invisible to non-staff members")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .setDMPermission(false)
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Target channel to hide (defaults to current)")
      .setRequired(false)
  )
  .addStringOption((opt) =>
    opt
      .setName("reason")
      .setDescription("Reason for hiding the channel")
      .setRequired(false)
  );

export default createCommand({
  name: "hide",
  description: "Hide a channel to make it invisible to non-staff members.",
  category: "Channels",
  usage: "[channel] [reason]",
  examples: [
    "/hide",
    "/hide channel:#secret-chat",
    "/hide reason:Under renovation",
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

    const res = await hideChannel({
      channel: targetChannel,
      guild,
      moderator: user,
      reason,
    });

    if (res.error) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Hide Failed",
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

    if (res.alreadyHidden) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Already Hidden",
            description:
              `${EMOJIS.get("warning") || "⚠️"} ${targetChannel} is already hidden from ${roleLabel}.\n\n` +
              `${scopeNote}\n-# Use \`/unhide\` to make it visible again.`,
            level: "WARNING",
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
          title: "🙈 Channel Hidden",
          description:
            `${targetChannel} is now **hidden** from ${roleLabel}.\n\n` +
            `${scopeNote}\n-# Use \`/unhide\` to restore original visibility.`,
          level: "WARNING",
          color: COLORS.DARK,
          headerDivider: false,
        }),
      ],
    });
  },
});
