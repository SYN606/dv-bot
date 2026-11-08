import { EventEmitter } from "node:events";
import { type Message, type Guild } from "discord.js";
import { TrackQueue, formatDuration, type IFormattedTrack } from "./TrackQueue.js";
import { buildFilterPayload } from "./AudioFilters.js";
import { recordMusicHistory } from "../db/helpers/music.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
import { logger } from "../utils/logger.js";
import { CONFIG } from "../config.js";

export const PlayerState = {
  IDLE: "idle",
  BUFFERING: "buffering",
  PLAYING: "playing",
  PAUSED: "paused",
  DESTROYED: "destroyed",
} as const;

export type PlayerStateType = (typeof PlayerState)[keyof typeof PlayerState];

export interface ISkipResult {
  skipped: boolean;
  votes: number;
  required: number;
}

export class GuildPlayer extends EventEmitter {
  public musicManager: any;
  public guildId: string;
  public player: any; // Shoukaku player instance
  public voiceChannelId: string;
  public textChannelId: string | null;

  public queue: TrackQueue;
  public state: PlayerStateType;
  public volume: number;
  public currentFilter: string;
  public customFilters: Record<string, any>;

  public skipVotes: Set<string>;
  public idleTimer: NodeJS.Timeout | null;
  public mode247: boolean;
  public nowPlayingMessage: Message | null;
  private isUpdatingMessage: boolean;
  private pendingUpdateTimeout: NodeJS.Timeout | null;
  private lastMessageUpdate: number;
  private rateLimitPauseUntil: number;

  public position: number;
  public lastPositionUpdate: number;

  constructor(
    musicManager: any,
    guildId: string,
    player: any,
    voiceChannelId: string,
    textChannelId: string | null = null
  ) {
    super();
    this.musicManager = musicManager;
    this.guildId = String(guildId);
    this.player = player;
    this.voiceChannelId = String(voiceChannelId);
    this.textChannelId = textChannelId ? String(textChannelId) : null;

    this.queue = new TrackQueue(this.guildId);
    this.state = PlayerState.IDLE;
    this.volume = CONFIG.MUSIC_DEFAULT_VOLUME;
    this.currentFilter = "clear";
    this.customFilters = {};

    this.skipVotes = new Set<string>();
    this.idleTimer = null;
    this.mode247 = false;
    this.nowPlayingMessage = null;
    this.isUpdatingMessage = false;
    this.pendingUpdateTimeout = null;
    this.lastMessageUpdate = 0;
    this.rateLimitPauseUntil = 0;

    this.position = 0;
    this.lastPositionUpdate = Date.now();

    this.setupListeners();
  }

  get guild(): Guild | null {
    return this.musicManager.client.guilds.cache.get(this.guildId) || null;
  }

  get isPlaying(): boolean {
    return this.state === PlayerState.PLAYING && !this.isPaused;
  }

  get isPaused(): boolean {
    return this.state === PlayerState.PAUSED || Boolean(this.player?.paused);
  }

  get isConnected(): boolean {
    const meVoiceChannel = this.guild?.members?.me?.voice?.channelId;
    return Boolean(this.player && this.state !== PlayerState.DESTROYED && meVoiceChannel);
  }

  get currentTrack(): IFormattedTrack | null {
    return this.queue.current;
  }

  /**
   * Approximate playback position in milliseconds
   */
  get currentPosition(): number {
    if (!this.isPlaying) return this.position;
    const elapsed = Date.now() - this.lastPositionUpdate;
    return Math.min(this.position + elapsed, this.currentTrack?.info.length || 0);
  }

  setupListeners(): void {
    if (!this.player) return;

    // 1. Track Start
    this.player.on("start", () => {
      this.clearIdleTimer();
      this.state = PlayerState.PLAYING;
      this.position = 0;
      this.lastPositionUpdate = Date.now();
      this.skipVotes.clear();

      if (this.currentTrack) {
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
    this.player.on("end", async (data: any) => {
      // Guard against 'replaced' and 'cleanup' events.
      // Lavalink fires 'replaced' on the preceding track when playTrack starts a new one.
      // Advancing the queue on 'replaced' would chew through the queue and stall playback.
      if (data?.reason === "replaced" || data?.reason === "cleanup") {
        return;
      }

      this.state = PlayerState.IDLE;
      this.skipVotes.clear();
      this.emit("trackEnd", this.currentTrack);

      const nextTrack = this.queue.next();
      if (nextTrack) {
        await this.playTrack(nextTrack);
      } else {
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

        this.startIdleTimer();
        this.emit("queueEnd");
      }
    });

    // 3. Track Stuck
    this.player.on("stuck", async (data: any) => {
      logger.warn(`[PLAYER] Track stuck in guild ${this.guildId}: ${data.thresholdMs}ms`);
      this.emit("trackStuck", this.currentTrack);
      await this.skip();
    });

    // 4. Track Exception
    this.player.on("exception", async (data: any) => {
      logger.error(`[PLAYER] Track exception in guild ${this.guildId}:`, data.exception);
      this.emit("trackError", data.exception, this.currentTrack);
      await this.skip();
    });

    // 5. Update Position
    this.player.on("update", (data: any) => {
      if (data.state && typeof data.state.position === "number") {
        this.position = data.state.position;
        this.lastPositionUpdate = Date.now();
      }
    });

    // 6. Player Closed / Disconnected
    this.player.on("closed", (data: any) => {
      logger.info(`[PLAYER] Connection closed in guild ${this.guildId}: code ${data.code}`);
      if (data.byRemote) {
        this.destroy(false).catch(() => {});
      }
    });
  }

  /**
   * Starts playback of a specific track on the Shoukaku player
   */
  async playTrack(track: IFormattedTrack): Promise<boolean> {
    if (!this.player || !track) return false;
    try {
      this.state = PlayerState.BUFFERING;
      this.queue.current = track;
      await this.player.playTrack({
        track: { encoded: track.encoded },
      });
      return true;
    } catch (err) {
      logger.error(`[PLAYER] Failed to play track in guild ${this.guildId}:`, err);
      this.state = PlayerState.IDLE;
      const next = this.queue.next();
      if (next) await this.playTrack(next);
      return false;
    }
  }

  /**
   * Enqueues and initiates playback if currently idle
   */
  async play(trackOrTracks: any, requester: any = null): Promise<number> {
    const addedCount = this.queue.add(trackOrTracks, requester);
    if (this.state === PlayerState.IDLE && !this.currentTrack) {
      const next = this.queue.next();
      if (next) {
        await this.playTrack(next);
      }
    }
    return addedCount;
  }

  async pause(updateMsg: boolean = true): Promise<boolean> {
    if (!this.player) return false;
    try {
      await this.player.setPaused(true);
      this.state = PlayerState.PAUSED;
      this.emit("pause");
      if (updateMsg) {
        await this.updateNowPlayingMessage();
      }
      return true;
    } catch (err) {
      logger.error(`[PLAYER] Failed to pause in guild ${this.guildId}:`, err);
      return false;
    }
  }

  async resume(updateMsg: boolean = true): Promise<boolean> {
    if (!this.player) return false;
    try {
      await this.player.setPaused(false);
      this.state = PlayerState.PLAYING;
      this.lastPositionUpdate = Date.now();
      this.emit("resume");
      if (updateMsg) {
        await this.updateNowPlayingMessage();
      }
      return true;
    } catch (err) {
      logger.error(`[PLAYER] Failed to resume in guild ${this.guildId}:`, err);
      return false;
    }
  }

  async skip(amount: number = 1): Promise<boolean> {
    if (!this.player) return false;
    try {
      const skipCount = Math.max(1, typeof amount === "number" && !isNaN(amount) ? amount : 1);
      if (skipCount > 1) {
        for (let i = 0; i < skipCount - 1; i++) {
          this.queue.tracks.shift();
        }
      }
      this.skipVotes.clear();

      // Bypasses single-track loop if active during manual skip
      const wasTrackLoop = this.queue.loopMode === "track";
      if (wasTrackLoop) {
        this.queue.loopMode = "off";
      }

      await this.player.stopTrack();

      if (wasTrackLoop) {
        this.queue.loopMode = "track";
      }

      return true;
    } catch (err) {
      logger.error(`[PLAYER] Failed to skip in guild ${this.guildId}:`, err);
      return false;
    }
  }

  async voteSkip(userId: string): Promise<ISkipResult> {
    const channel = this.guild?.channels.cache.get(this.voiceChannelId) as any;
    const humanCount = channel?.members?.filter((m: any) => !m.user?.bot)?.size || 1;
    const required = Math.max(1, Math.ceil(humanCount * 0.5));

    this.skipVotes.add(String(userId));
    const votes = this.skipVotes.size;

    if (votes >= required) {
      await this.skip();
      return { skipped: true, votes, required };
    }

    return { skipped: false, votes, required };
  }

  async previous(): Promise<boolean> {
    if (!this.player) return false;
    const prev = this.queue.previous();
    if (!prev) return false;
    return this.playTrack(prev);
  }

  async replay(): Promise<boolean> {
    if (!this.player || !this.currentTrack) return false;
    return this.seek(0);
  }

  async seek(positionMs: number): Promise<boolean> {
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

  async stop(): Promise<boolean> {
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

  async setVolume(volume: number): Promise<boolean> {
    if (!this.player) return false;
    const num = Number(volume);
    const safeVolume = Math.min(
      Math.max(0, isNaN(num) ? 80 : num),
      CONFIG.MUSIC_MAX_VOLUME
    );
    try {
      await this.player.setGlobalVolume(safeVolume);
      this.volume = safeVolume;
      this.updateNowPlayingMessage().catch(() => {});
      return true;
    } catch (err) {
      logger.error(`[PLAYER] Failed to set volume in guild ${this.guildId}:`, err);
      return false;
    }
  }

  async setFilter(presetName: string): Promise<boolean> {
    if (!this.player) return false;
    const filterPayload = buildFilterPayload(presetName);
    try {
      await this.player.setFilters(filterPayload);
      this.currentFilter = presetName;
      this.updateNowPlayingMessage().catch(() => {});
      return true;
    } catch (err) {
      logger.error(`[PLAYER] Failed to set filter in guild ${this.guildId}:`, err);
      return false;
    }
  }

  async resolveAutoplayTrack(): Promise<any | null> {
    if (!this.queue.previousTracks.length && !this.currentTrack) return null;
    const reference = this.currentTrack || this.queue.previousTracks[this.queue.previousTracks.length - 1];
    if (!reference) return null;

    try {
      const search = `ytsearch:${reference.info.author} music`;
      const res = await this.musicManager.search(search);
      if (res && res.data && Array.isArray(res.data)) {
        const prevIds = new Set<string>(this.queue.previousTracks.map((t) => t.info.identifier));
        const candidate = res.data.find((t: any) => !prevIds.has(t.info.identifier));
        return candidate || res.data[0];
      }
    } catch {}
    return null;
  }

  startIdleTimer(): void {
    this.clearIdleTimer();
    if (this.mode247) return;

    const timeoutMs = CONFIG.MUSIC_IDLE_TIMEOUT * 1000;
    this.idleTimer = setTimeout(async () => {
      logger.info(`[PLAYER] Idle timeout expired for guild ${this.guildId}. Leaving voice channel.`);
      await this.destroy();
    }, timeoutMs);
  }

  clearIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  async sendNowPlayingMessage(): Promise<void> {
    if (!this.textChannelId || !this.currentTrack) return;
    const channel = this.guild?.channels?.cache?.get(this.textChannelId) as any;
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

      if (this.nowPlayingMessage) {
        try {
          await this.nowPlayingMessage.edit({ embeds: [embed], components });
          this.lastMessageUpdate = Date.now();
          return;
        } catch {
          this.nowPlayingMessage = null;
        }
      }

      this.nowPlayingMessage = await channel.send({
        embeds: [embed],
        components,
      });
      this.lastMessageUpdate = Date.now();
    } catch (err: any) {
      logger.warn(`[PLAYER] Could not send now playing message:`, err.message);
    }
  }

  async updateNowPlayingMessage(immediate: boolean = false): Promise<void> {
    if (!this.nowPlayingMessage || !this.currentTrack) return;

    const now = Date.now();
    if (now < this.rateLimitPauseUntil) {
      this.schedulePendingUpdate(this.rateLimitPauseUntil - now + 100);
      return;
    }

    const elapsed = now - this.lastMessageUpdate;
    const minInterval = 1200;

    if (!immediate && elapsed < minInterval) {
      this.schedulePendingUpdate(minInterval - elapsed);
      return;
    }

    if (this.isUpdatingMessage) {
      this.schedulePendingUpdate(500);
      return;
    }

    this.isUpdatingMessage = true;
    this.clearPendingUpdate();

    try {
      const { createMusicControlComponents } = await import("./MusicInteractionHandler.js");
      const track = this.currentTrack;
      if (!track || !this.nowPlayingMessage) {
        this.isUpdatingMessage = false;
        return;
      }

      const durationStr = track.info.isStream
        ? "🔴 Live Stream"
        : this.formatTime(track.info.length);

      const embed = makeEmbed({
        title: this.isPaused ? "⏸️ Playback Paused" : "🎶 Now Playing",
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
        level: this.isPaused ? "WARNING" : "PRIMARY",
        color: this.isPaused ? COLORS.WARNING : COLORS.PRIMARY,
      });

      const components = createMusicControlComponents(this.guildId, this.isPaused, this.queue.loopMode);
      await this.nowPlayingMessage.edit({ embeds: [embed], components });
      this.lastMessageUpdate = Date.now();
    } catch (err: any) {
      if (err?.status === 429 || err?.code === 429 || err?.message?.includes("rate limit")) {
        const retryAfterMs = Number(err?.retry_after) ? Math.ceil(Number(err.retry_after) * 1000) : 2500;
        logger.warn(`[PLAYER] Rate limit encountered for guild ${this.guildId}. Pausing updates for ${retryAfterMs}ms.`);
        this.rateLimitPauseUntil = Date.now() + retryAfterMs;
        this.schedulePendingUpdate(retryAfterMs + 200);
      } else {
        logger.debug(`[PLAYER] Could not update now playing message:`, err?.message);
      }
    } finally {
      this.isUpdatingMessage = false;
    }
  }

  private schedulePendingUpdate(delayMs: number): void {
    if (this.pendingUpdateTimeout) return;
    this.pendingUpdateTimeout = setTimeout(() => {
      this.pendingUpdateTimeout = null;
      this.updateNowPlayingMessage(true).catch(() => {});
    }, Math.max(delayMs, 200));
    if (this.pendingUpdateTimeout.unref) this.pendingUpdateTimeout.unref();
  }

  private clearPendingUpdate(): void {
    if (this.pendingUpdateTimeout) {
      clearTimeout(this.pendingUpdateTimeout);
      this.pendingUpdateTimeout = null;
    }
  }

  formatTime(ms?: number | null): string {
    return formatDuration(ms);
  }

  async destroy(disconnectVoice: boolean = true): Promise<void> {
    this.clearIdleTimer();
    this.clearPendingUpdate();
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

  toJSON(): Record<string, any> {
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
