import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import { EMOJIS } from "../../core/emojis.js";
import { analyzeMemberPermissions, PERMISSION_RISKS } from "../../utils/permissionsData.js";
import { isBotAdmin } from "../../core/permissions.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("permscan")
  .setDescription("Run a security audit on a member or the entire server.")
  .addSubcommand((sub) =>
    sub
      .setName("member")
      .setDescription("Audit a specific member's permissions.")
      .addUserOption((opt) => opt.setName("user").setDescription("The member to scan").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("server")
      .setDescription("Run a quick security audit on the entire server.")
  );

export default createCommand({
  name: "permscan",
  description: "Run a security audit on a member or the entire server.",
  category: "Moderation",
  aliases: ["audit", "paudit"],
  modOnly: true,
  slashBuilder,

  async execute(ctx) {
    const { guild, member, interaction, message } = ctx;
    if (!guild) return;

    const hasPerms = 
        member.id === guild.ownerId || 
        member.permissions.has(PermissionFlagsBits.Administrator) ||
        member.permissions.has(PermissionFlagsBits.ManageGuild);

    if (!hasPerms && !(await isBotAdmin(ctx))) {
      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: "Permission Denied",
            description: `${EMOJIS.get("fail") || "❌"} You need Administrator or Manage Server to run security audits.`,
            level: "ERROR",
          }),
        ],
        ephemeral: true,
      });
    }

    await guild.members.fetch().catch(() => {});

    // For prefix commands, deduce subcommand
    let subcommand = "member";
    if (interaction) {
      subcommand = interaction.options.getSubcommand();
    } else {
      const arg = ctx.options._args?.[0]?.toLowerCase();
      if (arg === "server" || arg === "guild") {
        subcommand = "server";
      } else {
        subcommand = "member";
      }
    }

    if (subcommand === "member") {
      let targetUserId = ctx.options.user || ctx.options._args?.[subcommand === "member" && ctx.options._args[0] !== "member" ? 0 : 1]?.replace(/[<@!>]/g, "");
      
      if (!targetUserId && message?.reference?.messageId) {
        const referenced = await ctx.channel.messages.fetch(message.reference.messageId).catch(() => null);
        if (referenced?.author) {
          targetUserId = referenced.author.id;
        }
      }

      if (!targetUserId) {
         return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "User Not Found",
              description: `${EMOJIS.get("fail") || "❌"} Provide a valid user to scan.\nUsage: \`/permscan member @user\``,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      const targetMember = await guild.members.fetch(targetUserId).catch(() => null);
      if (!targetMember) {
        return await ctx.reply({
          embeds: [
            makeEmbed({
              title: "User Not Found",
              description: `${EMOJIS.get("fail") || "❌"} Member not found in this server.`,
              level: "ERROR",
            }),
          ],
          ephemeral: true,
        });
      }

      const data = analyzeMemberPermissions(targetMember);
      const redCount = data.filter((d) => d.level === "red").length;
      const yellowCount = data.filter((d) => d.level === "yellow").length;
      const greenCount = data.filter((d) => d.level === "green").length;
      
      const threatScore = (redCount * 10) + (yellowCount * 5) + (greenCount * 1);
      
      let threatLevel = "Low";
      let levelColor = "SUCCESS";
      let emojiStr = "🟢";

      if (threatScore >= 20 || redCount > 0) {
        threatLevel = "Critical";
        levelColor = "ERROR";
        emojiStr = "🔴";
      } else if (threatScore >= 10 || yellowCount >= 2) {
        threatLevel = "High";
        levelColor = "WARN";
        emojiStr = "🟠";
      } else if (threatScore >= 5 || yellowCount > 0) {
        threatLevel = "Moderate";
        levelColor = "WARN";
        emojiStr = "🟡";
      }

      let description = `**Threat Score:** \`${threatScore}\`\n**Risk Level:** ${emojiStr} **${threatLevel}**\n\n`;
      
      if (data.length === 0) {
        description += "✅ This member has no dangerous permissions.";
      } else {
        const redPerms = data.filter((d) => d.level === "red");
        const yellowPerms = data.filter((d) => d.level === "yellow");
        
        if (redPerms.length > 0) {
          description += `**🔴 Critical Permissions:**\n` + redPerms.map(p => `• ${p.permission} \`[${p.roles.length} roles]\``).join("\n") + "\n\n";
        }
        if (yellowPerms.length > 0) {
          description += `**🟡 Elevated Permissions:**\n` + yellowPerms.map(p => `• ${p.permission} \`[${p.roles.length} roles]\``).join("\n") + "\n\n";
        }
      }

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: `Security Scan: ${targetMember.user.username}`,
            description: description.trim(),
            level: levelColor,
            footer: "Run /permscan server for a server-wide audit",
          }).setThumbnail(targetMember.user.displayAvatarURL()),
        ],
      });
    }

    if (subcommand === "server") {
      let criticalUsers = 0;
      let highUsers = 0;
      let adminRoles = 0;

      for (const role of guild.roles.cache.values()) {
        if (role.permissions.has(PermissionFlagsBits.Administrator)) {
          adminRoles++;
        }
      }

      const topThreats = [];
      for (const m of guild.members.cache.values()) {
        if (m.id === guild.ownerId) continue;
        if (m.user.bot) continue;

        const data = analyzeMemberPermissions(m);
        const redCount = data.filter((d) => d.level === "red").length;
        const yellowCount = data.filter((d) => d.level === "yellow").length;
        const score = (redCount * 10) + (yellowCount * 5);

        if (score >= 20 || redCount > 0) criticalUsers++;
        else if (score >= 10 || yellowCount >= 2) highUsers++;

        if (score > 0) {
          topThreats.push({ user: m.user.username, score, redCount });
        }
      }

      topThreats.sort((a, b) => b.score - a.score);
      const topList = topThreats.slice(0, 5);

      let description = `**Server Health:** ${criticalUsers === 0 ? "🟢 Safe" : "🔴 At Risk"}\n\n`;
      description += `**Critical Members (Non-Bot):** \`${criticalUsers}\`\n`;
      description += `**High Risk Members (Non-Bot):** \`${highUsers}\`\n`;
      description += `**Roles with Administrator:** \`${adminRoles}\`\n\n`;

      if (topList.length > 0) {
        description += `**Top Threats:**\n`;
        description += topList.map((t, i) => `${i+1}. **${t.user}** - Score: \`${t.score}\``).join("\n");
      } else {
        description += `*No highly elevated members found.*`;
      }

      return await ctx.reply({
        embeds: [
          makeEmbed({
            title: `Server Security Audit`,
            description,
            level: criticalUsers > 0 ? "ERROR" : "SUCCESS",
            footer: "For more details, view the web dashboard.",
          }),
        ],
      });
    }
  },
});
