import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { analyzeMemberPermissions } from "../../utils/permissionsData.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("permscan")
  .setDescription("Scan server members for elevated permissions.");

export default createCommand({
  name: "permscan",
  description: "Scan server members for elevated permissions.",
  category: "Admin",
  modOnly: true,
  slashOnly: true,
  slashBuilder,

  async execute(ctx) {
    const { guild } = ctx;
    if (!guild) return;

    await ctx.defer({ ephemeral: true });

    await guild.members.fetch();

    const results = [];
    
    for (const member of guild.members.cache.values()) {
      if (member.user.bot) continue;
      
      const data = analyzeMemberPermissions(member);
      if (data.length > 0) {
        const redCount = data.filter(d => d.level === "red").length;
        const yellowCount = data.filter(d => d.level === "yellow").length;
        
        results.push({
          red: redCount,
          yellow: yellowCount,
          name: member.displayName,
          id: member.id,
          tag: member.user.tag,
        });
      }
    }

    results.sort((a, b) => {
      if (a.red !== b.red) return b.red - a.red;
      return b.yellow - a.yellow;
    });

    if (results.length === 0) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Server Scan",
            description: "No members found with elevated permissions.",
            level: "SUCCESS"
          })
        ]
      });
    }

    const maxPerPage = 15;
    const totalPages = Math.ceil(results.length / maxPerPage);
    let currentPage = 0;

    const generateEmbed = (page) => {
      const start = page * maxPerPage;
      const end = start + maxPerPage;
      const sliced = results.slice(start, end);
      
      let description = "";
      for (const res of sliced) {
        description += `**${res.name}** (\`${res.id}\`)\n`;
        description += `└ 🔴 ${res.red} High Risk | 🟡 ${res.yellow} Medium Risk\n\n`;
      }

      return makeEmbed({
        title: "🛡️ Server Permissions Scan",
        description,
        level: "INFO",
        footer: `Page ${page + 1} of ${totalPages} • ${results.length} total users flagged`
      });
    };

    if (totalPages === 1) {
      return await ctx.reply({ embeds: [generateEmbed(0)] });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prev_page").setLabel("Previous").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("next_page").setLabel("Next").setStyle(ButtonStyle.Primary)
    );

    const message = await ctx.reply({ embeds: [generateEmbed(0)], components: [row], fetchReply: true });

    const collector = message.createMessageComponentCollector({ time: 60000 });
    
    collector.on("collect", async (i) => {
      if (i.user.id !== ctx.user.id) {
        return i.reply({ content: "You cannot use these buttons.", ephemeral: true });
      }
      
      if (i.customId === "prev_page") {
        currentPage = Math.max(0, currentPage - 1);
      } else if (i.customId === "next_page") {
        currentPage = Math.min(totalPages - 1, currentPage + 1);
      }
      
      await i.update({ embeds: [generateEmbed(currentPage)], components: [row] });
    });
    
    collector.on("end", () => {
      row.components.forEach(c => c.setDisabled(true));
      ctx.editReply({ components: [row] }).catch(() => {});
    });
  }
});
