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
  aliases: ["rm", "del", "delete", "removesong", "qremove", "dequeue"],
  usage: "<order_number>",
  examples: ["/remove position:2", "-remove 2", "-rm #1", "-del 3"],
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    const player = ctx.client.music.getPlayer(guild.id);
    if (!player || player.queue.size === 0) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Queue is Empty",
            description: "There are no upcoming songs in the queue to remove.",
            level: "INFO",
          }),
        ],
        ephemeral: true,
      });
    }

    const perm = await MusicPermissionService.checkPermission(member, player, "control");
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

    const rawInput = ctx.options.position ?? ctx.options._args?.[0];
    const cleanNum = String(rawInput ?? "").replace(/^[#\s]+/, "").trim();
    const pos = parseInt(cleanNum, 10);

    if (isNaN(pos) || pos < 1) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Order Number",
            description: "Please specify a valid track order number from the queue (e.g. `/remove 1` or `-rm 2`). Use `/queue` to see the current list.",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    if (pos > player.queue.size) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Out of Bounds",
            description: `Invalid position **#${pos}**. The queue currently has **${player.queue.size}** song${player.queue.size === 1 ? "" : "s"}. Use \`/queue\` to verify order numbers.`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    const removed = player.queue.remove(pos - 1);
    if (!removed) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Removal Failed",
            description: `Could not remove track at position #${pos}.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "🗑️ Track Removed",
          description: `Removed [**${removed.info.title}**](${removed.info.uri}) from queue position **#${pos}**.`,
          fields: [
            { name: "Duration", value: removed.formattedDuration, inline: true },
            { name: "Requested By", value: removed.requester ? `<@${removed.requester.id}>` : "`Dashboard`", inline: true },
            { name: "Remaining in Queue", value: `${player.queue.size} track${player.queue.size === 1 ? "" : "s"}`, inline: true },
          ],
          thumbnail: removed.info.artworkUrl,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
