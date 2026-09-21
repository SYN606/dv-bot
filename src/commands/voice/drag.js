import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("drag")
  .setDescription("Move a member to your voice channel")
  .addUserOption((opt) => opt.setName("user").setDescription("The member to move").setRequired(true));

export default createCommand({
  name: "drag",
  description: "Move a member to your voice channel",
  category: "Voice",
  modOnly: true,
  requiredPermission: PermissionFlagsBits.MoveMembers,
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    const myVoice = member.voice.channel;
    if (!myVoice) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Voice Required",
            description: `${EMOJIS.get("fail") || "❌"} You must be in a voice channel to use this command.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const targetUserId = ctx.options.user || ctx.options._args?.[0]?.replace(/[<@!>]/g, "");
    if (!targetUserId) return await ctx.reply("Please specify a user to drag.");

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

    await targetMember.voice.setChannel(myVoice).catch(() => {});

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "Member Moved",
          description: `${EMOJIS.get("success") || "✅"} Moved <@${targetUserId}> to **${myVoice.name}**.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
