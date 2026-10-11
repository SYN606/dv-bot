import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("leave")
  .setDescription("Disconnect bot from voice channel and clear queue");

export default createCommand({
  name: "leave",
  description: "Disconnect bot from voice channel",
  category: "Music",
  aliases: ["dc", "disconnect"],
  slashBuilder,

  async execute(ctx) {
    const { guild, member } = ctx;
    if (!guild || !member) return;

    const player = ctx.client.music.getPlayer(guild.id);
    if (!player) {
      await ctx.client.music.leave(guild.id);
      return await ctx.reply({
        content: "Disconnected from voice.",
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

    await ctx.client.music.leave(guild.id);
    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "👋 Disconnected",
          description: `Left voice channel and cleared queue.`,
          level: "INFO",
        }),
      ],
    });
  },
});
