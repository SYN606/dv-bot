import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  MessageFlags,
} from "discord.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";
import { FILTER_PRESETS } from "./AudioFilters.js";
import { MusicPermissionService } from "./MusicPermissionService.js";
import { logger } from "../utils/logger.js";

/**
 * Builds the interactive button rows for the Now Playing message
 * @param {string} guildId
 * @param {boolean} isPaused
 * @param {string} loopMode ("off" | "track" | "queue")
 * @returns {ActionRowBuilder[]}
 */
export function createMusicControlComponents(guildId, isPaused = false, loopMode = "off") {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`music:prev:${guildId}`)
      .setLabel("Previous")
      .setEmoji("⏮️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`music:playpause:${guildId}`)
      .setLabel(isPaused ? "Resume" : "Pause")
      .setEmoji(isPaused ? "▶️" : "⏸️")
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`music:skip:${guildId}`)
      .setLabel("Skip")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`music:stop:${guildId}`)
      .setLabel("Stop")
      .setEmoji("⏹️")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`music:shuffle:${guildId}`)
      .setLabel("Shuffle")
      .setEmoji("🔀")
      .setStyle(ButtonStyle.Secondary)
  );

  const loopLabel =
    loopMode === "track" ? "Loop: Track" : loopMode === "queue" ? "Loop: Queue" : "Loop: Off";
  const loopStyle = loopMode === "off" ? ButtonStyle.Secondary : ButtonStyle.Success;

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`music:loop:${guildId}`)
      .setLabel(loopLabel)
      .setEmoji("🔁")
      .setStyle(loopStyle),
    new ButtonBuilder()
      .setCustomId(`music:voldown:${guildId}`)
      .setLabel("Vol -10%")
      .setEmoji("🔉")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`music:volup:${guildId}`)
      .setLabel("Vol +10%")
      .setEmoji("🔊")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`music:queue:${guildId}`)
      .setLabel("Queue")
      .setEmoji("📜")
      .setStyle(ButtonStyle.Secondary)
  );

  const filterMenu = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`music:filter:${guildId}`)
      .setPlaceholder("⚡ Select an Audio Filter Preset")
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel("Clear / Normal")
          .setValue("clear")
          .setDescription("Reset all filters to default flat EQ")
          .setEmoji("✨"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Bass Boost (Medium)")
          .setValue("bassboost_medium")
          .setDescription("Rich deep bass punch")
          .setEmoji("🔊"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Bass Boost (High)")
          .setValue("bassboost_high")
          .setDescription("Heavy sub-bass enhancement")
          .setEmoji("💥"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Nightcore")
          .setValue("nightcore")
          .setDescription("Speed up pitch and tempo (1.25x)")
          .setEmoji("🌙"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Vaporwave")
          .setValue("vaporwave")
          .setDescription("Slowed down lo-fi aesthetic (0.85x)")
          .setEmoji("🌊"),
        new StringSelectMenuOptionBuilder()
          .setLabel("8D Audio")
          .setValue("8d")
          .setDescription("Rotating binaural 360 audio effect")
          .setEmoji("🎧"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Karaoke")
          .setValue("karaoke")
          .setDescription("Vocal suppression / attenuation")
          .setEmoji("🎤"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Rock EQ")
          .setValue("rock")
          .setDescription("Enhanced highs and lows for rock/metal")
          .setEmoji("🎸"),
        new StringSelectMenuOptionBuilder()
          .setLabel("Electronic EQ")
          .setValue("electronic")
          .setDescription("Boosted lows and crisp highs for EDM")
          .setEmoji("⚡")
      )
  );

  return [row1, row2, filterMenu];
}

/**
 * Handles incoming button and select-menu interactions for the music player
 */
export class MusicInteractionHandler {
  constructor(musicManager) {
    this.musicManager = musicManager;
  }

  /**
   * Main interaction dispatcher for component clicks
   * @param {import("discord.js").Interaction} interaction
   */
  async handle(interaction) {
    if (!interaction.customId || !interaction.customId.startsWith("music:")) return;

    const parts = interaction.customId.split(":");
    const action = parts[1];
    const targetGuildId = parts[2];

    // Security check: guild mismatch
    if (interaction.guildId !== targetGuildId) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Player Control",
            description: "❌ This player belongs to another server.",
            level: "ERROR",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const player = this.musicManager.getPlayer(interaction.guildId);
    if (!player) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Player Inactive",
            description: "No music is currently playing in this server.",
            level: "WARNING",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Permission and Voice Channel check
    const perm = await MusicPermissionService.canControlMusic(interaction.member, player);
    if (!perm.allowed) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Control Denied",
            description: perm.reason,
            level: "ERROR",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      switch (action) {
        case "playpause": {
          if (player.isPaused) {
            await player.resume();
            await interaction.deferUpdate().catch(() => {});
          } else {
            await player.pause();
            await interaction.deferUpdate().catch(() => {});
          }
          break;
        }

        case "skip": {
          const skipResult = await player.skip(interaction.member.id);
          if (skipResult.skipped) {
            await interaction.reply({
              content: `⏭️ Skipped by <@${interaction.member.id}>!`,
              flags: MessageFlags.Ephemeral,
            });
          } else {
            await interaction.reply({
              content: `🗳️ Vote registered! (${skipResult.votes}/${skipResult.required} votes needed to skip)`,
              flags: MessageFlags.Ephemeral,
            });
          }
          break;
        }

        case "prev": {
          const ok = await player.previous();
          if (ok) {
            await interaction.deferUpdate().catch(() => {});
          } else {
            await interaction.reply({
              content: "⏮️ No previous track available in history.",
              flags: MessageFlags.Ephemeral,
            });
          }
          break;
        }

        case "stop": {
          await player.stop();
          await interaction.reply({
            content: `⏹️ Playback stopped and queue cleared by <@${interaction.member.id}>.`,
          });
          break;
        }

        case "shuffle": {
          player.queue.shuffle();
          await interaction.reply({
            content: `🔀 Queue shuffled (${player.queue.size} songs).`,
            flags: MessageFlags.Ephemeral,
          });
          break;
        }

        case "loop": {
          const modes = ["off", "track", "queue"];
          const currentIdx = modes.indexOf(player.queue.loopMode);
          const nextMode = modes[(currentIdx + 1) % modes.length];
          player.queue.setLoopMode(nextMode);

          // Update now playing controls
          await player.updateNowPlayingMessage();
          await interaction.deferUpdate().catch(() => {});
          break;
        }

        case "voldown": {
          const newVol = Math.max(0, player.volume - 10);
          await player.setVolume(newVol);
          await interaction.reply({
            content: `🔉 Volume set to **${newVol}%**`,
            flags: MessageFlags.Ephemeral,
          });
          break;
        }

        case "volup": {
          const newVol = Math.min(200, player.volume + 10);
          await player.setVolume(newVol);
          await interaction.reply({
            content: `🔊 Volume set to **${newVol}%**`,
            flags: MessageFlags.Ephemeral,
          });
          break;
        }

        case "queue": {
          const tracks = player.queue.tracks;
          if (tracks.length === 0) {
            return await interaction.reply({
              embeds: [
                makeEmbed({
                  title: "Queue is Empty",
                  description: "There are no upcoming tracks in the queue.",
                  level: "INFO",
                }),
              ],
              flags: MessageFlags.Ephemeral,
            });
          }

          const pageTracks = tracks.slice(0, 10);
          const list = pageTracks
            .map(
              (t, i) =>
                `\`${i + 1}.\` [**${t.info.title}**](${t.info.uri}) (\`${t.formattedDuration}\`) — <@${t.requester?.id || "Unknown"}>`
            )
            .join("\n");

          const embed = makeEmbed({
            title: `📜 Upcoming Queue (${tracks.length} tracks)`,
            description: `${list}${tracks.length > 10 ? `\n\n*...and ${tracks.length - 10} more songs.*` : ""}`,
            level: "PRIMARY",
            color: COLORS.PRIMARY,
          });

          await interaction.reply({
            embeds: [embed],
            flags: MessageFlags.Ephemeral,
          });
          break;
        }

        case "filter": {
          if (!interaction.isStringSelectMenu()) return;
          const selected = interaction.values[0];
          await player.setFilter(selected);

          await interaction.reply({
            content: `⚡ Audio filter set to **${selected.toUpperCase()}**`,
            flags: MessageFlags.Ephemeral,
          });
          break;
        }

        default:
          await interaction.deferUpdate().catch(() => {});
          break;
      }
    } catch (err) {
      logger.error(`[MUSIC INTERACTION ERROR] ${action}:`, err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ An error occurred processing this control.",
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
    }
  }
}
