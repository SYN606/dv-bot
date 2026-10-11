import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("shuffle")
  .setDescription("Randomly shuffle all tracks in the queue");

export default createCommand({
  name: "shuffle",
  description: "Shuffle all upcoming tracks in the queue",
  category: "Music",
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    const player = ctx.client.music.getPlayer(guild.id);
    if (!player || player.queue.size < 2) {
      return await ctx.reply({
        content: "Queue must have at least 2 tracks to shuffle.",
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

    player.queue.shuffle();

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "🔀 Queue Shuffled",
          description: `Randomized **${player.queue.size}** songs in the queue.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
