import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("resume")
  .setDescription("Resume paused music playback");

export default createCommand({
  name: "resume",
  description: "Resume paused music playback",
  category: "Music",
  aliases: ["unpause"],
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    const player = ctx.client.music.getPlayer(guild.id);
    if (!player || !player.isPaused) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Player Not Paused",
            description: "The player is not currently paused.",
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

    await player.resume();
    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "▶️ Playback Resumed",
          description: `Resumed by <@${member.id}>.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
