import { MessageFlags, PermissionFlagsBits } from "discord.js";
import { CommandContext } from "../core/command.js";
import { GLOBAL_COOLDOWN } from "../core/cooldown.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";
import {
  hasConfigAccess,
  hasModerationAccess,
  isBotAdmin,
} from "../core/permissions.js";
import { isExecutionAllowed } from "../db/helpers/acl.js";
import { isCommandRestricted } from "../db/helpers/channelCommandRestrict.js";
import { isCommandGloballyDisabled } from "../db/helpers/guildCommandDisable.js";

export default {
  name: "interactionCreate",
  async execute(client, interaction) {
    // 1. Handle Autocomplete Interactions
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName.toLowerCase());
      if (command && typeof command.autocomplete === "function") {
        try {
          await command.autocomplete(interaction);
        } catch (err) {
          console.error(`[AUTOCOMPLETE ERROR] In '${interaction.commandName}':`, err);
        }
      }
      return;
    }

    // 2. Handle Component Interactions (Buttons, Select Menus, Modals)
    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
      const customId = interaction.customId;

      if (customId === "btn_private_bot_invite") {
        return await interaction.reply({
          embeds: [
            makeEmbed({
              title: "🔒 Private Bot",
              description:
                `**SYN** is the bot owner. Contact him for an invite.\n\n` +
                `• **Status:** Private authorization required.\n` +
                `• **Owner:** SYN (\`syn606\` • [syn606.wtf](https://syn606.wtf))\n` +
                `• Contact SYN directly to request adding this bot to your server.`,
              level: "INFO",
              color: COLORS.DARK,
              headerDivider: false,
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const handler = client.components.get(customId) || client.components.get(customId.split(":")[0]);
      if (handler) {
        try {
          await handler(interaction);
        } catch (err) {
          console.error(`[COMPONENT ERROR] In '${customId}':`, err);
        }
      }
      return;
    }

    // 3. Handle Slash Commands
    if (!interaction.isChatInputCommand()) return;

    const commandName = interaction.commandName.toLowerCase();
    const command = client.commands.get(commandName);

    if (!command) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Unknown Command",
            description: `${EMOJIS.get("fail") || "❌"} This command is no longer available.`,
            level: "ERROR",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // A. Global Cooldown Check
    if (!(await GLOBAL_COOLDOWN.checkInteraction(interaction))) {
      const retry = GLOBAL_COOLDOWN.retryAfter(interaction.user.id, interaction.guildId);
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Rate Limited",
            description: `${EMOJIS.get("warning") || "⚠️"} You are on cooldown. Please wait **${retry.toFixed(1)}s**.`,
            level: "WARNING",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // B. ACL Policy & Channel Restriction Check (Admins bypass)
    if (interaction.guild && interaction.channel) {
      const aclCheck = await isExecutionAllowed(
        interaction.guild.id,
        interaction.channel.id,
        interaction.member,
        commandName
      );
      if (!aclCheck.allowed) {
        return await interaction.reply({
          embeds: [
            makeEmbed({
              title: "Access Restricted",
              description: `${EMOJIS.get("warning") || "⚠️"} ${aclCheck.reason}`,
              level: "WARNING",
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // B1. Guild-wide command disable check (dashboard toggle)
      const globallyDisabled = await isCommandGloballyDisabled(interaction.guild.id, commandName);
      if (globallyDisabled) {
        return await interaction.reply({
          embeds: [
            makeEmbed({
              title: "Command Disabled",
              description: `${EMOJIS.get("fail") || "❌"} This command has been **disabled** in this server by an administrator.`,
              level: "ERROR",
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      // B2. Channel-specific restriction check
      const restricted = await isCommandRestricted(
        interaction.guild.id,
        interaction.channel.id,
        commandName
      );
      if (restricted && !(await isBotAdmin(interaction))) {
        return await interaction.reply({
          embeds: [
            makeEmbed({
              title: "Command Restricted",
              description: `${EMOJIS.get("warning") || "⚠️"} This command is **not allowed in this channel**.\n\n${EMOJIS.get("arrow_point") || "👉"} Try another channel or contact staff.`,
              level: "WARNING",
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // C. Permission Checks
    if (command.adminOnly && !(await isBotAdmin(interaction))) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You require **Administrator** or **Bot Admin** authority to use this command.`,
            level: "ERROR",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (command.configOnly && !(await hasConfigAccess(interaction))) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You require **Manage Server** or **Config** authority to use this command.`,
            level: "ERROR",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (command.modOnly && !(await hasModerationAccess(interaction, command.requiredPermission))) {
      return await interaction.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You lack the required moderation permissions to run this command.`,
            level: "ERROR",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // D. Build options map
    const options = {};
    for (const opt of interaction.options.data) {
      options[opt.name] = opt.value;
      if (opt.options) {
        for (const subopt of opt.options) {
          options[subopt.name] = subopt.value;
        }
      }
    }

    const ctx = new CommandContext({
      client,
      interaction,
      command,
      options,
      subcommand: interaction.options.getSubcommand(false),
    });

    try {
      await command.execute(ctx);
    } catch (err) {
      console.error(`[EXECUTION ERROR] In slash '/${commandName}':`, err);
      const errEmbed = makeEmbed({
        title: "Command Error",
        description: `${EMOJIS.get("fail") || "❌"} An unexpected error occurred while processing this command.`,
        level: "ERROR",
      });

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ embeds: [errEmbed], flags: MessageFlags.Ephemeral }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errEmbed], flags: MessageFlags.Ephemeral }).catch(() => {});
      }
    }
  },
};
