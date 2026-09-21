import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("slowmode")
  .setDescription("Set the slowmode rate limit for the current channel")
  .addIntegerOption((opt) =>
    opt
      .setName("seconds")
      .setDescription("Slowmode interval in seconds (0 to disable)")
      .setRequired(true)
      .setMinValue(0)
      .setMaxValue(21600)
  );

export default createCommand({
  name: "slowmode",
  description: "Set the slowmode rate limit for the current channel",
  category: "Channels",
  modOnly: true,
  requiredPermission: PermissionFlagsBits.ManageChannels,
  slashBuilder,

  async execute(ctx) {
    const { channel } = ctx;
    if (!channel || !channel.setRateLimitPerUser) {
      return await ctx.reply({ content: "Cannot configure slowmode in this channel type.", ephemeral: true });
    }

    const seconds = Number(ctx.options.seconds ?? ctx.options._args?.[0]) || 0;
    await channel.setRateLimitPerUser(seconds);

    const embed = makeEmbed({
      title: "Slowmode Updated",
      description:
        seconds > 0
          ? `${EMOJIS.get("success") || "⏱️"} Slowmode set to **${seconds} seconds** for ${channel}.`
          : `${EMOJIS.get("success") || "✅"} Slowmode has been **disabled** for ${channel}.`,
      level: seconds > 0 ? "WARNING" : "SUCCESS",
    });

    return await ctx.reply({ embeds: [embed] });
  },
});
