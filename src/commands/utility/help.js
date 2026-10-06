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

const CATEGORY_META = {
  admin: {
    name: "Admin",
    emoji: "🛡️",
    description: "Auditing, permissions, roles, and administrative controls.",
  },
  analytics: {
    name: "Analytics",
    emoji: "📊",
    description: "Activity tracking, chat and voice leaderboards, and user stats.",
  },
  channels: {
    name: "Channels",
    emoji: "📁",
    description: "Verification-aware channel locking, hiding, and slowmode controls.",
  },
  moderation: {
    name: "Moderation",
    emoji: "🔨",
    description: "Banning, kicking, timeouts, tempbans, and warning enforcement.",
  },
  utility: {
    name: "Utility",
    emoji: "🛠️",
    description: "General utility tools, avatars, server info, and user lookups.",
  },
  voice: {
    name: "Voice",
    emoji: "🔊",
    description: "Voice channel moderation, dragging, and member movement.",
  },
};

const BANNER_GIF = process.env.HELP_BANNER_GIF || null;

function getCommandTypeBadge(command) {
  if (command.slashOnly) return "`[Slash Only]`";
  if (command.prefixOnly) return "`[Prefix Only]`";
  return "`[Slash & Prefix]`";
}

function getFriendlyPermission(cmd) {
  if (cmd.requiredPermission) {
    for (const [permName, permBit] of Object.entries(PermissionFlagsBits)) {
      if (cmd.requiredPermission === permBit) {
        return permName.replace(/([A-Z])/g, " $1").trim();
      }
    }
  }
  if (cmd.adminOnly) return "Bot Administrator / Admin";
  if (cmd.configOnly) return "Manage Server";
  if (cmd.modOnly) return "Moderator";
  return "Everyone";
}

function buildCommandHelpEmbed(cmd, currentPrefix, user) {
  const isSlash = !cmd.prefixOnly;
  const isPrefix = !cmd.slashOnly;
  const typeBadge = getCommandTypeBadge(cmd);

  const json = cmd.slashBuilder?.toJSON ? cmd.slashBuilder.toJSON() : null;
  const rawOptions = json?.options || [];

  const subcommands = rawOptions.filter((opt) => opt.type === 1);
  const regularOptions = rawOptions.filter((opt) => opt.type !== 1);

  // 1. Determine Slash Usage
  let slashUsageList = [];
  if (isSlash) {
    if (subcommands.length > 0) {
      for (const sub of subcommands) {
        const subArgs = (sub.options || []).map((o) => (o.required ? `<${o.name}>` : `[${o.name}]`)).join(" ");
        slashUsageList.push(`• \`/${cmd.name} ${sub.name}${subArgs ? " " + subArgs : ""}\``);
      }
    } else {
      const args = regularOptions.map((o) => (o.required ? `<${o.name}>` : `[${o.name}]`)).join(" ");
      slashUsageList.push(`• \`/${cmd.name}${args ? " " + args : ""}\``);
    }
  } else {
    slashUsageList.push(`• *Not available (Prefix command only)*`);
  }

  // 2. Determine Prefix Usage
  let prefixUsageList = [];
  if (isPrefix) {
    if (cmd.usage) {
      const formatted = cmd.usage.startsWith(cmd.name) ? cmd.usage : `${cmd.name} ${cmd.usage}`;
      prefixUsageList.push(`• \`${currentPrefix}${formatted}\``);
    } else if (subcommands.length > 0) {
      for (const sub of subcommands) {
        const subArgs = (sub.options || []).map((o) => (o.required ? `<${o.name}>` : `[${o.name}]`)).join(" ");
        prefixUsageList.push(`• \`${currentPrefix}${cmd.name} ${sub.name}${subArgs ? " " + subArgs : ""}\``);
      }
    } else {
      const args = regularOptions.map((o) => (o.required ? `<${o.name}>` : `[${o.name}]`)).join(" ");
      prefixUsageList.push(`• \`${currentPrefix}${cmd.name}${args ? " " + args : ""}\``);
    }
  } else {
    prefixUsageList.push(`• *Not available (Slash command only)*`);
  }

  // 3. Subcommands & Options breakdown
  let optionsDetails = [];
  if (subcommands.length > 0) {
    optionsDetails.push(`**Subcommands:**`);
    for (const sub of subcommands) {
      optionsDetails.push(`• **\`${sub.name}\`**: ${sub.description}`);
      if (sub.options && sub.options.length > 0) {
        for (const o of sub.options) {
          const req = o.required ? "*required*" : "*optional*";
          optionsDetails.push(`  └ \`${o.name}\` (${req}): ${o.description}`);
        }
      }
    }
  } else if (regularOptions.length > 0) {
    optionsDetails.push(`**Options:**`);
    for (const o of regularOptions) {
      const req = o.required ? "*required*" : "*optional*";
      optionsDetails.push(`• \`${o.name}\` (${req}): ${o.description}`);
    }
  }

  // 4. Examples
  let examplesList = [];
  if (cmd.examples && cmd.examples.length > 0) {
    examplesList = cmd.examples.map((ex) => `• \`${ex}\``);
  } else {
    // Generate clean smart examples from usage
    if (isSlash) {
      if (subcommands.length > 0) {
        for (const sub of subcommands.slice(0, 3)) {
          const sampleArgs = (sub.options || []).map((o) => (o.required ? `<${o.name}>` : "")).filter(Boolean).join(" ");
          examplesList.push(`• \`/${cmd.name} ${sub.name}${sampleArgs ? " " + sampleArgs : ""}\``);
        }
      } else {
        const sampleArgs = regularOptions.map((o) => (o.required ? `<${o.name}>` : "")).filter(Boolean).join(" ");
        examplesList.push(`• \`/${cmd.name}${sampleArgs ? " " + sampleArgs : ""}\``);
      }
    } else {
      examplesList.push(`• \`${currentPrefix}${cmd.name}\``);
    }
  }

  // Aliases
  const aliasesStr = cmd.aliases?.length > 0 ? cmd.aliases.map((a) => `\`${a}\``).join(", ") : "None";

  // Category & Authority
  const catKey = (cmd.category || "General").toLowerCase();
  const catInfo = CATEGORY_META[catKey] || { name: cmd.category || "General", emoji: "🔹" };
  const authority = getFriendlyPermission(cmd);

  let desc = `### ${EMOJIS.get("announcement") || "📖"} Command Detail: \`${cmd.name}\` ${typeBadge}\n\n`;
  desc += `**Description:** ${cmd.description}\n`;
  desc += `**Category:** ${catInfo.emoji} ${catInfo.name}\n`;
  desc += `**Permissions:** \`${authority}\`\n`;
  desc += `**Aliases:** ${aliasesStr}\n\n`;

  desc += `**Slash Usage:**\n${slashUsageList.join("\n")}\n\n`;
  desc += `**Prefix Usage:**\n${prefixUsageList.join("\n")}\n\n`;

  if (optionsDetails.length > 0) {
    desc += `${optionsDetails.join("\n")}\n\n`;
  }

  desc += `**Examples:**\n${examplesList.join("\n")}`;

  return makeEmbed({
    title: "Help Center • Command Overview",
    description: desc,
    level: "INFO",
    footer: `Requested by ${user.tag || user.username}`,
  });
}

const slashBuilder = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Show bot command directory, usage rules, and detailed syntax.")
  .addStringOption((opt) =>
    opt
      .setName("command")
      .setDescription("Specific command name to inspect syntax, options, and examples")
      .setRequired(false)
      .setAutocomplete(true)
  );

export default createCommand({
  name: "help",
  description: "Show bot command directory, usage rules, and detailed syntax.",
  category: "Utility",
  aliases: ["h", "commands"],
  usage: "[command]",
  examples: ["/help", "/help command:lock", "dvhelp ban"],
  slashBuilder,

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    const client = interaction.client;

    let choices = [];
    for (const cmd of client.commands.values()) {
      if (
        cmd.name.toLowerCase().includes(focusedValue) ||
        (cmd.aliases && cmd.aliases.some((a) => a.toLowerCase().includes(focusedValue)))
      ) {
        choices.push({ name: cmd.name, value: cmd.name });
      }
    }

    choices = choices.sort((a, b) => a.name.localeCompare(b.name)).slice(0, 25);
    await interaction.respond(choices).catch(() => {});
  },

  async execute(ctx) {
    const { client, guild, channel, user, member, interaction } = ctx;

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

      const embed = buildCommandHelpEmbed(cmd, currentPrefix, user);
      return await ctx.reply({
        embeds: [embed],
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

      const rawCat = (cmd.category || "Utility").toLowerCase();
      const meta = CATEGORY_META[rawCat] || { name: cmd.category || "Utility", emoji: "🔹", description: "General commands." };
      const catName = meta.name;

      if (!categoriesMap.has(catName)) {
        categoriesMap.set(catName, []);
      }
      categoriesMap.get(catName).push(cmd);
    }

    const categoriesList = Array.from(categoriesMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    if (categoriesList.length === 0) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "No Commands Available",
            description: "No commands are currently available in this channel.",
            level: "WARNING",
          }),
        ],
        ephemeral: true,
      });
    }

    // Build the Dropdown Options
    const options = categoriesList.map(([catName, cmds]) => {
      const catKey = catName.toLowerCase();
      const meta = CATEGORY_META[catKey] || { emoji: "🔹", description: `Explore ${catName} commands.` };

      return {
        label: catName,
        value: catName,
        emoji: meta.emoji,
        description: `${meta.description.slice(0, 75)} (${cmds.length} cmds)`,
      };
    });

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("help_category_select")
      .setPlaceholder("📂 Select a category to inspect commands...")
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

    const totalCmds = Array.from(client.commands.values()).length;
    const slashOnlyCount = Array.from(client.commands.values()).filter((c) => c.slashOnly).length;
    const hybridCount = totalCmds - slashOnlyCount;

    const desc =
      `### ${EMOJIS.get("animated_ping") || "✨"} Welcome to the Command Directory\n` +
      `Select a module from the dropdown menu below to view available commands.\n\n` +
      `**Directory Overview:**\n` +
      `• Total Commands: **${totalCmds}**\n` +
      `• Slash Only: **${slashOnlyCount}** (Strict permission & audit lock)\n` +
      `• Slash & Prefix: **${hybridCount}** (Configured prefix: \`${currentPrefix}\`)\n\n` +
      `💡 **Quick Tip:** Use \`/help <command>\` or \`${currentPrefix}help <command>\` for detailed syntax, subcommands, and examples.`;

    const mainEmbed = makeEmbed({
      title: "Digital Vigital • Command Directory",
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
        const categoryCmds = (categoriesMap.get(catName) || []).sort((a, b) => a.name.localeCompare(b.name));

        const catKey = catName.toLowerCase();
        const meta = CATEGORY_META[catKey] || { emoji: "🔹", description: "" };
        const arrow = EMOJIS.get("arrow_point") || "➡️";

        let catDesc = `### ${meta.emoji} ${catName} Module\n`;
        if (meta.description) catDesc += `${meta.description}\n\n`;

        for (const cmd of categoryCmds) {
          const typeBadge = getCommandTypeBadge(cmd);
          const isSlash = !cmd.prefixOnly;
          const isPrefix = !cmd.slashOnly;
          const name = cmd.name;

          let cmdString = "";
          if (isSlash && !isPrefix) {
            cmdString = `/${name}`;
          } else if (isSlash && isPrefix) {
            cmdString = `/${name}  or  ${currentPrefix}${name}`;
          } else {
            cmdString = `${currentPrefix}${name}`;
          }

          const aliases = cmd.aliases?.length > 0 ? ` *(Aliases: ${cmd.aliases.join(", ")})*` : "";

          catDesc +=
            `${arrow} **\`${cmdString}\`** ${typeBadge}${aliases}\n` +
            `> ${cmd.description}\n\n`;
        }

        catDesc += `\n*Tip: Run \`/help <command>\` or \`${currentPrefix}help <command>\` to view subcommands, argument requirements, and usage examples.*`;

        const catEmbed = makeEmbed({
          title: `Digital Vigital • ${catName} Commands`,
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

      // Timeout: Disable interactive components
      selectMenu.setDisabled(true);
      homeButton.setDisabled(true);
      closeButton.setDisabled(true);

      if (responseMsg && responseMsg.edit) {
        await responseMsg
          .edit({
            components: [
              new ActionRowBuilder().addComponents(selectMenu),
              new ActionRowBuilder().addComponents(homeButton, closeButton),
            ],
          })
          .catch(() => {});
      } else if (ctx.isInteraction) {
        await interaction
          .editReply({
            components: [
              new ActionRowBuilder().addComponents(selectMenu),
              new ActionRowBuilder().addComponents(homeButton, closeButton),
            ],
          })
          .catch(() => {});
      }
    });
  },
});
