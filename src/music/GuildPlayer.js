import { EventEmitter } from "node:events";
import { MessageFlags } from "discord.js";
import { TrackQueue, formatTrack } from "./TrackQueue.js";
import { buildFilterPayload, FILTER_PRESETS } from "./AudioFilters.js";
import { recordMusicHistory, getMusicSettings } from "../db/helpers/music.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";
import { logger } from "../utils/logger.js";
import { CONFIG } from "../config.js";

export const PlayerState = {
  IDLE: "idle",
  BUFFERING: "buffering",
  PLAYING: "playing",
  PAUSED: "paused",
  DESTROYED: "destroyed",
};

export class GuildPlayer extends EventEmitter {
  constructor(musicManager, guildId, player, voiceChannelId, textChannelId = null) {
    super();
    this.musicManager = musicManager;
    this.guildId = String(guildId);
    this.player = player; // Shoukaku player instance
    this.voiceChannelId = String(voiceChannelId);
    this.textChannelId = textChannelId ? String(textChannelId) : null;

    this.queue = new TrackQueue(this.guildId);
    this.state = PlayerState.IDLE;
    this.volume = CONFIG.MUSIC_DEFAULT_VOLUME;
    this.currentFilter = "clear";
    this.customFilters = {};

    this.skipVotes = new Set();
    this.idleTimer = null;
    this.mode247 = false;
    this.nowPlayingMessage = null;

    // Track position caching
    this.position = 0;
    this.lastPositionUpdate = Date.now();

    this.setupListeners();
  }

  get guild() {
    return this.musicManager.client.guilds.cache.get(this.guildId) || null;
  }

  get isPlaying() {
    return this.state === PlayerState.PLAYING;
  }

  get isPaused() {
    return this.state === PlayerState.PAUSED;
  }

  get isConnected() {
    return this.player && this.state !== PlayerState.DESTROYED;
  }

  get currentTrack() {
    return this.queue.current;
  }

  /**
   * Approximate playback position in milliseconds
   */
  get currentPosition() {
    if (!this.isPlaying) return this.position;
    const elapsed = Date.now() - this.lastPositionUpdate;
    return Math.min(this.position + elapsed, this.currentTrack?.info.length || 0);
  }

  setupListeners() {
    if (!this.player) return;

    // 1. Track Start
    this.player.on("start", (data) => {
      this.clearIdleTimer();
      this.state = PlayerState.PLAYING;
      this.position = 0;
      this.lastPositionUpdate = Date.now();
      this.skipVotes.clear();

      if (this.currentTrack) {
        // Record in DB history
        recordMusicHistory(
          this.guildId,
          this.currentTrack.info,
          this.currentTrack.requester?.username || "Dashboard"
        ).catch(() => {});

        this.sendNowPlayingMessage().catch(() => {});
      }

      this.emit("trackStart", this.currentTrack);
    });

    // 2. Track End
    this.player.on("end", async (data) => {
      this.state = PlayerState.IDLE;
      this.skipVotes.clear();
      this.emit("trackEnd", this.currentTrack);

      // Advance to next track
      const nextTrack = this.queue.next();
      if (nextTrack) {
        await this.playTrack(nextTrack);
      } else {
        // Queue is empty: check Autoplay or start Idle Timer
        if (this.queue.autoplay) {
          const autoTrack = await this.resolveAutoplayTrack();
          if (autoTrack) {
            this.queue.add(autoTrack, { id: "autoplay", username: "Autoplay" });
            const queuedAuto = this.queue.next();
            if (queuedAuto) {
              await this.playTrack(queuedAuto);
              return;
            }
          }
        }

        // Start idle timeout
        this.startIdleTimer();
        this.emit("queueEnd");
      }
    });

    // 3. Track Stuck
    this.player.on("stuck", async (data) => {
      logger.warn(`[PLAYER] Track stuck in guild ${this.guildId}: ${data.thresholdMs}ms`);
      this.emit("trackStuck", this.currentTrack);
      await this.skip();
    });

    // 4. Track Exception
    this.player.on("exception", async (data) => {
      logger.error(`[PLAYER] Track exception in guild ${this.guildId}:`, data.exception);
      this.emit("trackError", data.exception, this.currentTrack);
      await this.skip();
    });

    // 5. Update Position
    this.player.on("update", (data) => {
      if (data.state && typeof data.state.position === "number") {
        this.position = data.state.position;
        this.lastPositionUpdate = Date.now();
      }
    });

    // 6. Player Closed / Disconnected
    this.player.on("closed", (data) => {
      logger.info(`[PLAYER] Connection closed in guild ${this.guildId}: code ${data.code}`);
      if (data.byRemote) {
        this.destroy(false);
      }
    });
  }

  /**
   * Starts playback of a specific track on the Shoukaku player
   */
  async playTrack(track) {
    if (!this.player || !track) return false;
    try {
      this.state = PlayerState.BUFFERING;
      await this.player.playTrack({
        track: { encoded: track.encoded },
      });
      return true;
    } catch (err) {
      logger.error(`[PLAYER] Failed to play track in guild ${this.guildId}:`, err);
      this.state = PlayerState.IDLE;
      // Skip failed track
      const next = this.queue.next();
      if (next) await this.playTrack(next);
      return false;
    }
  }

  /**
   * Enqueues and initiates playback if currently idle
   */
  async play(trackOrTracks, requester = null) {
    const addedCount = this.queue.add(trackOrTracks, requester);
    if (this.state === PlayerState.IDLE && !this.currentTrack) {
      const next = this.queue.next();
      if (next) {
        await this.playTrack(next);
      }
    }
    return addedCount;
  }

  /**
   * Pauses audio playback
   */
  async pause() {
    if (!this.player || this.isPaused) return false;
    try {
      await this.player.setPaused(true);
      this.state = PlayerState.PAUSED;
      this.emit("pause");
      return true;
    } catch (err) {
      logger.error(`[PLAYER] Failed to pause in guild ${this.guildId}:`, err);
      return false;
    }
  }

  /**
   * Resumes audio playback
   */
  async resume() {
    if (!this.player || !this.isPaused) return false;
    try {
      await this.player.setPaused(false);
      this.state = PlayerState.PLAYING;
      this.lastPositionUpdate = Date.now();
      this.emit("resume");
      return true;
    } catch (err) {
      logger.error(`[PLAYER] Failed to resume in guild ${this.guildId}:`, err);
      return false;
    }
  }

  /**
   * Skips the current track or skips multiple tracks ahead
   */
  async skip(amount = 1) {
    if (!this.player) return false;
    try {
      const skipCount = Math.max(1, Number(amount) || 1);
      if (skipCount > 1) {
        // Discard intermediate tracks
        for (let i = 0; i < skipCount - 1; i++) {
          this.queue.tracks.shift();
        }
      }
      this.skipVotes.clear();
      await this.player.stopTrack();
      return true;
    } catch (err) {
      logger.error(`[PLAYER] Failed to skip in guild ${this.guildId}:`, err);
      return false;
    }
  }

  /**
   * Replays current track from start
   */
  async replay() {
    if (!this.player || !this.currentTrack) return false;
    return this.seek(0);
  }

  /**
   * Seeks to a specific timestamp in milliseconds
   */
  async seek(positionMs) {
    if (!this.player || !this.currentTrack) return false;
    if (!this.currentTrack.info.isSeekable) return false;

    const safePos = Math.max(0, Math.min(positionMs, this.currentTrack.info.length));
    try {
      await this.player.seekTo(safePos);
      this.position = safePos;
      this.lastPositionUpdate = Date.now();
      return true;
    } catch (err) {
      logger.error(`[PLAYER] Failed to seek in guild ${this.guildId}:`, err);
      return false;
    }
  }

  /**
   * Stops playback, clears queue, and disconnects
   */
  async stop() {
    this.queue.reset();
    this.skipVotes.clear();
    this.clearIdleTimer();
    if (this.player) {
      try {
        await this.player.stopTrack();
      } catch {}
    }
    this.state = PlayerState.IDLE;
    if (!this.mode247) {
      await this.destroy();
    }
    return true;
  }

  /**
   * Adjusts player volume (1 to 150)
   */
  async setVolume(volume) {
    if (!this.player) return false;
    const safeVolume = Math.min(Math.max(1, Number(volume) || 80), CONFIG.MUSIC_MAX_VOLUME);
    try {
      await this.player.setGlobalVolume(safeVolume);
      this.volume = safeVolume;
      return true;
    } catch (err) {
      logger.error(`[PLAYER] Failed to set volume in guild ${this.guildId}:`, err);
      return false;
    }
  }

  /**
   * Applies an audio filter preset
   */
  async setFilter(presetName) {
    if (!this.player) return false;
    const filterPayload = buildFilterPayload(presetName);
    try {
      await this.player.setFilters(filterPayload);
      this.currentFilter = presetName;
      return true;
    } catch (err) {
      logger.error(`[PLAYER] Failed to set filter in guild ${this.guildId}:`, err);
      return false;
    }
  }

  /**
   * Resolves an autoplay recommended track based on previous history
   */
  async resolveAutoplayTrack() {
    if (!this.queue.previousTracks.length && !this.currentTrack) return null;
    const reference = this.currentTrack || this.queue.previousTracks[this.queue.previousTracks.length - 1];
    if (!reference) return null;

    try {
      const search = `ytsearch:${reference.info.author} music`;
      const res = await this.musicManager.search(search);
      if (res && res.data && Array.isArray(res.data)) {
        // Find first track that wasn't recently played
        const prevIds = new Set(this.queue.previousTracks.map((t) => t.info.identifier));
        const candidate = res.data.find((t) => !prevIds.has(t.info.identifier));
        return candidate || res.data[0];
      }
    } catch {}
    return null;
  }

  /**
   * Handles Idle Timeout (disconnects when idle unless 24/7 is enabled)
   */
  startIdleTimer() {
    this.clearIdleTimer();
    if (this.mode247) return;

    const timeoutMs = CONFIG.MUSIC_IDLE_TIMEOUT * 1000;
    this.idleTimer = setTimeout(async () => {
      logger.info(`[PLAYER] Idle timeout expired for guild ${this.guildId}. Leaving voice channel.`);
      await this.destroy();
    }, timeoutMs);
  }

  clearIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  /**
   * Sends or updates interactive Now Playing embed in the text channel
   */
  async sendNowPlayingMessage() {
    if (!this.textChannelId || !this.currentTrack) return;
    const channel = this.guild?.channels?.cache?.get(this.textChannelId);
    if (!channel || !channel.isTextBased?.()) return;

    try {
      const { createMusicControlComponents } = await import("./MusicInteractionHandler.js");
      const track = this.currentTrack;
      const durationStr = track.info.isStream
        ? "🔴 Live Stream"
        : this.formatTime(track.info.length);

      const embed = makeEmbed({
        title: "🎶 Now Playing",
        description: `[**${track.info.title}**](${track.info.uri})\nBy: \`${track.info.author}\``,
        fields: [
          { name: "Duration", value: durationStr, inline: true },
          { name: "Volume", value: `${this.volume}%`, inline: true },
          { name: "Loop Mode", value: `\`${this.queue.loopMode.toUpperCase()}\``, inline: true },
          {
            name: "Requested By",
            value: track.requester ? `<@${track.requester.id}>` : "`Dashboard`",
            inline: true,
          },
          { name: "Queue", value: `${this.queue.size} songs left`, inline: true },
          { name: "Filter", value: `\`${this.currentFilter.toUpperCase()}\``, inline: true },
        ],
        thumbnail: track.info.artworkUrl,
        level: "PRIMARY",
        color: COLORS.PRIMARY,
      });

      const components = createMusicControlComponents(this.guildId, this.isPaused, this.queue.loopMode);

      // Clean up old message to keep channel tidy
      if (this.nowPlayingMessage) {
        await this.nowPlayingMessage.delete().catch(() => {});
        this.nowPlayingMessage = null;
      }

      this.nowPlayingMessage = await channel.send({
        embeds: [embed],
        components,
      });
    } catch (err) {
      logger.warn(`[PLAYER] Could not send now playing message:`, err.message);
    }
  }

  formatTime(ms) {
    if (!ms || isNaN(ms)) return "00:00";
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  }

  /**
   * Destroys player, leaves voice, and cleans up memory
   */
  async destroy(disconnectVoice = true) {
    this.clearIdleTimer();
    this.state = PlayerState.DESTROYED;
    this.queue.reset();

    if (this.nowPlayingMessage) {
      await this.nowPlayingMessage.delete().catch(() => {});
      this.nowPlayingMessage = null;
    }

    if (this.player) {
      try {
        await this.player.destroy();
      } catch {}
    }

    if (disconnectVoice) {
      try {
        await this.musicManager.shoukaku.leaveVoiceChannel(this.guildId);
      } catch {}
    }

    this.musicManager.players.delete(this.guildId);
    this.emit("destroy");
  }

  toJSON() {
    return {
      guildId: this.guildId,
      state: this.state,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      currentTrack: this.currentTrack,
      position: this.currentPosition,
      volume: this.volume,
      filter: this.currentFilter,
      loopMode: this.queue.loopMode,
      autoplay: this.queue.autoplay,
      voiceChannelId: this.voiceChannelId,
      textChannelId: this.textChannelId,
      mode247: this.mode247,
      queueSize: this.queue.size,
      totalDuration: this.queue.totalDuration,
    };
  }
}
