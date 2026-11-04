import { Shoukaku, Connectors, Constants } from "shoukaku";
import { type VoiceState, type User } from "discord.js";
import { GuildPlayer } from "./GuildPlayer.js";
import { MusicInteractionHandler } from "./MusicInteractionHandler.js";
import { formatTrack, type IFormattedTrack } from "./TrackQueue.js";
import { getMusicSettings } from "../db/helpers/music.js";
import { CONFIG } from "../config.js";
import { logger } from "../utils/logger.js";

export interface ISearchResult {
  loadType: "track" | "playlist" | "search" | "empty" | "error";
  tracks: (IFormattedTrack | null)[];
  playlistName: string | null;
  exception?: any;
}

export interface IJoinOptions {
  guildId: string;
  voiceChannelId: string;
  textChannelId?: string | null;
  deaf?: boolean;
}

export class MusicManager {
  public client: any;
  public players: Map<string, GuildPlayer>;
  public shoukaku: Shoukaku | null;
  public interactionHandler: MusicInteractionHandler;
  public isReady: boolean;
  public nodes: any[];
  public options: any;

  constructor(client: any) {
    this.client = client;
    this.players = new Map<string, GuildPlayer>();
    this.shoukaku = null;
    this.interactionHandler = new MusicInteractionHandler(this);
    this.isReady = false;

    let cleanHost = (CONFIG.LAVALINK_HOST || "127.0.0.1").trim()
      .replace(/^(?:https?|wss?):\/\//i, "")
      .replace(/\/+$/, "");

    let port = CONFIG.LAVALINK_PORT;
    if (cleanHost.includes(":")) {
      const parts = cleanHost.split(":");
      cleanHost = parts[0];
      port = parseInt(parts[1], 10) || port;
    }

    this.nodes = [
      {
        name: "main",
        url: `${cleanHost}:${port}`,
        auth: CONFIG.LAVALINK_PASSWORD,
        secure: Boolean(CONFIG.LAVALINK_SECURE),
      },
    ];

    this.options = {
      moveOnDisconnect: false,
      resume: true,
      resumeTimeout: 30,
      reconnectTries: 30,
      reconnectInterval: 5000,
      restTimeout: 10000,
    };
  }

  /**
   * Initialize Shoukaku Lavalink client
   */
  init(): void {
    if (!CONFIG.MUSIC_ENABLED) {
      logger.info("[MUSIC] Music subsystem is disabled in configuration.");
      return;
    }

    try {
      this.shoukaku = new Shoukaku(
        new Connectors.DiscordJS(this.client),
        this.nodes,
        this.options
      );

      this.setupShoukakuEvents();

      // If Discord client is already ready, Shoukaku's "clientReady" event listener
      // has already passed. Explicitly trigger ready() on connector to register nodes.
      if (this.client.isReady?.() || this.client.user) {
        (this.shoukaku.connector as any).ready(this.nodes);
      }

      logger.info("[MUSIC] Shoukaku connector initialized. Waiting for Lavalink node...");
    } catch (err) {
      logger.error("[MUSIC] Failed to initialize Shoukaku client:", err);
    }
  }

  setupShoukakuEvents(): void {
    if (!this.shoukaku) return;

    let lastWarnTime = 0;
    const THROTTLE_MS = 30000;

    this.shoukaku.on("ready", (name) => {
      this.isReady = true;
      lastWarnTime = 0;
      logger.info(`[MUSIC LAVALINK] Node '${name}' is connected and ready.`);
      this.restore247Players().catch((err: any) =>
        logger.warn("[MUSIC] Failed restoring 24/7 players:", err.message)
      );
    });

    this.shoukaku.on("error", (name, error) => {
      const now = Date.now();
      if (now - lastWarnTime > THROTTLE_MS) {
        lastWarnTime = now;
        logger.warn(`[MUSIC LAVALINK] Node '${name}' connection notice: ${error?.message || error}`);
      }
    });

    this.shoukaku.on("close", (name, code) => {
      this.isReady = false;
      const now = Date.now();
      if (now - lastWarnTime > THROTTLE_MS) {
        lastWarnTime = now;
        logger.warn(
          `[MUSIC LAVALINK] Node '${name}' is currently unreachable (Code ${code}). Reconnecting in background...`
        );
      }
    });

    this.shoukaku.on("disconnect", () => {
      this.isReady = false;
    });

    this.shoukaku.on("reconnecting", (name, left) => {
      const now = Date.now();
      if (now - lastWarnTime > THROTTLE_MS) {
        lastWarnTime = now;
        logger.info(`[MUSIC LAVALINK] Node '${name}' reconnecting (attempts left: ${left})...`);
      }
    });
  }

  get hasAvailableNode(): boolean {
    if (!this.shoukaku) return false;
    for (const [, node] of this.shoukaku.nodes) {
      if (node.state === Constants.State.CONNECTED) return true;
    }
    return false;
  }

  getIdealNode(): any {
    if (!this.shoukaku) return null;
    return this.shoukaku.options?.nodeResolver
      ? (this.shoukaku.options as any).nodeResolver(this.shoukaku.nodes)
      : this.shoukaku.nodes.values().next().value || null;
  }

  getPlayer(guildId: string): GuildPlayer | null {
    return this.players.get(String(guildId)) || null;
  }

  async join({ guildId, voiceChannelId, textChannelId = null, deaf = true }: IJoinOptions): Promise<GuildPlayer> {
    if (!this.shoukaku) {
      throw new Error("Music subsystem is not enabled or initialized.");
    }

    const existing = this.getPlayer(guildId);
    if (existing && existing.isConnected) {
      if (textChannelId) existing.textChannelId = String(textChannelId);
      return existing;
    }

    const node = this.getIdealNode();
    if (!node || node.state !== Constants.State.CONNECTED) {
      throw new Error(
        "Lavalink audio server is currently offline or reconnecting. Please check Lavalink status."
      );
    }

    try {
      const guild = this.client.guilds.cache.get(guildId);
      const shardId = guild?.shardId ?? 0;

      const shoukakuPlayer = await this.shoukaku.joinVoiceChannel({
        guildId: String(guildId),
        channelId: String(voiceChannelId),
        shardId,
        deaf: Boolean(deaf),
      });

      const player = new GuildPlayer(this, guildId, shoukakuPlayer, voiceChannelId, textChannelId);

      const settings = await getMusicSettings(guildId);
      if (settings) {
        player.mode247 = Boolean(settings.mode_247);
        if (settings.default_volume) {
          await player.setVolume(settings.default_volume);
        }
      }

      this.players.set(String(guildId), player);
      logger.info(`[MUSIC] Player created for guild ${guildId} in VC ${voiceChannelId}`);
      return player;
    } catch (err) {
      logger.error(`[MUSIC] Failed joining voice channel in guild ${guildId}:`, err);
      throw err;
    }
  }

  async leave(guildId: string): Promise<void> {
    const player = this.getPlayer(guildId);
    if (player) {
      await player.destroy(true);
    } else if (this.shoukaku) {
      await this.shoukaku.leaveVoiceChannel(String(guildId)).catch(() => {});
    }
  }

  async search(query: string, requester: User | null = null, source: string = "ytsearch"): Promise<ISearchResult> {
    if (!this.shoukaku) {
      throw new Error("Music subsystem is not initialized.");
    }

    const node = this.getIdealNode();
    if (!node || node.state !== Constants.State.CONNECTED) {
      throw new Error("Lavalink audio server is currently unreachable.");
    }

    const isUrl = /^https?:\/\//i.test(query.trim());
    let identifier = query.trim();

    if (!isUrl) {
      identifier = `${source}:${identifier}`;
    }

    try {
      const result: any = await node.rest.resolve(identifier);
      if (!result) {
        return { loadType: "empty", tracks: [], playlistName: null };
      }

      const loadType = (result.loadType || "").toLowerCase();

      switch (loadType) {
        case "track": {
          const track = formatTrack(result.data, requester);
          return { loadType: "track", tracks: [track], playlistName: null };
        }

        case "playlist": {
          const tracks = (result.data.tracks || []).map((t: any) => formatTrack(t, requester));
          const playlistName = result.data.info?.name || "Lavalink Playlist";
          return { loadType: "playlist", tracks, playlistName };
        }

        case "search": {
          const rawTracks = Array.isArray(result.data) ? result.data : [];
          const tracks = rawTracks.map((t: any) => formatTrack(t, requester));
          return { loadType: "search", tracks, playlistName: null };
        }

        case "empty": {
          return { loadType: "empty", tracks: [], playlistName: null };
        }

        case "error":
        default: {
          logger.warn(`[MUSIC SEARCH] LoadType error or unexpected:`, result);
          return {
            loadType: "error",
            tracks: [],
            playlistName: null,
            exception: result.data || result.exception,
          };
        }
      }
    } catch (err) {
      logger.error(`[MUSIC SEARCH ERROR] Query: ${query}:`, err);
      throw err;
    }
  }

  async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    const guildId = guild.id;
    const player = this.getPlayer(guildId);
    if (!player) return;

    const botId = this.client.user?.id;

    // 1. Bot disconnected or moved
    if (oldState.id === botId && !newState.channelId) {
      logger.info(`[MUSIC] Bot was disconnected from voice in guild ${guildId}`);
      await player.destroy(false);
      return;
    }

    if (newState.id === botId && newState.channelId && newState.channelId !== player.voiceChannelId) {
      player.voiceChannelId = newState.channelId;
    }

    // 2. Member joined/left the bot's voice channel
    const currentChannel = guild.channels.cache.get(player.voiceChannelId) as any;
    if (!currentChannel) return;

    const nonBotMembers = currentChannel.members ? currentChannel.members.filter((m: any) => !m.user?.bot) : null;

    if (nonBotMembers && nonBotMembers.size === 0) {
      if (!player.mode247) {
        player.startIdleTimer();
      }
    } else if (nonBotMembers && nonBotMembers.size > 0) {
      player.clearIdleTimer();
    }
  }

  async restore247Players(): Promise<void> {
    for (const guild of this.client.guilds.cache.values()) {
      try {
        const settings = await getMusicSettings(guild.id);
        if (settings && settings.mode_247 && settings.voice_channel_id) {
          const vc = guild.channels.cache.get(settings.voice_channel_id);
          if (vc && !this.getPlayer(guild.id)) {
            logger.info(`[MUSIC] Restoring 24/7 player in guild ${guild.id} channel ${vc.name}`);
            await this.join({
              guildId: guild.id,
              voiceChannelId: vc.id,
              textChannelId: settings.text_channel_id,
            });
          }
        }
      } catch (err: any) {
        logger.debug(`[MUSIC 24/7] Could not restore guild ${guild.id}:`, err.message);
      }
    }
  }
}
