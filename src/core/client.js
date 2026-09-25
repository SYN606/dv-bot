import fs from "node:fs";
import path from "node:path";
import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Options,
  REST,
  Routes,
} from "discord.js";
import { CONFIG } from "../config.js";
import { logger } from "../utils/logger.js";

export class DVClient extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember,
      ],
      // Memory & Concurrency Optimization: Bound caches to prevent heap bloat and GC pauses
      makeCache: Options.cacheWithLimits({
        MessageManager: 100, // Caches up to 100 messages per channel
        StageInstanceManager: 0,
        ThreadMemberManager: 0,
        ReactionManager: 50,
      }),
      sweepers: {
        messages: {
          interval: 300, // Sweep every 5 minutes
          lifetime: 900, // Discard messages older than 15 minutes
        },
        users: {
          interval: 600,
          filter: () => (user) => !user.bot,
        },
        threads: {
          interval: 3600, // Sweep inactive threads every hour
          lifetime: 14400,
        },
      },
    });

    this.commands = new Collection();
    this.aliases = new Collection();
    this.components = new Collection();
    this.cooldowns = new Collection();
  }

  async loadCommands(dir = path.join(CONFIG.ROOT_DIR, "src", "commands")) {
    if (!fs.existsSync(dir)) return;

    const files = [];
    const readDirRecursive = (currentDir) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          readDirRecursive(fullPath);
        } else if (entry.name.endsWith(".js") && !entry.name.startsWith("_")) {
          files.push(fullPath);
        }
      }
    };

    readDirRecursive(dir);

    for (const file of files) {
      try {
        const moduleUrl = new URL(`file://${file.replace(/\\/g, "/")}`);
        const mod = await import(moduleUrl);
        const command = mod.default || mod.command;

        if (command && command.name) {
          this.commands.set(command.name.toLowerCase(), command);

          if (Array.isArray(command.aliases)) {
            for (const alias of command.aliases) {
              this.aliases.set(alias.toLowerCase(), command.name.toLowerCase());
            }
          }
        }
      } catch (err) {
        logger.error(`[COMMAND ERROR] Failed to load command from ${file}:`, err);
      }
    }

    logger.info(`[CLIENT] Loaded ${this.commands.size} commands (${this.aliases.size} aliases).`);
  }

  async loadEvents(dir = path.join(CONFIG.ROOT_DIR, "src", "events")) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js") && !f.startsWith("_"));

    for (const file of files) {
      try {
        const filePath = path.join(dir, file);
        const moduleUrl = new URL(`file://${filePath.replace(/\\/g, "/")}`);
        const mod = await import(moduleUrl);
        const event = mod.default || mod;

        if (event && event.name) {
          if (event.once) {
            this.once(event.name, (...args) => event.execute(this, ...args));
          } else {
            this.on(event.name, (...args) => event.execute(this, ...args));
          }
        }
      } catch (err) {
        logger.error(`[EVENT ERROR] Failed to load event from ${file}:`, err);
      }
    }

    logger.info(`[CLIENT] Loaded ${files.length} gateway events.`);
  }

  async loadComponents() {
    const { registerCommandControlComponents } = await import("../components/commandControlView.js");
    const { registerVerificationComponent } = await import("../components/verifyButton.js");
    registerCommandControlComponents(this);
    registerVerificationComponent(this);
    logger.info(`[CLIENT] Registered ${this.components.size} interaction component handlers.`);
  }

  async registerSlashCommands() {
    if (!CONFIG.TOKEN) return;

    const rest = new REST({ version: "10" }).setToken(CONFIG.TOKEN);
    const slashPayloads = [];

    for (const command of this.commands.values()) {
      if (command.prefixOnly) continue;
      const builder = command.buildSlashCommand?.() || command.slashBuilder;
      if (builder) {
        slashPayloads.push(builder.toJSON ? builder.toJSON() : builder);
      }
    }

    try {
      logger.info(`[SYNC] Registering ${slashPayloads.length} application commands...`);

      if (["dev", "development", "test"].includes(CONFIG.ENV) && CONFIG.DEV_GUILD_ID && this.user) {
        await rest.put(
          Routes.applicationGuildCommands(this.user.id, CONFIG.DEV_GUILD_ID),
          { body: slashPayloads }
        );
        logger.info(`[SYNC] Synced ${slashPayloads.length} guild commands to ${CONFIG.DEV_GUILD_ID}.`);
      } else if (this.user) {
        await rest.put(Routes.applicationCommands(this.user.id), {
          body: slashPayloads,
        });
        logger.info(`[SYNC] Synced ${slashPayloads.length} global application commands.`);
      }
    } catch (err) {
      logger.error("[SYNC ERROR] Failed to register application commands:", err);
    }
  }

  async start() {
    if (!CONFIG.TOKEN) {
      logger.warn("[CLIENT] DISCORD_TOKEN is missing. Bot cannot login.");
      return;
    }
    await this.login(CONFIG.TOKEN);
  }
}
