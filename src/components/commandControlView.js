import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} from "discord.js";
import { makeEmbed } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";
import { isBotAdmin, PROTECTED_COMMANDS } from "../core/permissions.js";
import {
  disableCommand,
  enableCommand,
  getDisabledCommands,
} from "../db/helpers/channelCommandRestrict.js";

export function createCommandControlRow(channelId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`cmd_ctrl:disable:${channelId}`)
      .setLabel("Disable Command")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`cmd_ctrl:enable:${channelId}`)
      .setLabel("Enable Command")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`cmd_ctrl:status:${channelId}`)
      .setLabel("Status")
      .setStyle(ButtonStyle.Secondary)
  );
}

export function registerCommandControlComponents(client) {
  // Button interactions
  client.components.set("cmd_ctrl", async (interaction) => {
    if (!(await isBotAdmin(interaction))) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} Only administrators can use this control panel.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    const [, action, channelId] = interaction.customId.split(":");
    const guild = interaction.guild;
    const channel = guild.channels.cache.get(channelId) || interaction.channel;

    if (action === "status") {
      const disabled = await getDisabledCommands(guild.id, channel.id);
      const arrow = EMOJIS.get("arrow_point") || "👉";
      const success = EMOJIS.get("success") || "✅";
      const info = EMOJIS.get("announcement") || "ℹ️";

      const desc =
        `**Target Channel:** ${channel}\n\n` +
        (disabled.length > 0
          ? disabled.map((c) => `${arrow} \`/${c}\``).join("\n")
          : `${success} No commands are currently disabled in this channel.`) +
        `\n\n*${info} Server Administrators bypass channel restrictions.*`;

      return await interaction.update({
        embeds: [
          makeEmbed({
            title: `Command Status • #${channel.name}`,
            description: desc,
            level: "INFO",
            footer: `Total Disabled: ${disabled.length}`,
          }),
        ],
        components: [createCommandControlRow(channel.id)],
      });
    }

    if (action === "disable") {
      const disabled = await getDisabledCommands(guild.id, channel.id);
      const disabledSet = new Set(disabled.map((d) => d.toLowerCase()));

      const available = [];
      for (const cmd of client.commands.values()) {
        const name = cmd.name.toLowerCase();
        if (PROTECTED_COMMANDS.has(name) || disabledSet.has(name)) continue;
        available.push(name);
      }
      available.sort();

      if (available.length === 0) {
        return await interaction.reply({
          embeds: [
            makeEmbed({
              title: "Disable Command",
              description: "All available commands are already disabled or protected.",
              level: "WARNING",
            }),
          ],
          ephemeral: true,
        });
      }

      const select = new StringSelectMenuBuilder()
        .setCustomId(`cmd_select:disable:${channel.id}`)
        .setPlaceholder("Select a command to disable")
        .addOptions(
          available.slice(0, 25).map((cmd) => ({
            label: `/${cmd}`,
            value: cmd,
          }))
        );

      const row = new ActionRowBuilder().addComponents(select);

      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Disable Command",
            description: `${EMOJIS.get("arrow_point") || "👉"} Select a command to disable in ${channel}.\n\n*Note: Administrators bypass channel restrictions.*`,
            level: "INFO",
          }),
        ],
        components: [row],
        ephemeral: true,
      });
    }

    if (action === "enable") {
      const disabled = await getDisabledCommands(guild.id, channel.id);
      if (disabled.length === 0) {
        return await interaction.reply({
          embeds: [
            makeEmbed({
              title: "No Disabled Commands",
              description: `${EMOJIS.get("success") || "✅"} There are currently no disabled commands in ${channel}.`,
              level: "INFO",
            }),
          ],
          ephemeral: true,
        });
      }

      const select = new StringSelectMenuBuilder()
        .setCustomId(`cmd_select:enable:${channel.id}`)
        .setPlaceholder("Select a command to re-enable")
        .addOptions(
          disabled.slice(0, 25).map((cmd) => ({
            label: `/${cmd}`,
            value: cmd,
          }))
        );

      const row = new ActionRowBuilder().addComponents(select);

      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Enable Command",
            description: `${EMOJIS.get("arrow_point") || "👉"} Select a command to re-enable in ${channel}.`,
            level: "INFO",
          }),
        ],
        components: [row],
        ephemeral: true,
      });
    }
  });

  // Select menu interactions
  client.components.set("cmd_select", async (interaction) => {
    if (!(await isBotAdmin(interaction))) return;

    const [, mode, channelId] = interaction.customId.split(":");
    const commandName = interaction.values[0];
    const guild = interaction.guild;
    const channel = guild.channels.cache.get(channelId) || interaction.channel;

    if (mode === "disable") {
      const changed = await disableCommand(guild.id, channel.id, commandName);
      const msg = changed
        ? `${EMOJIS.get("success") || "✅"} Command \`/${commandName}\` has been **disabled** in ${channel}.\n\n*Non-administrators cannot execute this command here.*`
        : `${EMOJIS.get("warning") || "⚠️"} \`/${commandName}\` is already disabled in ${channel}.`;

      return await interaction.update({
        embeds: [
          makeEmbed({
            title: "Command Updated",
            description: msg,
            level: changed ? "SUCCESS" : "WARNING",
          }),
        ],
        components: [],
      });
    }

    if (mode === "enable") {
      const changed = await enableCommand(guild.id, channel.id, commandName);
      const msg = changed
        ? `${EMOJIS.get("success") || "✅"} Command \`/${commandName}\` has been **re-enabled** in ${channel}.`
        : `${EMOJIS.get("warning") || "⚠️"} \`/${commandName}\` was not disabled in ${channel}.`;

      return await interaction.update({
        embeds: [
          makeEmbed({
            title: "Command Updated",
            description: msg,
            level: changed ? "SUCCESS" : "WARNING",
          }),
        ],
        components: [],
      });
    }
  });
}
