import { Shoukaku, Connectors, Constants } from "shoukaku";
import { type VoiceState, type User } from "discord.js";
import dns from "node:dns/promises";
import net from "node:net";
import { GuildPlayer, PlayerState } from "./GuildPlayer.js";
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
  public rawHost: string;
  public port: number;
  public heartbeatInterval: NodeJS.Timeout | null = null;

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

    this.rawHost = cleanHost;
    this.port = port;

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
      resume: false,
      resumeTimeout: 30,
      reconnectTries: 20,
      reconnectInterval: 5,
      restTimeout: 15,
    };
  }

  /**
   * Initialize Shoukaku Lavalink client
   */
  async init(): Promise<void> {
    if (!CONFIG.MUSIC_ENABLED) {
      logger.info("[MUSIC] Music subsystem is disabled in configuration.");
      return;
    }

    let resolvedHost = this.rawHost;
    // Resolve hostname to IPv4 literal to bypass broken IPv6/NAT64 routes in WSL/Linux environments
    if (net.isIP(resolvedHost) === 0) {
      try {
        const res = await dns.lookup(resolvedHost, { family: 4 });
        if (res?.address) {
          logger.info(`[MUSIC] Resolved Lavalink host '${resolvedHost}' to IPv4 '${res.address}'.`);
          resolvedHost = res.address;
        }
      } catch (dnsErr: any) {
        logger.warn(`[MUSIC] IPv4 DNS lookup for '${resolvedHost}' failed, using original hostname:`, dnsErr?.message);
      }
    }

    this.nodes = [
      {
        name: "main",
        url: `${resolvedHost}:${this.port}`,
        auth: CONFIG.LAVALINK_PASSWORD,
        secure: Boolean(CONFIG.LAVALINK_SECURE),
      },
    ];

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

      logger.info(`[MUSIC] Shoukaku connector initialized (${resolvedHost}:${this.port}). Waiting for Lavalink node...`);
    } catch (err) {
      logger.error("[MUSIC] Failed to initialize Shoukaku client:", err);
    }
  }

  setupShoukakuEvents(): void {
    if (!this.shoukaku) return;

    this.shoukaku.on("ready", (name) => {
      this.isReady = true;
      logger.info(`[MUSIC LAVALINK] Node '${name}' is connected and ready.`);
      this.restore247Players().catch((err: any) =>
        logger.warn("[MUSIC] Failed restoring 24/7 players:", err.message)
      );
    });

    this.shoukaku.on("error", (name, error) => {
      logger.warn(`[MUSIC LAVALINK] Node '${name}' error:`, (error as any)?.message || error);
    });

    this.shoukaku.on("close", (name, code, reason) => {
      this.isReady = false;
      logger.warn(
        `[MUSIC LAVALINK] Node '${name}' closed connection (Code ${code}, Reason: ${reason || "none"}). Reconnecting in background...`
      );
    });

    this.shoukaku.on("disconnect", () => {
      this.isReady = false;
    });

    this.shoukaku.on("reconnecting", (name, left, interval) => {
      logger.info(`[MUSIC LAVALINK] Node '${name}' reconnecting in ${interval ?? 5}s (${left} attempts left)...`);
    });

    this.shoukaku.on("debug", (name, info) => {
      if (process.env.DEBUG_LAVALINK === "true") {
        logger.debug(`[MUSIC LAVALINK DEBUG] [${name}] ${info}`);
      }
    });

    if (!this.heartbeatInterval) {
      this.heartbeatInterval = setInterval(async () => {
        if (!this.shoukaku || !CONFIG.MUSIC_ENABLED) return;
        for (const [, node] of this.shoukaku.nodes) {
          if (node.state === Constants.State.CONNECTED) {
            try {
              await node.rest.getLavalinkInfo();
            } catch (err: any) {
              logger.warn(`[MUSIC LAVALINK] Node '${node.name}' heartbeat failed. Reconnecting...`, err?.message);
              this.reconnectStaleNode().catch(() => {});
            }
          }
        }
      }, 60 * 1000);
      if (this.heartbeatInterval.unref) this.heartbeatInterval.unref();
    }
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

  /**
   * Recovers from an expired or rejected Lavalink session by resetting the node connection
   */
  async reconnectStaleNode(): Promise<boolean> {
    if (!this.shoukaku) return false;
    for (const [, node] of this.shoukaku.nodes) {
      try {
        logger.info(`[MUSIC LAVALINK] Forcing reconnect on node '${node.name}' to obtain fresh session.`);
        node.sessionId = null;
        if (node.ws) {
          node.ws.close(4000, "Resetting stale session");
        } else {
          node.disconnect(4000, "Resetting stale session");
        }
      } catch (err: any) {
        logger.warn(`[MUSIC LAVALINK] Error disconnecting node '${node.name}':`, err?.message);
      }
    }

    const start = Date.now();
    while (Date.now() - start < 6000) {
      await new Promise((r) => setTimeout(r, 500));
      if (this.hasAvailableNode) {
        logger.info("[MUSIC LAVALINK] Node reconnected successfully with fresh session.");
        return true;
      }
    }
    return false;
  }

  getPlayer(guildId: string): GuildPlayer | null {
    const player = this.players.get(String(guildId));
    if (!player) return null;
    if (player.state === PlayerState.DESTROYED) {
      this.players.delete(String(guildId));
      return null;
    }
    return player;
  }

  async join({ guildId, voiceChannelId, textChannelId = null, deaf = true }: IJoinOptions): Promise<GuildPlayer> {
    if (!this.shoukaku) {
      throw new Error("Music subsystem is not enabled or initialized.");
    }

    const guild = this.client.guilds.cache.get(guildId);
    const meVoiceChannel = guild?.members?.me?.voice?.channelId;

    const existing = this.getPlayer(guildId);
    if (existing && existing.state !== PlayerState.DESTROYED) {
      if (existing.voiceChannelId === voiceChannelId || existing.player) {
        if (textChannelId) existing.textChannelId = String(textChannelId);
        if (existing.voiceChannelId !== voiceChannelId) {
          existing.voiceChannelId = String(voiceChannelId);
          const shardId = guild?.shardId ?? 0;
          await this.shoukaku.joinVoiceChannel({
            guildId: String(guildId),
            channelId: String(voiceChannelId),
            shardId,
            deaf: Boolean(deaf),
          }).catch((err) => logger.warn(`[MUSIC] Channel switch error:`, err.message));
        }
        return existing;
      }
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
    } catch (err: any) {
      const isSessionError =
        err?.message?.includes("Session not found") ||
        err?.message?.includes("404") ||
        (err?.status === 404 && String(err?.message || "").toLowerCase().includes("session"));

      if (isSessionError && this.shoukaku) {
        logger.warn(`[MUSIC] Stale Lavalink session detected for guild ${guildId}. Attempting recovery and retry...`);
        const recovered = await this.reconnectStaleNode();
        if (recovered) {
          await this.shoukaku.leaveVoiceChannel(String(guildId)).catch(() => {});
          const shardId = this.client.guilds.cache.get(guildId)?.shardId ?? 0;
          const retryShoukakuPlayer = await this.shoukaku.joinVoiceChannel({
            guildId: String(guildId),
            channelId: String(voiceChannelId),
            shardId,
            deaf: Boolean(deaf),
          });
          const retryPlayer = new GuildPlayer(this, guildId, retryShoukakuPlayer, voiceChannelId, textChannelId);
          const settings = await getMusicSettings(guildId);
          if (settings) {
            retryPlayer.mode247 = Boolean(settings.mode_247);
            if (settings.default_volume) await retryPlayer.setVolume(settings.default_volume);
          }
          this.players.set(String(guildId), retryPlayer);
          logger.info(`[MUSIC] Successfully recovered and joined VC for guild ${guildId}`);
          return retryPlayer;
        }
      }

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
      if (player) {
        await player.destroy(true);
      } else if (this.shoukaku) {
        await this.shoukaku.leaveVoiceChannel(guildId).catch(() => {});
      }
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
      if (!player.mode247 && !player.isPlaying) {
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
