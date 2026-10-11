import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("replay")
  .setDescription("Restart the currently playing song from the beginning");

export default createCommand({
  name: "replay",
  description: "Restart current song from the beginning",
  category: "Music",
  aliases: ["restart"],
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    const player = ctx.client.music.getPlayer(guild.id);
    if (!player || !player.currentTrack) {
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

    await player.seek(0);
    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "🔄 Replaying Song",
          description: `Restarted [**${player.currentTrack.info.title}**](${player.currentTrack.info.uri}) from the beginning.`,
          level: "INFO",
        }),
      ],
    });
  },
});
