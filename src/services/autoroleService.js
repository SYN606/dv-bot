import { AutoRoleRewardConfig, MemberAnalytics, RoleRestriction } from "../db/models/index.js";
import { makeEmbed } from "../core/embeds.js";
import { logger } from "../utils/logger.js";

async function getGuildMember(guild, userId) {
  if (!guild || !userId) return null;
  let member = guild.members.cache.get(String(userId));
  if (!member) {
    member = await guild.members.fetch(String(userId)).catch(() => null);
  }
  return member;
}

export async function processWeeklyAutoRoles(client) {
  logger.info("[AutoRoleService] Starting weekly leaderboard processing...");

  const configs = await AutoRoleRewardConfig.findAll();

  for (const config of configs) {
    if (!config.enabled || !config.announcement_channel_id) continue;
    
    const guild = client.guilds.cache.get(config.guild_id);
    if (!guild) continue;

    try {
      const channel = guild.channels.cache.get(config.announcement_channel_id);
      if (!channel || !channel.isTextBased()) continue;

      // Get Blacklist Role IDs
      const blacklists = await RoleRestriction.findAll({
        where: {
          guild_id: guild.id,
          feature: "AUTO_ROLE",
          restriction_type: "DENY",
        }
      });
      const blacklistRoleIds = new Set(blacklists.map(b => String(b.role_id)));

      // Helper to check if a Discord GuildMember has any excluded role
      const hasExcludedRole = (discordMember) => {
        if (!discordMember || discordMember.user?.bot) return true;
        return discordMember.roles.cache.some(r => blacklistRoleIds.has(String(r.id)));
      };

      // Fetch Members Analytics
      const allMembers = await MemberAnalytics.findAll({
        where: { guild_id: guild.id }
      });

      // Filter and pick Top 3 valid chatters (skipping bots and any with excluded roles)
      const topChatters = [];
      const sortedByChat = [...allMembers].sort((a, b) => (b.weekly_messages || 0) - (a.weekly_messages || 0));
      for (const m of sortedByChat) {
        if ((m.weekly_messages || 0) <= 0) break;
        const discordMember = await getGuildMember(guild, m.user_id);
        if (!discordMember || discordMember.user?.bot) continue;
        if (hasExcludedRole(discordMember)) continue;
        topChatters.push(m);
        if (topChatters.length >= 3) break;
      }

      // Filter and pick Top 3 valid VC members (skipping bots and any with excluded roles)
      const topVC = [];
      const sortedByVC = [...allMembers].sort((a, b) => (b.weekly_vc_seconds || 0) - (a.weekly_vc_seconds || 0));
      for (const m of sortedByVC) {
        if ((m.weekly_vc_seconds || 0) <= 0) break;
        const discordMember = await getGuildMember(guild, m.user_id);
        if (!discordMember || discordMember.user?.bot) continue;
        if (hasExcludedRole(discordMember)) continue;
        topVC.push(m);
        if (topVC.length >= 3) break;
      }

      const chatRoles = [config.top_chat_role_1, config.top_chat_role_2, config.top_chat_role_3];
      const vcRoles = [config.top_vc_role_1, config.top_vc_role_2, config.top_vc_role_3];

      // Remove previous reward roles from everyone who currently holds them
      const allRolesToRemove = [...chatRoles, ...vcRoles].filter(Boolean);
      for (const roleId of allRolesToRemove) {
        const role = guild.roles.cache.get(roleId);
        if (!role) continue;
        for (const member of role.members.values()) {
          await member.roles.remove(role, "Weekly Auto-Role Reset").catch(() => {});
          await new Promise(r => setTimeout(r, 400)); // Delay to prevent 429
        }
      }

      // Assign new reward roles
      const formatMention = (user) => user ? `<@${user.user_id}>` : "None";
      const botHighestPos = guild.members.me?.roles?.highest?.position ?? 0;

      for (let i = 0; i < 3; i++) {
        if (topChatters[i] && chatRoles[i]) {
          const member = await getGuildMember(guild, topChatters[i].user_id);
          const role = guild.roles.cache.get(chatRoles[i]);
          if (member && role && role.position < botHighestPos) {
            await member.roles.add(role, "Weekly Top Chatter").catch(() => {});
            await new Promise(r => setTimeout(r, 350));
          }
        }
        
        if (topVC[i] && vcRoles[i]) {
          const member = await getGuildMember(guild, topVC[i].user_id);
          const role = guild.roles.cache.get(vcRoles[i]);
          if (member && role && role.position < botHighestPos) {
            await member.roles.add(role, "Weekly Top VC").catch(() => {});
            await new Promise(r => setTimeout(r, 350));
          }
        }
      }

      // Send Announcement
      const embed = makeEmbed({
        title: "🏆 Weekly Activity Leaderboard 🏆",
        description: "Here are the top most active members for this week! Reward roles have been assigned automatically.",
        level: "SUCCESS",
        use_emoji: true
      });

      embed.addFields(
        {
          name: "💬 Top Chatters",
          value: `🥇 1st: ${formatMention(topChatters[0])}\n🥈 2nd: ${formatMention(topChatters[1])}\n🥉 3rd: ${formatMention(topChatters[2])}`,
          inline: true
        },
        {
          name: "🎙️ Top Voice Members",
          value: `🥇 1st: ${formatMention(topVC[0])}\n🥈 2nd: ${formatMention(topVC[1])}\n🥉 3rd: ${formatMention(topVC[2])}`,
          inline: true
        }
      );

      await channel.send({ embeds: [embed] }).catch(() => {});

      // Atomically reset weekly stats for this guild
      await MemberAnalytics.update(
        { weekly_messages: 0, weekly_vc_seconds: 0 },
        { where: { guild_id: guild.id } }
      ).catch(() => {});
      
    } catch (err) {
      logger.error(`[AutoRoleService] Error processing guild ${guild.id}: ${err.message}`);
    }
  }

  logger.info("[AutoRoleService] Weekly leaderboard processing complete.");
}
