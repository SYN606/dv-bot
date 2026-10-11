import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("clear")
  .setDescription("Clear all upcoming songs from the queue");

export default createCommand({
  name: "clear",
  description: "Clear all songs from the queue",
  category: "Music",
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    const player = ctx.client.music.getPlayer(guild.id);
    if (!player || player.queue.size === 0) {
      return await ctx.reply({
        content: "The queue is already empty.",
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

    const count = player.queue.size;
    player.queue.clear();

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "🧹 Queue Cleared",
          description: `Removed **${count}** songs from the queue. Current track continues playing.`,
          level: "INFO",
        }),
      ],
    });
  },
});
