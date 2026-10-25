import {
  ChannelType,
  SlashCommandBuilder,
} from "discord.js";
import {
  createCommandControlRow,
  registerCommandControlComponents,
} from "../../components/commandControlView.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { PROTECTED_COMMANDS } from "../../core/permissions.js";
import {
  disableCommand,
  enableCommand,
  getDisabledCommands,
  bulkRestrictCommands,
  bulkUnrestrictCommands,
} from "../../db/helpers/channelCommandRestrict.js";
import {
  disableCommandGuild,
  enableCommandGuild,
  bulkDisableCommandsGuild,
  bulkEnableCommandsGuild,
  getGuildDisabledCommands,
} from "../../db/helpers/guildCommandDisable.js";
import { sendModLog } from "../../utils/modLog.js";

let componentsRegistered = false;

const CATEGORY_NAMES = ["fun", "moderation", "utility", "analytics", "channels", "voice"];

const slashBuilder = new SlashCommandBuilder()
  .setName("command")
  .setDescription("Manage command availability and module restrictions (disable / enable / list / panel)")
  .addSubcommand((sub) =>
    sub
      .setName("panel")
      .setDescription("Open the interactive command control panel")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Target channel (defaults to current)")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("disable")
      .setDescription("Disable a bot command or entire category")
      .addStringOption((opt) =>
        opt
          .setName("command")
          .setDescription("Command or category to disable (e.g. fun, ship, ping)")
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addBooleanOption((opt) =>
        opt
          .setName("server")
          .setDescription("Disable server-wide across all channels (defaults to false)")
          .setRequired(false)
      )
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Specific channel to disable in (defaults to current if not server-wide)")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("enable")
      .setDescription("Re-enable a command or entire category")
      .addStringOption((opt) =>
        opt
          .setName("command")
          .setDescription("Command or category to re-enable (e.g. fun, ship, ping)")
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addBooleanOption((opt) =>
        opt
          .setName("server")
          .setDescription("Re-enable server-wide across all channels")
          .setRequired(false)
      )
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Specific channel to re-enable in")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("List all currently disabled commands (channel & server-wide)")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Target channel to inspect")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
  );

export default createCommand({
  name: "command",
  description: "Manage command availability and module restrictions (disable / enable / list / panel)",
  category: "Admin",
  aliases: ["disable", "enable"],
  usage: "<panel|disable|enable|list> <command|category> [--server] [channel]",
  examples: [
    "/command panel",
    "/command disable command:fun server:True",
    "/command enable command:fun server:True",
    "/command disable command:ship channel:#serious-chat",
    "dv disable fun --server",
    "dv enable fun",
    "dv command list",
  ],
  configOnly: true,
  slashBuilder,

  async autocomplete(interaction) {
    if (!interaction.guild) return await interaction.respond([]).catch(() => {});

    try {
      const focused = interaction.options.getFocused(true);
      if (focused.name !== "command") return await interaction.respond([]).catch(() => {});

      const subcommand = interaction.options.getSubcommand(false);
      const query = focused.value.trim().toLowerCase();
      const client = interaction.client;

      const choices = [];

      // 1. Category choices
      for (const cat of CATEGORY_NAMES) {
        const catLabel = `📂 Category: ${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
        if (!query || cat.includes(query) || catLabel.toLowerCase().includes(query)) {
          choices.push({ name: catLabel, value: `category:${cat}` });
        }
      }

      // 2. Command choices
      const all = [];
      for (const cmd of client.commands.values()) {
        const name = cmd.name.toLowerCase();
        if (PROTECTED_COMMANDS.has(name)) continue;
        all.push(name);
      }
      all.sort();

      for (const name of all) {
        if (!query || name.includes(query)) {
          choices.push({ name: `/${name}`, value: name });
          if (choices.length >= 25) break;
        }
      }

      await interaction.respond(choices.slice(0, 25)).catch(() => {});
    } catch {
      await interaction.respond([]).catch(() => {});
    }
  },

  async execute(ctx) {
    if (!componentsRegistered) {
      registerCommandControlComponents(ctx.client);
      componentsRegistered = true;
    }

    const { guild, channel } = ctx;
    if (!guild) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Invalid Context",
            description: "This command can only be executed in a server.",
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    let sub = ctx.subcommand || "panel";
    // If called via alias '!disable' or '!enable'
    if (ctx.command.name === "command" && ctx.options._args) {
      const firstArg = ctx.options._args[0]?.toLowerCase();
      if (["panel", "disable", "enable", "list"].includes(firstArg)) {
        sub = firstArg;
        ctx.options._args.shift();
      }
    }

    // Detect server flag from prefix or slash options
    let isServer = Boolean(ctx.options.server);
    if (!isServer && ctx.options._args) {
      const serverFlagIndex = ctx.options._args.findIndex((a) =>
        ["--server", "-s", "--all", "-a", "server", "all", "global"].includes(a.toLowerCase())
      );
      if (serverFlagIndex !== -1) {
        isServer = true;
        ctx.options._args.splice(serverFlagIndex, 1);
      }
    }

    let targetChannel = ctx.channel;
    const channelOpt = ctx.options.channel;
    if (channelOpt) {
      targetChannel = guild.channels.cache.get(channelOpt) || channel;
    } else if (ctx.message?.mentions?.channels?.size > 0) {
      targetChannel = ctx.message.mentions.channels.first();
    }

    // --- SUBCOMMAND: PANEL ---
    if (sub === "panel") {
      const embed = makeEmbed({
        title: "Command Control Panel",
        description:
          `${EMOJIS.get("announcement") || "📢"} Manage command availability for ${targetChannel}.\n\n` +
          `${EMOJIS.get("arrow_point") || "👉"} **Disable Command:** Block a command in this channel\n` +
          `${EMOJIS.get("arrow_point") || "👉"} **Enable Command:** Restore a disabled command\n` +
          `${EMOJIS.get("arrow_point") || "👉"} **Status:** View all restricted commands\n\n` +
          `*Note: Server Administrators bypass channel restrictions.*`,
        level: "SYSTEM",
        footer: `Channel • #${targetChannel.name}`,
      });

      return await ctx.reply({
        embeds: [embed],
        components: [createCommandControlRow(targetChannel.id)],
        ephemeral: true,
      });
    }

    // --- SUBCOMMAND: DISABLE ---
    if (sub === "disable") {
      let rawTarget = (ctx.options.command || ctx.options._args?.[0] || "").toLowerCase().replace(/^\//, "");
      if (!rawTarget) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Missing Argument",
              description: "Please specify a command or category name to disable.\n\n**Examples:**\n• `dv disable fun --server`\n• `dv disable ship`\n• `/command disable command:fun server:True`",
              level: "WARNING",
            }),
          ],
          ephemeral: true,
        });
      }

      const isCategory = rawTarget.startsWith("category:") || CATEGORY_NAMES.includes(rawTarget);
      const categoryKey = isCategory ? rawTarget.replace(/^category:/, "") : null;

      // Category Disable
      if (isCategory) {
        const catCommands = [];
        for (const cmd of ctx.client.commands.values()) {
          const cmdCat = (cmd.category || "Utility").toLowerCase();
          if (cmdCat === categoryKey && !PROTECTED_COMMANDS.has(cmd.name.toLowerCase())) {
            catCommands.push(cmd.name.toLowerCase());
          }
        }

        if (catCommands.length === 0) {
          return await ctx.reply({
            embeds: [
              makeEmbed({
                title: "Category Not Found",
                description: `No configurable commands found in category \`${categoryKey}\`.`,
                level: "WARNING",
              }),
            ],
            ephemeral: true,
          });
        }

        // Default category toggle to server-wide if channel was not explicitly provided in options
        const applyServer = isServer || (!ctx.options.channel && !ctx.message?.mentions?.channels?.size);

        if (applyServer) {
          await bulkDisableCommandsGuild(guild.id, [...catCommands, `category:${categoryKey}`]);
          await sendModLog({
            guild,
            category: "CONFIG",
            title: "Category Disabled",
            description: `Category **${categoryKey}** (${catCommands.length} commands) disabled server-wide.`,
            level: "WARNING",
            actor: ctx.user,
            extraFields: { Category: categoryKey, Scope: "Server-Wide", Commands: catCommands.join(", ") },
          });

          return await ctx.reply({
            embeds: [
              makeEmbed({
                title: "Category Disabled (Server-Wide)",
                description: `${EMOJIS.get("success") || "✅"} Successfully **disabled** all commands in category **${categoryKey}** server-wide (${catCommands.length} commands).\n\nNon-administrators can no longer execute these commands in this server.`,
                level: "SUCCESS",
              }),
            ],
          });
        } else {
          await bulkRestrictCommands(guild.id, targetChannel.id, [...catCommands, `category:${categoryKey}`]);
          await sendModLog({
            guild,
            category: "CONFIG",
            title: "Category Restricted",
            description: `Category **${categoryKey}** disabled in ${targetChannel}.`,
            level: "WARNING",
            actor: ctx.user,
            extraFields: { Category: categoryKey, Channel: `#${targetChannel.name}` },
          });

          return await ctx.reply({
            embeds: [
              makeEmbed({
                title: "Category Disabled (Channel)",
                description: `${EMOJIS.get("success") || "✅"} Successfully **disabled** category **${categoryKey}** in ${targetChannel}.\n\nNon-administrators cannot use these commands in this channel.`,
                level: "SUCCESS",
              }),
            ],
          });
        }
      }

      // Single Command Disable
      const cmdName = rawTarget;
      if (PROTECTED_COMMANDS.has(cmdName)) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Protected Command",
              description: `${EMOJIS.get("warning") || "⚠️"} Command \`/${cmdName}\` is a critical core command and **cannot be disabled**.`,
              level: "WARNING",
            }),
          ],
          ephemeral: true,
        });
      }

      if (isServer) {
        const changed = await disableCommandGuild(guild.id, cmdName);
        if (changed) {
          await sendModLog({
            guild,
            category: "CONFIG",
            title: "Command Disabled (Server-Wide)",
            description: `Command \`/${cmdName}\` disabled server-wide.`,
            level: "WARNING",
            actor: ctx.user,
            extraFields: { Command: `/${cmdName}`, Scope: "Server-Wide" },
          });

          return await ctx.reply({
            embeds: [
              makeEmbed({
                title: "Command Disabled (Server-Wide)",
                description: `${EMOJIS.get("success") || "✅"} Successfully disabled \`/${cmdName}\` across the entire server.`,
                level: "SUCCESS",
              }),
            ],
          });
        }

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Already Disabled",
              description: `${EMOJIS.get("warning") || "⚠️"} Command \`/${cmdName}\` is already disabled server-wide.`,
              level: "WARNING",
            }),
          ],
          ephemeral: true,
        });
      }

      // Channel-scoped disable
      const changed = await disableCommand(guild.id, targetChannel.id, cmdName);
      if (changed) {
        await sendModLog({
          guild,
          category: "CONFIG",
          title: "Command Restricted",
          description: `Command \`/${cmdName}\` disabled in ${targetChannel}.`,
          level: "WARNING",
          actor: ctx.user,
          extraFields: { Command: `/${cmdName}`, Channel: `#${targetChannel.name}` },
        });

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Command Disabled",
              description: `${EMOJIS.get("success") || "✅"} Successfully disabled \`/${cmdName}\` in ${targetChannel}.\n\n*Non-administrators can no longer execute this command here.*`,
              level: "SUCCESS",
            }),
          ],
        });
      }

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Already Disabled",
            description: `${EMOJIS.get("warning") || "⚠️"} Command \`/${cmdName}\` is already disabled in ${targetChannel}.`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    // --- SUBCOMMAND: ENABLE ---
    if (sub === "enable") {
      let rawTarget = (ctx.options.command || ctx.options._args?.[0] || "").toLowerCase().replace(/^\//, "");
      if (!rawTarget) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Missing Argument",
              description: "Please specify a command or category name to re-enable.\n\n**Examples:**\n• `dv enable fun --server`\n• `dv enable ship`\n• `/command enable command:fun server:True`",
              level: "WARNING",
            }),
          ],
          ephemeral: true,
        });
      }

      const isCategory = rawTarget.startsWith("category:") || CATEGORY_NAMES.includes(rawTarget);
      const categoryKey = isCategory ? rawTarget.replace(/^category:/, "") : null;

      // Category Enable
      if (isCategory) {
        const catCommands = [];
        for (const cmd of ctx.client.commands.values()) {
          const cmdCat = (cmd.category || "Utility").toLowerCase();
          if (cmdCat === categoryKey) {
            catCommands.push(cmd.name.toLowerCase());
          }
        }

        const applyServer = isServer || (!ctx.options.channel && !ctx.message?.mentions?.channels?.size);

        if (applyServer) {
          await bulkEnableCommandsGuild(guild.id, [...catCommands, `category:${categoryKey}`]);
          await sendModLog({
            guild,
            category: "CONFIG",
            title: "Category Re-enabled",
            description: `Category **${categoryKey}** re-enabled server-wide.`,
            level: "INFO",
            actor: ctx.user,
            extraFields: { Category: categoryKey, Scope: "Server-Wide" },
          });

          return await ctx.reply({
            embeds: [
              makeEmbed({
                title: "Category Re-enabled (Server-Wide)",
                description: `${EMOJIS.get("success") || "✅"} Successfully **re-enabled** category **${categoryKey}** server-wide (${catCommands.length} commands).`,
                level: "SUCCESS",
              }),
            ],
          });
        } else {
          await bulkUnrestrictCommands(guild.id, targetChannel.id, [...catCommands, `category:${categoryKey}`]);
          await sendModLog({
            guild,
            category: "CONFIG",
            title: "Category Unrestricted",
            description: `Category **${categoryKey}** re-enabled in ${targetChannel}.`,
            level: "INFO",
            actor: ctx.user,
            extraFields: { Category: categoryKey, Channel: `#${targetChannel.name}` },
          });

          return await ctx.reply({
            embeds: [
              makeEmbed({
                title: "Category Re-enabled (Channel)",
                description: `${EMOJIS.get("success") || "✅"} Successfully **re-enabled** category **${categoryKey}** in ${targetChannel}.`,
                level: "SUCCESS",
              }),
            ],
          });
        }
      }

      // Single Command Enable
      const cmdName = rawTarget;
      if (isServer) {
        const changed = await enableCommandGuild(guild.id, cmdName);
        if (changed) {
          await sendModLog({
            guild,
            category: "CONFIG",
            title: "Command Re-enabled (Server-Wide)",
            description: `Command \`/${cmdName}\` re-enabled server-wide.`,
            level: "INFO",
            actor: ctx.user,
            extraFields: { Command: `/${cmdName}`, Scope: "Server-Wide" },
          });

          return await ctx.reply({
            embeds: [
              makeEmbed({
                title: "Command Re-enabled (Server-Wide)",
                description: `${EMOJIS.get("success") || "✅"} Successfully re-enabled \`/${cmdName}\` server-wide.`,
                level: "SUCCESS",
              }),
            ],
          });
        }

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Not Disabled",
              description: `${EMOJIS.get("warning") || "⚠️"} Command \`/${cmdName}\` was not disabled server-wide.`,
              level: "WARNING",
            }),
          ],
          ephemeral: true,
        });
      }

      // Channel-scoped enable
      const changed = await enableCommand(guild.id, targetChannel.id, cmdName);
      if (changed) {
        await sendModLog({
          guild,
          category: "CONFIG",
          title: "Command Unrestricted",
          description: `Command \`/${cmdName}\` re-enabled in ${targetChannel}.`,
          level: "INFO",
          actor: ctx.user,
          extraFields: { Command: `/${cmdName}`, Channel: `#${targetChannel.name}` },
        });

        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Command Re-enabled",
              description: `${EMOJIS.get("success") || "✅"} Successfully re-enabled \`/${cmdName}\` in ${targetChannel}.`,
              level: "SUCCESS",
            }),
          ],
        });
      }

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Not Disabled",
            description: `${EMOJIS.get("warning") || "⚠️"} Command \`/${cmdName}\` was not disabled in ${targetChannel}.`,
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    // --- SUBCOMMAND: LIST ---
    if (sub === "list") {
      const channelDisabled = await getDisabledCommands(guild.id, targetChannel.id).catch(() => []);
      const guildDisabled = await getGuildDisabledCommands(guild.id).catch(() => []);

      const arrow = EMOJIS.get("arrow_point") || "👉";
      const success = EMOJIS.get("success") || "✅";
      const info = EMOJIS.get("announcement") || "ℹ️";

      let desc = "";

      if (guildDisabled.length > 0) {
        desc += `**Server-Wide Disabled Commands & Categories:**\n` +
          guildDisabled.map((c) => `${arrow} \`${c.startsWith("category:") ? "📂 " + c : "/" + c}\``).join("\n") +
          `\n\n`;
      } else {
        desc += `${success} No commands are disabled server-wide.\n\n`;
      }

      if (channelDisabled.length > 0) {
        desc += `**Disabled in ${targetChannel}:**\n` +
          channelDisabled.map((c) => `${arrow} \`/${c}\``).join("\n") +
          `\n\n`;
      } else {
        desc += `${success} No channel-specific restrictions in ${targetChannel}.\n\n`;
      }

      desc += `*${info} Server Administrators bypass all command restrictions.*`;

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: `Command Availability • ${guild.name}`,
            description: desc,
            level: "INFO",
          }),
        ],
      });
    }
  },
});
