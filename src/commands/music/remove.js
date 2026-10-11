import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("remove")
  .setDescription("Remove a song from the queue by its position number")
  .addIntegerOption((opt) =>
    opt.setName("position").setDescription("Track number in /queue").setMinValue(1).setRequired(true)
  );

export default createCommand({
  name: "remove",
  description: "Remove a song from the queue",
  category: "Music",
  aliases: ["rm"],
  usage: "<position>",
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    const player = ctx.client.music.getPlayer(guild.id);
    if (!player || player.queue.size === 0) {
      return await ctx.reply({
        content: "The queue is currently empty.",
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

    const pos = ctx.options.position || parseInt(ctx.options._args?.[0], 10);
    if (!pos || isNaN(pos)) {
      return await ctx.reply({
        content: "Please provide a valid track position number from the queue.",
        ephemeral: true,
      });
    }

    const removed = player.queue.remove(pos - 1);
    if (!removed) {
      return await ctx.reply({
        content: `Invalid position #${pos}. There are only ${player.queue.size} songs in the queue.`,
        ephemeral: true,
      });
    }

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "🗑️ Track Removed",
          description: `Removed [**${removed.info.title}**](${removed.info.uri}) from position #${pos}.`,
          level: "INFO",
        }),
      ],
    });
  },
});
