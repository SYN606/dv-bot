import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { analyzeMemberPermissions } from "../../utils/permissionsData.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("permscan")
  .setDescription("Scan permissions of the server or a specific member.")
  .addSubcommand(sub =>
    sub
      .setName("server")
      .setDescription("Scan all server members for elevated permissions.")
  )
  .addSubcommand(sub =>
    sub
      .setName("member")
      .setDescription("Scan a specific member for elevated permissions.")
      .addUserOption(opt =>
        opt
          .setName("target")
          .setDescription("The user to scan")
          .setRequired(true)
      )
  );

export default createCommand({
  name: "permscan",
  description: "Scan permissions of the server or a specific member.",
  category: "Admin",
  modOnly: true,
  slashOnly: true,
  slashBuilder,

  async execute(ctx) {
    const { guild, interaction } = ctx;
    if (!guild) return;

    await ctx.defer({ ephemeral: true });
    
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "member") {
      const targetUser = interaction.options.getUser("target");
      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      
      if (!member) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "Error",
              description: "Member not found in this server.",
              level: "ERROR"
            })
          ]
        });
      }
      
      const data = analyzeMemberPermissions(member);
      
      if (data.length === 0) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: `Permissions: ${member.user.username}`,
              description: "🟢 This user is safe. They have no dangerous permissions.",
              level: "SUCCESS"
            })
          ]
        });
      }
      
      const redCount = data.filter(d => d.level === "red").length;
      const yellowCount = data.filter(d => d.level === "yellow").length;
      const greenCount = data.filter(d => d.level === "green").length;
      
      const threatScore = (redCount * 10) + (yellowCount * 5) + (greenCount * 1);
      
      let threatLevel = "Low";
      if (threatScore >= 20 || redCount > 0) threatLevel = "Critical";
      else if (threatScore >= 10 || yellowCount >= 2) threatLevel = "High";
      else if (threatScore >= 5 || yellowCount > 0) threatLevel = "Moderate";
      
      let description = `**Threat Level:** ${threatLevel}\n**Threat Score:** ${threatScore}\n\n`;
      
      const reds = data.filter(d => d.level === "red");
      if (reds.length > 0) {
        description += `**🔴 Red Risk (${reds.length}):**\n` + reds.map(r => `• ${r.permission} (from ${r.roles.join(', ')})`).join('\n') + `\n\n`;
      }
      
      const yellows = data.filter(d => d.level === "yellow");
      if (yellows.length > 0) {
        description += `**🟡 Medium Risk (${yellows.length}):**\n` + yellows.map(r => `• ${r.permission} (from ${r.roles.join(', ')})`).join('\n') + `\n\n`;
      }
      
      const greens = data.filter(d => d.level === "green");
      if (greens.length > 0) {
        description += `**🟢 Low Risk (${greens.length}):**\n` + greens.map(r => `• ${r.permission} (from ${r.roles.join(', ')})`).join('\n') + `\n\n`;
      }

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: `Permissions: ${member.user.username}`,
            description,
            level: threatLevel === "Critical" ? "ERROR" : threatLevel === "High" ? "WARNING" : "INFO"
          })
        ]
      });
    }

    if (subcommand === "server") {
      await guild.members.fetch();

      const results = [];
      
      for (const member of guild.members.cache.values()) {
        const data = analyzeMemberPermissions(member);
        if (data.length > 0) {
          const redCount = data.filter(d => d.level === "red").length;
          const yellowCount = data.filter(d => d.level === "yellow").length;
          const greenCount = data.filter(d => d.level === "green").length;
          
          const threatScore = (redCount * 10) + (yellowCount * 5) + (greenCount * 1);
          
          let threatLevel = "Low";
          if (threatScore >= 20 || redCount > 0) threatLevel = "Critical";
          else if (threatScore >= 10 || yellowCount >= 2) threatLevel = "High";
          else if (threatScore >= 5 || yellowCount > 0) threatLevel = "Moderate";
          
          results.push({
            red: redCount,
            yellow: yellowCount,
            score: threatScore,
            level: threatLevel,
            name: member.displayName,
            id: member.id,
            tag: member.user.tag,
          });
        }
      }

      results.sort((a, b) => b.score - a.score);

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

      const maxPerPage = 10;
      const totalPages = Math.ceil(results.length / maxPerPage);
      let currentPage = 0;

      const generateEmbed = (page) => {
        const start = page * maxPerPage;
        const end = start + maxPerPage;
        const sliced = results.slice(start, end);
        
        let description = "";
        for (const res of sliced) {
          description += `**${res.name}** (\`${res.id}\`)\n`;
          description += `└ ${res.level} Risk (Score: ${res.score}) | 🔴 ${res.red} | 🟡 ${res.yellow}\n\n`;
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
  }
});
