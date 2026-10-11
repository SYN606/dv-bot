import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("loop")
  .setDescription("Set playback repeat mode")
  .addStringOption((opt) =>
    opt
      .setName("mode")
      .setDescription("Loop mode")
      .setRequired(true)
      .addChoices(
        { name: "Off (No looping)", value: "off" },
        { name: "Track (Repeat current track)", value: "track" },
        { name: "Queue (Repeat entire queue)", value: "queue" }
      )
  );

export default createCommand({
  name: "loop",
  description: "Set playback loop mode",
  category: "Music",
  aliases: ["repeat"],
  usage: "<off | track | queue>",
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    const player = ctx.client.music.getPlayer(guild.id);
    if (!player) {
      return await ctx.reply({
        content: "No active music player in this server.",
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

    const mode = ctx.options.mode || ctx.options._args?.[0]?.toLowerCase();
    if (!["off", "track", "queue"].includes(mode)) {
      return await ctx.reply({
        content: "Invalid loop mode. Choose: `off`, `track`, or `queue`.",
        ephemeral: true,
      });
    }

    player.queue.setLoopMode(mode);
    await player.updateNowPlayingMessage();

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "🔁 Loop Mode Updated",
          description: `Loop mode is now set to **${mode.toUpperCase()}**.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
