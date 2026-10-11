import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("stop")
  .setDescription("Stop music playback, clear queue, and leave voice channel");

export default createCommand({
  name: "stop",
  description: "Stop music playback and clear queue",
  category: "Music",
  aliases: ["disconnect"],
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    const player = ctx.client.music.getPlayer(guild.id);
    if (!player) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Player Inactive",
            description: "No music is currently playing in this server.",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const perm = await MusicPermissionService.canControlMusic(member, player);
    if (!perm.allowed) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} ${perm.reason}`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    await player.stop();
    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "⏹️ Playback Stopped",
          description: `Stopped and queue cleared by <@${member.id}>.`,
          level: "INFO",
        }),
      ],
    });
  },
});
