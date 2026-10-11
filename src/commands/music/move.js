import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("move")
  .setDescription("Move a track to a different position in the queue")
  .addIntegerOption((opt) =>
    opt.setName("from").setDescription("Current position number").setMinValue(1).setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt.setName("to").setDescription("New target position number").setMinValue(1).setRequired(true)
  );

export default createCommand({
  name: "move",
  description: "Move a track position in the queue",
  category: "Music",
  aliases: ["mv"],
  usage: "<from> <to>",
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    const player = ctx.client.music.getPlayer(guild.id);
    if (!player || player.queue.size < 2) {
      return await ctx.reply({
        content: "Queue must have at least 2 tracks to reorder.",
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

    const from = (ctx.options.from || parseInt(ctx.options._args?.[0], 10)) - 1;
    const to = (ctx.options.to || parseInt(ctx.options._args?.[1], 10)) - 1;

    const moved = player.queue.move(from, to);
    if (!moved) {
      return await ctx.reply({
        content: `Invalid positions. Range must be between 1 and ${player.queue.size}.`,
        ephemeral: true,
      });
    }

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "↕️ Track Moved",
          description: `Moved [**${moved.info.title}**](${moved.info.uri}) to position #${to + 1}.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
