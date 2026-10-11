import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const eqChoices = [
  { name: "Flat / Normal", value: "clear" },
  { name: "Pop (Enhanced Mids & Vocals)", value: "pop" },
  { name: "Rock (Strong Bass & Crisp Highs)", value: "rock" },
  { name: "Electronic / Dance (Punchy Sub & Treble)", value: "electronic" },
];

const slashBuilder = new SlashCommandBuilder()
  .setName("equalizer")
  .setDescription("Set a 15-band equalizer profile for audio playback")
  .addStringOption((opt) =>
    opt
      .setName("preset")
      .setDescription("Equalizer curve profile")
      .setRequired(true)
      .addChoices(...eqChoices)
  );

export default createCommand({
  name: "equalizer",
  description: "Set 15-band equalizer curve profile",
  category: "Music",
  aliases: ["eq"],
  usage: "<preset>",
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

    const preset = ctx.options.preset || ctx.options._args?.[0]?.toLowerCase();
    await ctx.defer();
    await player.setFilter(preset);

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "🎚️ Equalizer Profile Updated",
          description: `Equalizer set to **${preset.toUpperCase()}** profile.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
