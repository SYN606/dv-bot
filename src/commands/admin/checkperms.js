import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { analyzeMemberPermissions } from "../../utils/permissionsData.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("checkperms")
  .setDescription("Audit a member's assigned permissions")
  .addUserOption(opt => opt.setName("user").setDescription("The member to audit").setRequired(true));

export default createCommand({
  name: "checkperms",
  description: "Audit a member's assigned permissions.",
  category: "Admin",
  modOnly: true,
  slashOnly: true,
  slashBuilder,

  async execute(ctx) {
    const { guild } = ctx;
    if (!guild) return;

    const targetUserId = ctx.options.user?.id || ctx.options.user;
    if (!targetUserId) {
      return await ctx.reply("Please specify a user to audit.");
    }

    const member = await guild.members.fetch(targetUserId).catch(() => null);
    if (!member) {
      return await ctx.reply({ content: "Could not find that member in the server.", ephemeral: true });
    }

    const data = analyzeMemberPermissions(member);
    const successEmoji = EMOJIS.get("success") || "✅";
    const warnEmoji = EMOJIS.get("warning") || "⚠️";
    const redDot = EMOJIS.get("red_dot") || "🔴";
    const yellowDot = EMOJIS.get("warning") || "🟡";
    const greenDot = EMOJIS.get("green_dot") || "🟢";

    if (data.length === 0) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Clean Audit",
            description: `${successEmoji} **${member.user.tag}** has no flagged permissions.`,
            level: "SUCCESS"
          })
        ],
        ephemeral: true
      });
    }

    const embed = makeEmbed({
      title: `${warnEmoji} Audit: ${member.displayName}`,
      description: `Flagged **${data.length}** elevated permissions.`,
      level: "WARNING"
    });
    
    embed.setThumbnail(member.user.displayAvatarURL());
    embed.setFooter({ text: `User ID: ${member.id}` });

    const groups = { red: [], yellow: [], green: [] };
    
    for (const p of data) {
      const emoji = p.level === "red" ? redDot : (p.level === "yellow" ? yellowDot : greenDot);
      let rolesStr = p.roles.slice(0, 2).join(" • ");
      if (p.roles.length > 2) rolesStr += "...";
      
      groups[p.level].push(`${emoji} **${p.permission}**\n└ Sources: \`${rolesStr}\``);
    }

    for (const [level, lines] of Object.entries(groups)) {
      if (lines.length > 0) {
        const lvlEmoji = level === "red" ? redDot : (level === "yellow" ? yellowDot : greenDot);
        let val = lines.join("\n");
        if (val.length > 1024) val = val.substring(0, 1020) + "...";
        
        embed.addFields({
          name: `${lvlEmoji} ${level.toUpperCase()} RISK`,
          value: val,
          inline: false
        });
      }
    }

    return await ctx.reply({ embeds: [embed], ephemeral: true });
  }
});
