import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { CONFIG } from "../../config.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { getRestrictedCommands } from "../../db/helpers/channelCommandRestrict.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("help")
  .setDescription("View bot commands and usage instructions")
  .addStringOption((opt) => opt.setName("command").setDescription("Specific command to inspect").setRequired(false));

export default createCommand({
  name: "help",
  description: "View bot commands and usage instructions",
  category: "Utility",
  slashBuilder,

  async execute(ctx) {
    const { client, guild, channel, member } = ctx;
    const query = ctx.options.command || ctx.options.primary;

    // A. Specific Command Details
    if (query) {
      const cmdName = query.toLowerCase().replace(/^\//, "");
      const resolvedName = client.aliases.get(cmdName) || cmdName;
      const cmd = client.commands.get(resolvedName);

      if (!cmd) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Command Not Found",
              description: `${EMOJIS.get("fail") || "❌"} No command found matching \`${query}\`.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      const desc =
        `**Description:** ${cmd.description}\n` +
        `**Category:** ${cmd.category}\n` +
        `**Aliases:** ${cmd.aliases.length > 0 ? cmd.aliases.map((a) => `\`${a}\``).join(", ") : "*None*"}\n` +
        `**Authority:** ${cmd.adminOnly ? "`Bot Admin`" : cmd.configOnly ? "`Manage Server`" : cmd.modOnly ? "`Moderator`" : "`Everyone`"}`;

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: `Help • /${cmd.name}`,
            description: desc,
            level: "INFO",
          }),
        ],
      });
    }

    // B. Full Directory Overview
    let restrictedSet = new Set();
    const isAdmin = member?.permissions?.has(PermissionFlagsBits.Administrator);
    if (guild && channel && !isAdmin) {
      const restricted = await getRestrictedCommands(guild.id, channel.id);
      restrictedSet = new Set(restricted.map((c) => c.toLowerCase()));
    }

    const categories = new Map();
    for (const cmd of client.commands.values()) {
      if (restrictedSet.has(cmd.name.toLowerCase())) continue;

      const cat = cmd.category || "Utility";
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat).push(cmd.name);
    }

    const prefix = CONFIG.PREFIX || "ts";
    const botName = CONFIG.BOT_NAME || client.user?.username || "Digital Vigil";

    const embed = makeEmbed({
      title: `${botName} • Commands Directory`,
      description:
        `${EMOJIS.get("announcement") || "📌"} Use \`${prefix}help [command]\` or \`/help [command]\` for details.\n\n` +
        `*Slash commands (\`/\`) and prefix commands (\`${prefix}\`) are both supported.*`,
      level: "INFO",
      footer: `Total Available Commands: ${[...categories.values()].flat().length}`,
    });

    for (const [cat, cmds] of categories.entries()) {
      const formatted = cmds.sort().map((c) => `\`${c}\``).join(" ");
      embed.addFields({
        name: `**${cat} (${cmds.length})**`,
        value: formatted || "*No commands*",
        inline: false,
      });
    }

    return await ctx.reply({ embeds: [embed] });
  },
});
