import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed, COLORS } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("skip")
  .setDescription("Skip the currently playing song (or vote skip)");

export default createCommand({
  name: "skip",
  description: "Skip the currently playing song",
  category: "Music",
  aliases: ["next", "s"],
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    const player = ctx.client.music.getPlayer(guild.id);
    if (!player || (!player.isPlaying && !player.isPaused)) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Player Inactive",
            description: "No music is currently playing to skip.",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const perm = await MusicPermissionService.checkPermission(member, player, "skip");
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

    await player.skip();
    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "⏭️ Song Skipped",
          description: `Skipped by <@${member.id}>. Advancing to next track.`,
          level: "INFO",
          color: COLORS.INFO,
        }),
      ],
    });
  },
});
