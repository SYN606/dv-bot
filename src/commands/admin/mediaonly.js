import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import {
  getMediaOnlyChannel,
  removeMediaOnlyChannel,
  setMediaOnlyChannel,
} from "../../db/helpers/mediaOnly.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("media_only")
  .setDescription("Configure a channel to allow only media (images/videos/links)")
  .addSubcommand((sub) =>
    sub
      .setName("enable")
      .setDescription("Enable media-only restrictions on a channel")
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("Target channel").addChannelTypes(ChannelType.GuildText).setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("disable")
      .setDescription("Disable media-only restrictions on a channel")
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("Target channel").addChannelTypes(ChannelType.GuildText).setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("status")
      .setDescription("Check media-only status for a channel")
      .addChannelOption((opt) =>
        opt.setName("channel").setDescription("Target channel").addChannelTypes(ChannelType.GuildText).setRequired(false)
      )
  );

export default createCommand({
  name: "media_only",
  description: "Configure a channel to allow only media",
  category: "Admin",
  configOnly: true,
  requiredPermission: PermissionFlagsBits.ManageChannels,
  slashBuilder,

  async execute(ctx) {
    const { guild, channel } = ctx;
    if (!guild) return;

    const sub = ctx.subcommand || ctx.options._args?.[0] || "status";
    const channelId = ctx.options.channel || ctx.options._args?.[1]?.replace(/[<#>]/g, "");
    const targetChannel = channelId ? guild.channels.cache.get(channelId) || channel : channel;

    if (sub === "enable") {
      await setMediaOnlyChannel(guild.id, targetChannel.id, {
        image_only: true,
        auto_mute: false,
        nsfw_bypass: true,
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Media-Only Enabled",
            description: `${EMOJIS.get("success") || "✅"} ${targetChannel} is now configured as a **Media-Only** channel. Non-media messages will be deleted automatically.`,
            level: "SUCCESS",
          }),
        ],
      });
    }

    if (sub === "disable") {
      const removed = await removeMediaOnlyChannel(guild.id, targetChannel.id);
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: removed ? "Media-Only Disabled" : "Not Configured",
            description: removed
              ? `${EMOJIS.get("success") || "✅"} Media-only policy removed from ${targetChannel}.`
              : `${EMOJIS.get("warning") || "⚠️"} ${targetChannel} was not configured as a media-only channel.`,
            level: removed ? "SUCCESS" : "WARNING",
          }),
        ],
      });
    }

    if (sub === "status") {
      const config = await getMediaOnlyChannel(guild.id, targetChannel.id);
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: `Media-Only Status • #${targetChannel.name}`,
            description: config
              ? `${EMOJIS.get("green_dot") || "🟢"} **Status:** Enabled\n• **Auto Delete:** Active\n• **NSFW Bypass:** ${config.nsfw_bypass ? "Yes" : "No"}`
              : `${EMOJIS.get("red_dot") || "🔴"} **Status:** Disabled`,
            level: config ? "INFO" : "WARNING",
          }),
        ],
      });
    }
  },
});
