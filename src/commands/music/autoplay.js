import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("autoplay")
  .setDescription("Toggle automatic continuous track playback when queue ends")
  .addBooleanOption((opt) =>
    opt.setName("enabled").setDescription("Enable or disable autoplay").setRequired(false)
  );

export default createCommand({
  name: "autoplay",
  description: "Toggle automatic track recommendations when queue ends",
  category: "Music",
  aliases: ["ap"],
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

    const explicit = ctx.options.enabled;
    const newState = explicit !== undefined ? explicit : !player.queue.autoplay;
    player.queue.setAutoplay(newState);

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "📻 Autoplay Toggled",
          description: `Autoplay is now **${newState ? "ENABLED" : "DISABLED"}**. ${newState ? "Similar tracks will be queued automatically when current queue empties." : ""}`,
          level: "INFO",
        }),
      ],
    });
  },
});
