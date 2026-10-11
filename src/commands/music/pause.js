import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("pause")
  .setDescription("Pause current music playback");

export default createCommand({
  name: "pause",
  description: "Pause current music playback",
  category: "Music",
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    const player = ctx.client.music.getPlayer(guild.id);
    if (!player || !player.isPlaying) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Player Inactive",
            description: "No music is currently playing.",
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

    await player.pause();
    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "⏸️ Playback Paused",
          description: `Paused by <@${member.id}>. Use \`/resume\` to continue playback.`,
          level: "INFO",
        }),
      ],
    });
  },
});
