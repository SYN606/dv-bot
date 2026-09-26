import { AutoRoleRewardConfig, MemberAnalytics, RoleRestriction } from "../db/models/index.js";
import { Op } from "../db/models/drizzleAdapter.js";
import { makeEmbed } from "../core/embeds.js";
import { logger } from "../utils/logger.js";
import { checkDangerousPermissions } from "../handlers/supporterHandler.js"; // Needs to be exported or redefined

async function getBlacklistedUsers(guild, blacklistRoleIds) {
  const blacklistedUsers = new Set();
  for (const roleId of blacklistRoleIds) {
    const role = guild.roles.cache.get(roleId);
    if (role) {
      role.members.forEach(member => blacklistedUsers.add(member.id));
    }
  }
  return blacklistedUsers;
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
      const blacklistRoleIds = blacklists.map(b => b.role_id);
      const blacklistedUsers = await getBlacklistedUsers(guild, blacklistRoleIds);

      // Fetch Members Analytics
      const allMembers = await MemberAnalytics.findAll({
        where: { guild_id: guild.id }
      });

      // Filter out blacklisted and bots
      const validMembers = allMembers.filter(m => {
        const discordMember = guild.members.cache.get(m.user_id);
        if (!discordMember || discordMember.user.bot) return false;
        if (blacklistedUsers.has(m.user_id)) return false;
        return true;
      });

      // Sort for Chat
      const topChatters = [...validMembers]
        .sort((a, b) => b.weekly_messages - a.weekly_messages)
        .slice(0, 3);
        
      // Sort for VC
      const topVC = [...validMembers]
        .sort((a, b) => b.weekly_vc_seconds - a.weekly_vc_seconds)
        .slice(0, 3);

      const chatRoles = [config.top_chat_role_1, config.top_chat_role_2, config.top_chat_role_3];
      const vcRoles = [config.top_vc_role_1, config.top_vc_role_2, config.top_vc_role_3];

      // Remove previous roles from everyone
      const allRolesToRemove = [...chatRoles, ...vcRoles].filter(Boolean);
      for (const roleId of allRolesToRemove) {
        const role = guild.roles.cache.get(roleId);
        if (!role) continue;
        for (const member of role.members.values()) {
          await member.roles.remove(role, "Weekly Auto-Role Reset").catch(() => {});
        }
      }

      // Assign new roles
      const formatMention = (user) => user ? `<@${user.user_id}>` : "None";

      for (let i = 0; i < 3; i++) {
        if (topChatters[i] && chatRoles[i]) {
          const member = guild.members.cache.get(topChatters[i].user_id);
          const role = guild.roles.cache.get(chatRoles[i]);
          if (member && role && role.position < guild.members.me.roles.highest.position) {
            await member.roles.add(role, "Weekly Top Chatter").catch(() => {});
          }
        }
        
        if (topVC[i] && vcRoles[i]) {
          const member = guild.members.cache.get(topVC[i].user_id);
          const role = guild.roles.cache.get(vcRoles[i]);
          if (member && role && role.position < guild.members.me.roles.highest.position) {
            await member.roles.add(role, "Weekly Top VC").catch(() => {});
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

      // Reset the weekly stats for this guild
      const db = require("../db/index.js").getDb(); // Hack for drizzle raw update if needed
      // Actually we can just update all records using Sequelize DrizzleAdapter
      for (const m of allMembers) {
        if (m.weekly_messages > 0 || m.weekly_vc_seconds > 0) {
          m.weekly_messages = 0;
          m.weekly_vc_seconds = 0;
          await m.save();
        }
      }
      
    } catch (err) {
      logger.error(`[AutoRoleService] Error processing guild ${guild.id}: ${err.message}`);
    }
  }

  logger.info("[AutoRoleService] Weekly leaderboard processing complete.");
}
