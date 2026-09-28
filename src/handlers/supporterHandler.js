import { Events, PermissionFlagsBits, ActivityType } from "discord.js";
import { getSupporterConfig } from "../db/helpers/supporter.js";
import { PERMISSION_RISKS } from "../utils/permissionsData.js";
import { makeEmbed } from "../core/embeds.js";

// LRU Cache for anti-spam (Key: 'guildId:userId', Value: timestamp of last announcement)
const announcementCooldowns = new Map();
const COOLDOWN_SECONDS = 3600; // 1 hour cooldown per user per guild

function checkDangerousPermissions(role) {
  for (const key of Object.keys(PERMISSION_RISKS)) {
    const permData = PERMISSION_RISKS[key];
    if (role.permissions.has(permData.flag)) {
      return true; // Has dangerous permission
    }
  }
  return false;
}

function formatMessage(template, member) {
  let result = template || "Thank you {user.mention} for supporting us!";
  result = result.replace(/\{user\.mention\}/gi, `<@${member.id}>`);
  result = result.replace(/\{user\.name\}/gi, member.user.username);
  result = result.replace(/\{server\.name\}/gi, member.guild.name);
  return result;
}

export async function checkGuildTag(member) {
  if (!member || member.user.bot) return;
  const guild = member.guild;

  try {
    const config = await getSupporterConfig(guild.id);
    if (!config || !config.enabled || !config.clan_role_id) return;

    const role = guild.roles.cache.get(config.clan_role_id);
    if (!role) return;

    if (role.position >= guild.members.me.roles.highest.position) return;
    if (checkDangerousPermissions(role)) return;

    // Fetch user for Clan/Primary Guild details (requires force: true or presence intent)
    const user = await member.client.users.fetch(member.id, { force: false }).catch(() => null);
    if (!user) return;

    let hasTag = false;
    const primary = user.primaryGuild || user.primary_guild || user.clan || null;
    if (primary && (primary.identityGuildId === guild.id || primary.id === guild.id || primary.guildId === guild.id)) {
      if (primary.identityEnabled !== false) {
        hasTag = true;
      }
    }

    const hasRole = member.roles.cache.has(role.id);

    if ((hasTag && hasRole) || (!hasTag && !hasRole)) {
      return;
    }

    if (hasTag && !hasRole) {
      await member.roles.add(role, "User equipped guild tag").catch(() => {});
      
      const cdKey = `${guild.id}:${member.id}:clan`;
      const now = Date.now() / 1000;
      const lastAnnounce = announcementCooldowns.get(cdKey) || 0;

      if (config.clan_channel_id && (now - lastAnnounce) > COOLDOWN_SECONDS) {
        const channel = guild.channels.cache.get(config.clan_channel_id);
        if (channel && channel.isTextBased()) {
          announcementCooldowns.set(cdKey, now);
          const msg = formatMessage(config.clan_message, member);
          await channel.send({ content: msg }).catch(() => {});
        }
      }
    } else if (!hasTag && hasRole) {
      await member.roles.remove(role, "User no longer has guild tag").catch(() => {});
    }

  } catch (error) {
    console.error(`[SupporterHandler] Error checking Clan Tag for ${member.user.tag}:`, error.message);
  }
}

export async function checkVanityStatus(oldPresence, newPresence) {
  if (!newPresence?.member || !newPresence.guild) return;
  const member = newPresence.member;
  const guild = newPresence.guild;
  if (member.user.bot) return;

  try {
    const config = await getSupporterConfig(guild.id);
    if (!config || !config.enabled || !config.vanity_role_id || !config.vanity_text) return;

    const vanityCode = config.vanity_text.toLowerCase();
    const role = guild.roles.cache.get(config.vanity_role_id);
    if (!role) return;

    if (role.position >= guild.members.me.roles.highest.position) return;
    if (checkDangerousPermissions(role)) return;

    const hasRole = member.roles.cache.has(role.id);
    const activities = newPresence.activities || [];
    let hasVanityUrl = false;

    for (const activity of activities) {
      if (activity.type === ActivityType.Custom && activity.state) {
        if (activity.state.toLowerCase().includes(vanityCode)) {
          hasVanityUrl = true;
          break;
        }
      }
    }

    const isOffline = newPresence.status === 'offline' || newPresence.status === 'invisible';
    
    // Ignore offline transitions unless they explicitly removed the vanity while online
    if (isOffline && hasRole) return;
    if ((hasVanityUrl && hasRole) || (!hasVanityUrl && !hasRole && !isOffline)) return;

    if (hasVanityUrl && !hasRole) {
      await member.roles.add(role, "Vanity added to status").catch(() => {});
      
      const cdKey = `${guild.id}:${member.id}:vanity`;
      const now = Date.now() / 1000;
      const lastAnnounce = announcementCooldowns.get(cdKey) || 0;

      if (config.vanity_channel_id && (now - lastAnnounce) > COOLDOWN_SECONDS) {
        const channel = guild.channels.cache.get(config.vanity_channel_id);
        if (channel && channel.isTextBased()) {
          announcementCooldowns.set(cdKey, now);
          const msg = formatMessage(config.vanity_message, member);
          await channel.send({ content: msg }).catch(() => {});
        }
      }
    } else if (!hasVanityUrl && hasRole && !isOffline) {
      await member.roles.remove(role, "Vanity removed from status").catch(() => {});
    }

  } catch (error) {
    console.error(`[SupporterHandler] Error checking Vanity for ${member.user.tag}:`, error.message);
  }
}
