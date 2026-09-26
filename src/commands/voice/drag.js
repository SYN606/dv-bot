import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("drag")
  .setDescription("Move a member to a specified voice channel or your current channel")
  .addUserOption((opt) => opt.setName("user").setDescription("The member to move").setRequired(true))
  .addChannelOption((opt) => 
    opt.setName("channel")
       .setDescription("The voice channel to move them to (defaults to your channel)")
       .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
       .setRequired(false)
  );

export default createCommand({
  name: "drag",
  description: "Move a member to a specified voice channel or your current channel",
  category: "Voice",
  modOnly: true,
  slashOnly: true,
  requiredPermission: PermissionFlagsBits.MoveMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    // Resolve target user
    const targetUserId = ctx.options.user?.id || ctx.options.user;
    if (!targetUserId) {
      return await ctx.reply("Please specify a user to drag.");
    }

    const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
    if (!targetMember || !targetMember.voice.channel) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Member Not In Voice",
            description: `${EMOJIS.get("warning") || "⚠️"} <@${targetUserId}> is not connected to any voice channel.`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    // Resolve target channel
    const targetChannel = ctx.options.channel 
      ? guild.channels.cache.get(ctx.options.channel.id || ctx.options.channel) 
      : member.voice.channel;

    if (!targetChannel || (targetChannel.type !== ChannelType.GuildVoice && targetChannel.type !== ChannelType.GuildStageVoice)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Channel",
            description: `${EMOJIS.get("fail") || "❌"} You must specify a valid voice channel or be in one yourself.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    await targetMember.voice.setChannel(targetChannel).catch(() => {});

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Member Moved",
          description: `${EMOJIS.get("success") || "✅"} Moved <@${targetUserId}> to **${targetChannel.name}**.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
