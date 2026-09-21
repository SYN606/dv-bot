import { PermissionFlagsBits } from "discord.js";
import { CommandContext } from "../core/command.js";
import { GLOBAL_COOLDOWN } from "../core/cooldown.js";
import { makeEmbed } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";
import {
  hasConfigAccess,
  hasModerationAccess,
  isBotAdmin,
} from "../core/permissions.js";
import { isExecutionAllowed } from "../db/helpers/acl.js";
import { isCommandRestricted } from "../db/helpers/channelCommandRestrict.js";

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
        ephemeral: true,
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
        ephemeral: true,
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
          ephemeral: true,
        });
      }

      const isAdmin = interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);
      if (!isAdmin) {
        const restricted = await isCommandRestricted(
          interaction.guild.id,
          interaction.channel.id,
          commandName
        );
        if (restricted) {
          return await interaction.reply({
            embeds: [
              makeEmbed({
                title: "Command Restricted",
                description: `${EMOJIS.get("warning") || "⚠️"} This command is **not allowed in this channel**.\n\n${EMOJIS.get("arrow_point") || "👉"} Try another channel or contact staff.`,
                level: "WARNING",
              }),
            ],
            ephemeral: true,
          });
        }
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
        ephemeral: true,
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
        ephemeral: true,
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
        ephemeral: true,
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
        await interaction.followUp({ embeds: [errEmbed], ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ embeds: [errEmbed], ephemeral: true }).catch(() => {});
      }
    }
  },
};
