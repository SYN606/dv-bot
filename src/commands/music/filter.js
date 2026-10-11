import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { FILTER_PRESETS } from "../../music/AudioFilters.js";
import { MusicPermissionService } from "../../music/MusicPermissionService.js";

const filterChoices = [
  { name: "Clear / Reset", value: "clear" },
  { name: "Bass Boost (Low)", value: "bassboost_low" },
  { name: "Bass Boost (Medium)", value: "bassboost_medium" },
  { name: "Bass Boost (High)", value: "bassboost_high" },
  { name: "Nightcore (Speed + Pitch)", value: "nightcore" },
  { name: "Vaporwave (Slowed + Lo-fi)", value: "vaporwave" },
  { name: "8D (Spatial Audio)", value: "8d" },
  { name: "Karaoke (Vocal Cut)", value: "karaoke" },
  { name: "Tremolo (Wobble)", value: "tremolo" },
  { name: "Vibrato (Vibe)", value: "vibrato" },
  { name: "Low Pass (Muffled)", value: "lowpass" },
];

const slashBuilder = new SlashCommandBuilder()
  .setName("filter")
  .setDescription("Apply or reset real-time audio filters and DSP effects")
  .addStringOption((opt) =>
    opt
      .setName("preset")
      .setDescription("Audio filter preset")
      .setRequired(true)
      .addChoices(...filterChoices)
  );

export default createCommand({
  name: "filter",
  description: "Apply audio filters and DSP effects",
  category: "Music",
  aliases: ["filters", "fx"],
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
    if (!FILTER_PRESETS[preset]) {
      return await ctx.reply({
        content: `Invalid preset. Available presets: \`${Object.keys(FILTER_PRESETS).join("`, `")}\``,
        ephemeral: true,
      });
    }

    await ctx.defer();
    await player.setFilter(preset);

    return await ctx.reply({
      embeds: [
        makeEmbed({
          title: "🎛️ Audio Filter Applied",
          description: `Filter has been set to **${preset.toUpperCase()}** by <@${member.id}>.`,
          level: "SUCCESS",
        }),
      ],
    });
  },
});
