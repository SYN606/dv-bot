import { Shoukaku, Connectors } from "shoukaku";
import { GuildPlayer } from "./GuildPlayer.js";
import { MusicInteractionHandler } from "./MusicInteractionHandler.js";
import { formatTrack } from "./TrackQueue.js";
import { getMusicSettings } from "../db/helpers/music.js";
import { CONFIG } from "../config.js";
import { logger } from "../utils/logger.js";

export class MusicManager {
  /**
   * @param {import("../core/client.js").DVClient} client
   */
  constructor(client) {
    this.client = client;
    this.players = new Map(); // guildId -> GuildPlayer
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
      reconnectInterval: 5000, // Wait 5 seconds between reconnection attempts
      restTimeout: 10000,
    };
  }

  /**
   * Initialize Shoukaku Lavalink client
   */
  init() {
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
      logger.info("[MUSIC] Shoukaku connector initialized. Waiting for Lavalink node...");
    } catch (err) {
      logger.error("[MUSIC] Failed to initialize Shoukaku client:", err);
    }
  }

  setupShoukakuEvents() {
    if (!this.shoukaku) return;

    let lastWarnTime = 0;
    const THROTTLE_MS = 30000; // Log at most once every 30s when node is offline

    this.shoukaku.on("ready", (name) => {
      this.isReady = true;
      lastWarnTime = 0;
      logger.info(`[MUSIC LAVALINK] Node '${name}' is connected and ready.`);
      this.restore247Players().catch((err) =>
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

    this.shoukaku.on("close", (name, code, reason) => {
      this.isReady = false;
      const now = Date.now();
      if (now - lastWarnTime > THROTTLE_MS) {
        lastWarnTime = now;
        logger.warn(
          `[MUSIC LAVALINK] Node '${name}' is currently unreachable (Code ${code}). Reconnecting in background...`
        );
      }
    });

    this.shoukaku.on("disconnect", (name, count) => {
      this.isReady = false;
    });

    this.shoukaku.on("reconnecting", (name, left, timeout) => {
      const now = Date.now();
      if (now - lastWarnTime > THROTTLE_MS) {
        lastWarnTime = now;
        logger.info(`[MUSIC LAVALINK] Node '${name}' reconnecting (attempts left: ${left})...`);
      }
    });
  }

  /**
   * Returns true if at least one Lavalink node is online
   */
  get hasAvailableNode() {
    if (!this.shoukaku) return false;
    for (const [, node] of this.shoukaku.nodes) {
      if (node.state === 2) return true; // 2 === CONNECTED in Shoukaku
    }
    return false;
  }

  /**
   * Gets the ideal Lavalink node
   */
  getIdealNode() {
    if (!this.shoukaku) return null;
    return this.shoukaku.options?.nodeResolver
      ? this.shoukaku.options.nodeResolver(this.shoukaku.nodes)
      : this.shoukaku.nodes.values().next().value || null;
  }

  /**
   * Get an existing player for a guild
   * @param {string} guildId
   * @returns {GuildPlayer|null}
   */
  getPlayer(guildId) {
    return this.players.get(String(guildId)) || null;
  }

  /**
   * Joins voice channel and creates or returns a GuildPlayer
   * @param {Object} options
   * @param {string} options.guildId
   * @param {string} options.voiceChannelId
   * @param {string} [options.textChannelId]
   * @param {boolean} [options.deaf=true]
   * @returns {Promise<GuildPlayer>}
   */
  async join({ guildId, voiceChannelId, textChannelId = null, deaf = true }) {
    if (!this.shoukaku) {
      throw new Error("Music subsystem is not enabled or initialized.");
    }

    const existing = this.getPlayer(guildId);
    if (existing && existing.isConnected) {
      if (textChannelId) existing.textChannelId = String(textChannelId);
      return existing;
    }

    const node = this.getIdealNode();
    if (!node || node.state !== 2) {
      throw new Error(
        "Lavalink audio server is currently offline or reconnecting. Please check Lavalink status."
      );
    }

    try {
      const shoukakuPlayer = await this.shoukaku.joinVoiceChannel({
        guildId: String(guildId),
        channelId: String(voiceChannelId),
        deaf: Boolean(deaf),
      });

      const player = new GuildPlayer(this, guildId, shoukakuPlayer, voiceChannelId, textChannelId);

      // Load persistent guild settings
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

  /**
   * Leaves voice channel and tears down player
   * @param {string} guildId
   */
  async leave(guildId) {
    const player = this.getPlayer(guildId);
    if (player) {
      await player.destroy(true);
    } else if (this.shoukaku) {
      await this.shoukaku.leaveVoiceChannel(String(guildId)).catch(() => {});
    }
  }

  /**
   * Resolves search query or URL into tracks
   * @param {string} query
   * @param {import("discord.js").User|null} requester
   * @param {string} [source="ytsearch"] - "ytsearch", "ytmsearch", "scsearch"
   */
  async search(query, requester = null, source = "ytsearch") {
    if (!this.shoukaku) {
      throw new Error("Music subsystem is not initialized.");
    }

    const node = this.getIdealNode();
    if (!node || node.state !== 2) {
      throw new Error("Lavalink audio server is currently unreachable.");
    }

    const isUrl = /^https?:\/\//i.test(query.trim());
    let identifier = query.trim();

    // If query is a plain search phrase, prefix with Lavalink search identifier
    if (!isUrl) {
      identifier = `${source}:${identifier}`;
    }

    try {
      const result = await node.rest.resolve(identifier);
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
          const tracks = (result.data.tracks || []).map((t) => formatTrack(t, requester));
          const playlistName = result.data.info?.name || "Lavalink Playlist";
          return { loadType: "playlist", tracks, playlistName };
        }

        case "search": {
          const rawTracks = Array.isArray(result.data) ? result.data : [];
          const tracks = rawTracks.map((t) => formatTrack(t, requester));
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

  /**
   * Central VoiceStateUpdate listener hook called by the main gateway event
   * @param {import("discord.js").VoiceState} oldState
   * @param {import("discord.js").VoiceState} newState
   */
  async handleVoiceStateUpdate(oldState, newState) {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    const guildId = guild.id;
    const player = this.getPlayer(guildId);
    if (!player) return;

    const botId = this.client.user?.id;

    // 1. Bot disconnected or moved
    if (oldState.id === botId && !newState.channelId) {
      // Bot was disconnected from voice
      logger.info(`[MUSIC] Bot was disconnected from voice in guild ${guildId}`);
      await player.destroy(false);
      return;
    }

    if (newState.id === botId && newState.channelId && newState.channelId !== player.voiceChannelId) {
      // Bot was moved to another channel
      player.voiceChannelId = newState.channelId;
    }

    // 2. Member joined/left the bot's voice channel
    const currentChannel = guild.channels.cache.get(player.voiceChannelId);
    if (!currentChannel) return;

    const nonBotMembers = currentChannel.members.filter((m) => !m.user.bot);

    if (nonBotMembers.size === 0) {
      // No humans left in channel
      if (!player.mode247) {
        player.startIdleTimer();
      }
    } else {
      // At least one human is present; cancel idle timeout
      player.clearIdleTimer();
    }
  }

  /**
   * Re-joins 24/7 channels after Lavalink / Bot reconnect
   */
  async restore247Players() {
    for (const guild of this.client.guilds.cache.values()) {
      try {
        const settings = await getMusicSettings(guild.id);
        if (settings && settings.mode_247 && settings.default_vc) {
          const vc = guild.channels.cache.get(settings.default_vc);
          if (vc && !this.getPlayer(guild.id)) {
            logger.info(`[MUSIC] Restoring 24/7 player in guild ${guild.id} channel ${vc.name}`);
            await this.join({
              guildId: guild.id,
              voiceChannelId: vc.id,
              textChannelId: settings.default_text_channel,
            });
          }
        }
      } catch (err) {
        logger.debug(`[MUSIC 24/7] Could not restore guild ${guild.id}:`, err.message);
      }
    }
  }
}
