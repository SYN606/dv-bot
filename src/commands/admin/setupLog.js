import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { ModerationLogConfig } from "../../db/models/index.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("setup_log")
  .setDescription("Configure the moderation audit log channel")
  .addChannelOption((opt) =>
    opt
      .setName("channel")
      .setDescription("The channel to send moderation audit logs to (omit to disable)")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  );

export default createCommand({
  name: "setup_log",
  description: "Configure the moderation audit log channel",
  category: "Admin",
  configOnly: true,
  requiredPermission: PermissionFlagsBits.ManageGuild,
  slashBuilder,

  async execute(ctx) {
    const { guild } = ctx;
    if (!guild) return;

    const channelId = ctx.options.channel || ctx.options._args?.[0]?.replace(/[<#>]/g, "");

    if (!channelId) {
      await ModerationLogConfig.destroy({ where: { guild_id: String(guild.id) } });
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Mod Log Disabled",
            description: `${EMOJIS.get("success") || "✅"} Moderation logging has been **disabled** for this server.`,
            level: "SUCCESS",
          }),
        ],
      });
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) return await ctx.reply("Channel not found.");

    await ModerationLogConfig.upsert({
      guild_id: String(guild.id),
      channel_id: String(channel.id),
      enabled: true,
    });

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Mod Log Configured",
          description: `${EMOJIS.get("success") || "✅"} Moderation audit logs will now be sent to ${channel}.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
