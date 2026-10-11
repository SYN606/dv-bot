import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("join")
  .setDescription("Connect bot to your current voice channel");

export default createCommand({
  name: "join",
  description: "Connect bot to your current voice channel",
  category: "Music",
  aliases: ["connect"],
  slashBuilder,

  async execute(ctx) {
    const { guild, member, channel } = ctx;
    if (!guild || !member) return;

    const voiceChannel = member.voice?.channel;
    if (!voiceChannel) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Voice Channel Required",
            description: `${EMOJIS.get("warning") || "⚠️"} You must be connected to a voice channel.`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    try {
      await ctx.client.music.join({
        guildId: guild.id,
        voiceChannelId: voiceChannel.id,
        textChannelId: channel.id,
      });

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "🔊 Connected to Voice",
            description: `Joined <#${voiceChannel.id}>. Ready to play music!`,
            level: "SUCCESS",
          }),
        ],
      });
    } catch (err) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Connection Failed",
            description: `${EMOJIS.get("fail") || "❌"} ${err.message}`,
            level: "ERROR",
          }),
        ],
      });
    }
  },
});
