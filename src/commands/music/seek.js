import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("seek")
  .setDescription("Seek to a specific time in the current track")
  .addStringOption((opt) =>
    opt
      .setName("position")
      .setDescription("Target position in format mm:ss (e.g. 1:30) or total seconds (e.g. 90)")
      .setRequired(true)
  );

function parseTime(input) {
  if (!input) return null;
  const str = input.trim();
  if (/^\d+$/.test(str)) {
    return parseInt(str, 10) * 1000;
  }
  const parts = str.split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p))) return null;

  if (parts.length === 2) {
    return (parts[0] * 60 + parts[1]) * 1000;
  }
  if (parts.length === 3) {
    return (parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000;
  }
  return null;
}

export default createCommand({
  name: "seek",
  description: "Seek to a specific timestamp in the current track",
  category: "Music",
  usage: "<mm:ss or seconds>",
  examples: ["/seek position:1:30", "/seek position:90"],
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

    const rawPos = ctx.options.position || ctx.options._args?.[0];
    const ms = parseTime(rawPos);

    if (ms === null || ms < 0) {
      return await ctx.reply({
        content: "Invalid timestamp format. Use `mm:ss` (e.g. `1:30`) or seconds (e.g. `90`).",
        ephemeral: true,
      });
    }

    if (player.currentTrack.info.isStream) {
      return await ctx.reply({
        content: "Cannot seek inside a live audio stream.",
        ephemeral: true,
      });
    }

    if (ms > player.currentTrack.info.length) {
      return await ctx.reply({
        content: `Target position exceeds track length (${player.currentTrack.formattedDuration}).`,
        ephemeral: true,
      });
    }

    await player.seek(ms);
    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "⏩ Seek Position Updated",
          description: `Jumped to **${player.formatTime(ms)}** in [${player.currentTrack.info.title}](${player.currentTrack.info.uri}).`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
