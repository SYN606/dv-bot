import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { lockChannel, parseDuration } from "../../services/channelLockService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("lock")
  .setDescription("Lock a channel or thread to prevent members from sending messages")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .setDMPermission(false)
  .addStringOption((opt) =>
    opt
      .setName("duration")
      .setDescription("Optional timed lock duration (e.g. 10m, 1h, 1d)")
      .setRequired(false)
  )
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("Target channel to lock (defaults to current)")
      .setRequired(false)
  )
  .addStringOption((opt) =>
    opt
      .setName("reason")
      .setDescription("Reason for the lockdown")
      .setRequired(false)
  );

export default createCommand({
  name: "lock",
  description: "Lock a channel or thread to prevent members from sending messages.",
  category: "Channels",
  usage: "[duration] [channel] [reason]",
  examples: [
    "/lock",
    "/lock duration:15m reason:Raid containment",
    "/lock channel:#general duration:2h",
  ],
  slashOnly: true,
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageChannels,
  slashBuilder,

  async execute(ctx) {
    if (!ctx.isInteraction) return;

    const { guild, channel, user } = ctx;
    if (!guild) return;

    await ctx.defer({ ephemeral: false });

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

    const durationStr = ctx.interaction?.options?.getString?.("duration") || ctx.options?.duration;
    const reason = ctx.interaction?.options?.getString?.("reason") || ctx.options?.reason;

    if (durationStr && !parseDuration(durationStr)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Duration",
            description: "Please specify a valid duration format, such as `10m`, `1h`, or `1d`.",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const res = await lockChannel({
      channel: targetChannel,
      guild,
      moderator: user,
      durationStr,
      reason,
    });

    if (res.error) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Lock Failed",
            description: `${EMOJIS.get("fail") || "❌"} ${res.error}`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    if (res.alreadyLocked) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Already Locked",
            description: `${EMOJIS.get("warning") || "⚠️"} ${targetChannel} is already locked.`,
            level: "WARNING",
            color: COLORS.DARK,
            headerDivider: false,
          }),
        ],
        ephemeral: true,
      });
    }

    if (res.isThread) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            author: { name: "Thread Management", iconURL: guild.iconURL?.() || undefined },
            title: "🔒 Thread Locked",
            description: `${targetChannel} has been **locked**.`,
            level: "WARNING",
            color: COLORS.DARK,
            headerDivider: false,
            emoji: false,
          }),
        ],
      });
    }

    const description = res.expiryUnix
      ? `${targetChannel} has been **locked**.\n\n⏱️ **Auto-Unlocks:** <t:${res.expiryUnix}:R>`
      : `${targetChannel} has been **locked**.`;

    return await ctx.reply({
      embeds: [
        makeEmbed({
          author: { name: "Channel Lockdown", iconURL: guild.iconURL?.() || undefined },
          title: "🔒 Channel Locked",
          description,
          level: "WARNING",
          color: COLORS.DARK,
          headerDivider: false,
          emoji: false,
        }),
      ],
    });
  },
});
