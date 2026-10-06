import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { CONFIG } from "../../config.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { getRestrictedCommands } from "../../db/helpers/channelCommandRestrict.js";

const CATEGORY_EMOJIS = {
  admin: "🛡️",
  channels: "📁",
  moderation: "🔨",
  utility: "🛠️",
  voice: "🔊",
  general: "🔹",
  analytics: "📊",
};

const BANNER_GIF = process.env.HELP_BANNER_GIF || null;

function getCommandTypeBadge(command) {
  const isSlash = !!command.slashBuilder || !command.prefixOnly;
  const isPrefix = !command.slashOnly;
  
  if (isPrefix && isSlash) return "`[Hybrid]`";
  if (isSlash) return "`[Slash]`";
  return "`[Prefix]`";
}

const slashBuilder = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Show bot command directory.")
  .addStringOption((opt) =>
    opt
      .setName("command")
      .setDescription("Specific command name to view detailed syntax and usage rules")
      .setRequired(false)
      .setAutocomplete(true)
  );

export default createCommand({
  name: "help",
  description: "Show bot command directory.",
  category: "Utility",
  aliases: ["h"],
  slashBuilder,

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const client = interaction.client;
    
    let choices = [];
    for (const cmd of client.commands.values()) {
      if (cmd.name.toLowerCase().includes(focusedValue) || cmd.aliases.some(a => a.toLowerCase().includes(focusedValue))) {
        choices.push({ name: cmd.name, value: cmd.name });
      }
    }
    
    // Sort and limit to 25
    choices = choices.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 25);
    await interaction.respond(choices).catch(() => {});
  },

  async execute(ctx) {
    const { client, guild, channel, user, member, message, interaction } = ctx;
    
    // Support text prefix fallback syntax too: !help <command>
    const query = ctx.options.command || ctx.options._args?.[0];
    const rawPrefix = CONFIG.PREFIX || "dv";
    const currentPrefix = rawPrefix.trim();

    // 1. Specific Command Details
    if (query) {
      const searchName = query.toLowerCase().replace(/^\//, "");
      const resolvedName = client.aliases.get(searchName) || searchName;
      const cmd = client.commands.get(resolvedName);

      if (!cmd) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Command Not Found",
              description: `${EMOJIS.get("fail") || "❌"} Command \`${query}\` not found in system directory.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      const typeBadge = getCommandTypeBadge(cmd);
      const isSlash = !!cmd.slashBuilder || !cmd.prefixOnly;
      const isPrefix = !cmd.slashOnly;
      
      let usageStr = "";
      if (isSlash && !isPrefix) {
        usageStr = `/${cmd.name}`;
      } else if (isSlash && isPrefix) {
        usageStr = `/${cmd.name}  OR  ${currentPrefix} ${cmd.name}`;
      } else {
        usageStr = `${currentPrefix} ${cmd.name}`;
      }

      const aliasesStr = cmd.aliases.length > 0 ? cmd.aliases.map((a) => `\`${a}\``).join(", ") : "None";
      
      let authority = "Everyone";
      if (cmd.adminOnly) authority = "Bot Admin";
      else if (cmd.configOnly) authority = "Manage Server";
      else if (cmd.modOnly) authority = "Moderator";
      
      const desc =
        `### ${EMOJIS.get("announcement") || "📖"} Command Detail: \`${cmd.name}\` ${typeBadge}\n\n` +
        `**Description:** ${cmd.description}\n` +
        `**Usage:** \`${usageStr}\`\n` +
        `**Aliases:** ${aliasesStr}\n` +
        `**Permissions:** \`${authority}\`\n\n` +
        `**Examples:**\n• \`${usageStr}\``;

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Help Center • Syntax Overview",
            description: desc,
            level: "INFO",
            footer: `Action by: ${user.tag || user.username}`,
          }),
        ],
        ephemeral: ctx.isInteraction ? true : false,
      });
    }

    // 2. Main Command Directory Overview
    let restrictedSet = new Set();
    const isAdminUser = member?.permissions?.has(PermissionFlagsBits.Administrator);
    
    if (guild && channel && !isAdminUser) {
      try {
        const restricted = await getRestrictedCommands(guild.id, channel.id);
        restrictedSet = new Set(restricted.map((c) => c.toLowerCase()));
      } catch (e) {}
    }

    // Build Categories Map dynamically
    const categoriesMap = new Map();
    for (const cmd of client.commands.values()) {
      if (restrictedSet.has(cmd.name.toLowerCase()) && !isAdminUser) continue;

      const catName = cmd.category || "General";
      if (!categoriesMap.has(catName)) {
        categoriesMap.set(catName, []);
      }
      categoriesMap.get(catName).push(cmd);
    }

    const categoriesList = Array.from(categoriesMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    if (categoriesList.length === 0) {
      return await ctx.reply({
        embeds: [makeEmbed({ title: "No Commands", description: "No commands are available in this channel.", level: "WARNING" })],
        ephemeral: true,
      });
    }

    // Build the Dropdown Options
    const options = categoriesList.map(([catName, cmds]) => {
      const catKey = catName.toLowerCase();
      let emoji = CATEGORY_EMOJIS[catKey];
      if (!emoji) {
        // Try fuzzy matching emojis
        if (catKey.includes("mod")) emoji = EMOJIS.get("moderation") || "🔨";
        else if (catKey.includes("admin")) emoji = EMOJIS.get("admin") || "🛡️";
        else if (catKey.includes("util")) emoji = EMOJIS.get("peach_arrow") || "🛠️";
        else if (catKey.includes("channel")) emoji = EMOJIS.get("curved_arrow") || "📁";
        else emoji = EMOJIS.get("arrow_point") || "🔹";
      }

      return {
        label: catName,
        value: catName,
        emoji: emoji,
        description: `Explore ${catName} commands. (${cmds.length} cmds)`,
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("help_category_select")
      .setPlaceholder("📂 Select a category to explore...")
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options);

    const homeButton = new ButtonBuilder()
      .setCustomId("help_home")
      .setLabel("Home")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("🏠");

    const closeButton = new ButtonBuilder()
      .setCustomId("help_close")
      .setLabel("Close")
      .setStyle(ButtonStyle.Danger)
      .setEmoji("🗑️");

    const actionRow1 = new ActionRowBuilder().addComponents(selectMenu);
    const actionRow2 = new ActionRowBuilder().addComponents(homeButton, closeButton);

    const desc =
      `### ${EMOJIS.get("animated_ping") || "✨"} Welcome to the Help Center\n` +
      `Select a module from the dropdown menu below to inspect category commands.\n\n` +
      `${EMOJIS.get("arrow_point") || "➡️"} **Need specific info?** Use \`${currentPrefix} help <command_name>\`\n` +
      `${EMOJIS.get("arrow_point") || "➡️"} **System Status:** Operational`;

    const mainEmbed = makeEmbed({
      title: "Digital Vigital • Main Menu",
      description: desc,
      level: "INFO",
      footer: `Requested by ${user.tag || user.username}`,
    });
    
    if (BANNER_GIF) {
      mainEmbed.setImage(BANNER_GIF);
    }

    const responseMsg = await ctx.reply({
      embeds: [mainEmbed],
      components: [actionRow1, actionRow2],
    });

    // Component Collector
    const collector = responseMsg.createMessageComponentCollector({
      filter: (i) => i.user.id === user.id,
      time: 120000,
    });

    collector.on("collect", async (i) => {
      if (i.customId === "help_close") {
        await i.deferUpdate().catch(() => {});
        return collector.stop("closed");
      }

      if (i.customId === "help_home") {
        await i.update({ embeds: [mainEmbed], components: [actionRow1, actionRow2] }).catch(() => {});
        return;
      }

      if (i.customId === "help_category_select") {
        const catName = i.values[0];
        const categoryCmds = categoriesMap.get(catName) || [];
        
        const catKey = catName.toLowerCase();
        let emoji = CATEGORY_EMOJIS[catKey] || EMOJIS.get("arrow_point") || "🔹";
        const arrow = EMOJIS.get("arrow_point") || "➡️";

        let catDesc = `### ${emoji} ${catName} Module\nBrowse commands below. Use \`${currentPrefix} help <command>\` for detailed syntax.\n\n`;

        for (const cmd of categoryCmds) {
          const typeBadge = getCommandTypeBadge(cmd);
          const isSlash = !!cmd.slashBuilder || !cmd.prefixOnly;
          const isPrefix = !cmd.slashOnly;
          const name = cmd.name;

          let cmdString = "";
          if (isSlash && !isPrefix) cmdString = `/${name}`;
          else if (isSlash && isPrefix) cmdString = `/${name} or ${currentPrefix} ${name}`;
          else cmdString = `${currentPrefix} ${name}`;

          const aliases = cmd.aliases.length > 0 ? ` *[Aliases: ${cmd.aliases.join(", ")}]*` : "";

          catDesc +=
            `${arrow} **\`${cmdString}\`** ${typeBadge}${aliases}\n` +
            `> *${cmd.description}*\n\n`;
        }

        const catEmbed = makeEmbed({
          title: "Digital Vigital • Command Directory",
          description: catDesc,
          level: "INFO",
          footer: `Requested by ${user.tag || user.username}`,
        });

        if (BANNER_GIF) {
          catEmbed.setImage(BANNER_GIF);
        }

        await i.update({ embeds: [catEmbed], components: [actionRow1, actionRow2] }).catch(() => {});
      }
    });

    collector.on("end", async (collected, reason) => {
      if (reason === "closed") {
        if (ctx.isInteraction) {
          await interaction.deleteReply().catch(() => {});
        } else if (responseMsg && responseMsg.delete) {
          await responseMsg.delete().catch(() => {});
        }
        return;
      }
      
      // Timeout
      selectMenu.setDisabled(true);
      homeButton.setDisabled(true);
      closeButton.setDisabled(true);
      
      if (responseMsg && responseMsg.edit) {
        await responseMsg.edit({ components: [new ActionRowBuilder().addComponents(selectMenu), new ActionRowBuilder().addComponents(homeButton, closeButton)] }).catch(() => {});
      } else if (ctx.isInteraction) {
        await interaction.editReply({ components: [new ActionRowBuilder().addComponents(selectMenu), new ActionRowBuilder().addComponents(homeButton, closeButton)] }).catch(() => {});
      }
    });
  },
});
