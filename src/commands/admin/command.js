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
} from "../../db/helpers/channelCommandRestrict.js";
import { sendModLog } from "../../utils/modLog.js";

let componentsRegistered = false;

const slashBuilder = new SlashCommandBuilder()
  .setName("command")
  .setDescription("Manage channel command restrictions (disable / enable / list / panel)")
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
      .setDescription("Disable a bot command in a specific channel")
      .addStringOption((opt) =>
        opt
          .setName("command")
          .setDescription("The command to disable (e.g. ping, userstats)")
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel where command will be disabled (defaults to current)")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("enable")
      .setDescription("Re-enable a command in a specific channel")
      .addStringOption((opt) =>
        opt
          .setName("command")
          .setDescription("The command to re-enable")
          .setRequired(true)
          .setAutocomplete(true)
      )
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel where command will be re-enabled (defaults to current)")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("List all commands currently disabled in a channel")
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
  description: "Manage channel command restrictions (disable / enable / list / panel)",
  category: "Admin",
  aliases: ["disable", "enable"],
  configOnly: true,
  slashBuilder,

  async autocomplete(interaction) {
    if (!interaction.guild) return await interaction.respond([]);

    const focused = interaction.options.getFocused(true);
    if (focused.name !== "command") return await interaction.respond([]);

    const subcommand = interaction.options.getSubcommand(false);
    const targetChannelId = interaction.options.getChannel("channel")?.id || interaction.channelId;
    const query = focused.value.trim().toLowerCase();

    const client = interaction.client;
    const disabled = await getDisabledCommands(interaction.guild.id, targetChannelId);
    const disabledSet = new Set(disabled.map((d) => d.toLowerCase()));

    const choices = [];

    if (subcommand === "disable") {
      const all = [];
      for (const cmd of client.commands.values()) {
        const name = cmd.name.toLowerCase();
        if (PROTECTED_COMMANDS.has(name) || disabledSet.has(name)) continue;
        all.push(name);
      }
      all.sort();

      for (const name of all) {
        if (!query || name.includes(query)) {
          choices.push({ name: `/${name}`, value: name });
          if (choices.length >= 25) break;
        }
      }
    } else if (subcommand === "enable") {
      for (const name of disabled.sort()) {
        if (!query || name.toLowerCase().includes(query)) {
          choices.push({ name: `/${name}`, value: name });
          if (choices.length >= 25) break;
        }
      }
    }

    await interaction.respond(choices);
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

    let targetChannel = ctx.channel;
    const channelOpt = ctx.options.channel;
    if (channelOpt) {
      targetChannel = guild.channels.cache.get(channelOpt) || channel;
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
      const cmdName = (ctx.options.command || ctx.options._args?.[0] || "").toLowerCase().replace(/^\//, "");
      if (!cmdName) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Missing Argument",
              description: "Please specify a command name to disable.",
              level: "WARNING",
            }),
          ],
          ephemeral: true,
        });
      }

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
      const cmdName = (ctx.options.command || ctx.options._args?.[0] || "").toLowerCase().replace(/^\//, "");
      if (!cmdName) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Missing Argument",
              description: "Please specify a command name to enable.",
              level: "WARNING",
            }),
          ],
          ephemeral: true,
        });
      }

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
      const disabled = await getDisabledCommands(guild.id, targetChannel.id);
      const arrow = EMOJIS.get("arrow_point") || "👉";
      const success = EMOJIS.get("success") || "✅";
      const info = EMOJIS.get("announcement") || "ℹ️";

      const desc =
        disabled.length > 0
          ? `The following commands are currently **disabled** in ${targetChannel}:\n\n` +
            disabled.map((c) => `${arrow} \`/${c}\``).join("\n") +
            `\n\n*${info} Server Administrators bypass channel restrictions.*`
          : `${success} No commands are currently disabled in ${targetChannel}.`;

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: `Disabled Commands • #${targetChannel.name}`,
            description: desc,
            level: "INFO",
          }),
        ],
      });
    }
  },
});
