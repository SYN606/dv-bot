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
import type { Command, ComponentHandler } from "../types/discord.js";

export class DVClient extends Client {
  public commands: Collection<string, Command>;
  public aliases: Collection<string, string>;
  public components: Collection<string, ComponentHandler>;
  public cooldowns: Collection<string, Collection<string, number>>;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
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
      makeCache: Options.cacheWithLimits({
        MessageManager: 100,
        StageInstanceManager: 0,
        ThreadMemberManager: 0,
        ReactionManager: 50,
      }),
      sweepers: {
        messages: {
          interval: 300,
          lifetime: 900,
        },
        users: {
          interval: 600,
          filter: () => (user: any) => !user.bot,
        },
        threads: {
          interval: 3600,
          lifetime: 14400,
        },
      },
    });

    if (this.rest) {
      this.rest.setMaxListeners(50);
      this.rest.on("rateLimited", (info: any) => {
        logger.warn(
          `[DISCORD REST RATE LIMITED] Route: ${info.route || info.url || "unknown"} | Retry-After: ${info.timeToReset || info.retryAfter || 0}ms | Global: ${Boolean(info.global)}`
        );
      });
    }
    if (this.ws && typeof (this.ws as any).setMaxListeners === "function") {
      (this.ws as any).setMaxListeners(50);
    }
    
    (this.ws as any).on("shardCreate", (shard: any) => {
      if (typeof shard.setMaxListeners === "function") {
        shard.setMaxListeners(50);
      }
    });

    this.commands = new Collection();
    this.aliases = new Collection();
    this.components = new Collection();
    this.cooldowns = new Collection();
  }

  async loadCommands(dir = path.join(CONFIG.ROOT_DIR, "src", "commands")): Promise<void> {
    if (!fs.existsSync(dir)) return;

    const files: string[] = [];
    const readDirRecursive = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          readDirRecursive(fullPath);
        } else if (
          (entry.name.endsWith(".js") || entry.name.endsWith(".ts")) &&
          !entry.name.endsWith(".d.ts") &&
          !entry.name.startsWith("_")
        ) {
          files.push(fullPath);
        }
      }
    };

    readDirRecursive(dir);

    for (const file of files) {
      try {
        const moduleUrl = new URL(`file://${file.replace(/\\/g, "/")}`);
        const mod = await import(moduleUrl.href);
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

  async loadEvents(dir = path.join(CONFIG.ROOT_DIR, "src", "events")): Promise<void> {
    if (!fs.existsSync(dir)) return;

    const files = fs
      .readdirSync(dir)
      .filter(
        (f) =>
          (f.endsWith(".js") || f.endsWith(".ts")) &&
          !f.endsWith(".d.ts") &&
          !f.startsWith("_")
      );

    for (const file of files) {
      try {
        const filePath = path.join(dir, file);
        const moduleUrl = new URL(`file://${filePath.replace(/\\/g, "/")}`);
        const mod = await import(moduleUrl.href);
        const event = mod.default || mod;

        if (event && event.name) {
          if (event.once) {
            this.once(event.name, (...args: any[]) => event.execute(this, ...args));
          } else {
            this.on(event.name, (...args: any[]) => event.execute(this, ...args));
          }
        }
      } catch (err) {
        logger.error(`[EVENT ERROR] Failed to load event from ${file}:`, err);
      }
    }

    logger.info(`[CLIENT] Loaded ${files.length} gateway events.`);
  }

  async loadComponents(): Promise<void> {
    const { registerVerificationComponent } = await import("../components/verifyButton.js");
    registerVerificationComponent(this);
    logger.info(`[CLIENT] Registered ${this.components.size} interaction component handlers.`);
  }

  async registerSlashCommands(): Promise<void> {
    if (!CONFIG.TOKEN) return;

    const rest = new REST({ version: "10" }).setToken(CONFIG.TOKEN);
    const slashPayloads: any[] = [];

    for (const command of this.commands.values()) {
      if ((command as any).prefixOnly) continue;
      const builder = (command as any).buildSlashCommand?.() || (command as any).slashBuilder;
      if (builder) {
        slashPayloads.push(builder.toJSON ? builder.toJSON() : builder);
      }
    }

    try {
      logger.info(`[SYNC] Registering ${slashPayloads.length} application commands...`);

      if (["dev", "development", "test"].includes(CONFIG.ENV) && CONFIG.DEV_GUILD_ID && this.user) {
        const rawGuilds = Array.isArray(CONFIG.DEV_GUILD_ID)
          ? CONFIG.DEV_GUILD_ID
          : String(CONFIG.DEV_GUILD_ID).split(/[,\s;]+/);
        const guildIds = rawGuilds.map((id) => String(id).trim()).filter((id) => /^\d{17,20}$/.test(id));

        if (guildIds.length > 0) {
          let syncedGuilds = 0;
          for (const guildId of guildIds) {
            if (this.guilds?.cache?.size > 0 && !this.guilds.cache.has(guildId)) {
              logger.warn(`[SYNC] Bot is not currently in dev guild ${guildId}. Skipping guild command sync for this ID.`);
              continue;
            }

            try {
              await rest.put(
                Routes.applicationGuildCommands(this.user.id, guildId),
                { body: slashPayloads }
              );
              syncedGuilds++;
              logger.info(`[SYNC] Synced ${slashPayloads.length} guild commands to guild ${guildId}.`);
            } catch (guildErr: any) {
              logger.error(`[SYNC ERROR] Failed to register guild commands for ${guildId}:`, guildErr);
              if (guildErr.code === 50001 || guildErr.status === 403) {
                logger.warn(
                  `[SYNC] Guild ${guildId} returned Missing Access (50001). ` +
                  `Ensure the bot was invited to this server with the 'applications.commands' OAuth2 scope:\n` +
                  `  https://discord.com/oauth2/authorize?client_id=${this.user.id}&scope=bot%20applications.commands&permissions=8`
                );
              }
            }
          }

          if (syncedGuilds === 0) {
            logger.warn(`[SYNC] No dev guilds were successfully updated. Falling back to global application commands registration...`);
            await rest.put(Routes.applicationCommands(this.user.id), {
              body: slashPayloads,
            });
            logger.info(`[SYNC] Synced ${slashPayloads.length} global application commands as fallback.`);
          }
        } else {
          logger.warn(`[SYNC] DEV_GUILD_ID was provided but contained no valid snowflake IDs: ${CONFIG.DEV_GUILD_ID}`);
        }
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

  async start(): Promise<void> {
    if (!CONFIG.TOKEN) {
      logger.warn("[CLIENT] DISCORD_TOKEN is missing. Bot cannot login.");
      return;
    }
    await this.login(CONFIG.TOKEN);
  }
}
