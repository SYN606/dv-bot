import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("moveall")
  .setDescription("Move all members from one voice channel to another")
  .addChannelOption((opt) =>
    opt
      .setName("source")
      .setDescription("The voice channel to move from")
      .addChannelTypes(ChannelType.GuildVoice)
      .setRequired(true)
  )
  .addChannelOption((opt) =>
    opt
      .setName("target")
      .setDescription("The voice channel to move to (defaults to your current VC)")
      .addChannelTypes(ChannelType.GuildVoice)
      .setRequired(false)
  );

export default createCommand({
  name: "moveall",
  description: "Move all members from one voice channel to another",
  category: "Voice",
  modOnly: true,
  requiredPermission: PermissionFlagsBits.MoveMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild) return;

    const sourceChannelId = (ctx.options.source || ctx.options._args?.[0])?.replace(/[<#>]/g, "");
    const targetChannelId = (ctx.options.target || ctx.options._args?.[1])?.replace(/[<#>]/g, "") || member?.voice.channelId;

    if (!targetChannelId) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Target Required",
            description: `${EMOJIS.get("fail") || "❌"} Please specify a target voice channel or join one.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const source = guild.channels.cache.get(sourceChannelId);
    const target = guild.channels.cache.get(targetChannelId);

    if (!source || !target) {
      return await ctx.reply("Invalid voice channels.");
    }

    const members = [...source.members.values()];
    for (const m of members) {
      await m.voice.setChannel(target).catch(() => {});
    }

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Members Moved",
          description: `${EMOJIS.get("success") || "✅"} Moved **${members.length}** members from **${source.name}** to **${target.name}**.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
