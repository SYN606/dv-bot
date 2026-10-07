import { ActivityType } from "discord.js";
import { getSupporterConfig } from "../db/helpers/supporter.js";
import { PERMISSION_RISKS } from "../utils/permissionsData.js";

// LRU Cache for anti-spam (Key: 'guildId:userId', Value: timestamp of last announcement)
const announcementCooldowns = new Map();
const COOLDOWN_SECONDS = 3600; // 1 hour cooldown per user per guild

// User Clan details cache to eliminate repetitive REST /users/{id} API calls
const userClanCache = new Map(); // userId -> { primary: object, timestamp: number }
const CLAN_CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache TTL

// Member evaluation cooldown to avoid repeatedly evaluating the same user on high-frequency chat
const memberEvalCooldowns = new Map(); // `${guildId}:${userId}` -> timestamp
const MEMBER_EVAL_COOLDOWN = 180 * 1000; // 3 minutes cooldown

function checkDangerousPermissions(role) {
  for (const key of Object.keys(PERMISSION_RISKS)) {
    const permData = PERMISSION_RISKS[key];
    if (role.permissions.has(permData.flag)) {
      return true; // Has dangerous permission
    }
  }
  return false;
}

function formatMessage(template, member, role = null) {
  let result = template || "Thank you {user.mention} for supporting us!";
  result = result.replace(/\{user\.mention\}/gi, `<@${member.id}>`);
  result = result.replace(/\{user\.name\}/gi, member.user?.username || member.displayName || "User");
  result = result.replace(/\{server\.name\}/gi, member.guild?.name || "Server");
  if (role) {
    result = result.replace(/\{role\.name\}/gi, role.name || "Role");
    result = result.replace(/\{role\.mention\}/gi, role.name || "Role");
    result = result.replace(/\{role\}/gi, role.name || "Role");
  } else {
    result = result.replace(/\{role\.name\}/gi, "");
    result = result.replace(/\{role\.mention\}/gi, "");
    result = result.replace(/\{role\}/gi, "");
  }
  return result;
}

export async function checkGuildTag(member) {
  if (!member || member.user?.bot || !member.guild) return false;
  const guild = member.guild;

  try {
    const config = await getSupporterConfig(guild.id);
    if (!config || !config.enabled || !config.clan_role_id || !config.clan_tag) return false;

    const clanTag = config.clan_tag.toLowerCase();
    const role = guild.roles.cache.get(config.clan_role_id);
    if (!role) return false;

    const botMember = guild.members.me;
    if (!botMember || role.position >= botMember.roles.highest.position) return false;
    if (checkDangerousPermissions(role)) return false;

    // Check directly from cached member.user first without hitting Discord REST API
    let primary = member.user?.clan || member.user?.primaryGuild || member.user?.primary_guild || null;
    
    // Fallback to cached user clan lookup before ever calling REST API
    if (!primary) {
      const cached = userClanCache.get(member.id);
      const now = Date.now();
      if (cached && (now - cached.timestamp < CLAN_CACHE_TTL)) {
        primary = cached.primary;
      } else if (member.client?.users?.fetch) {
        // Fetch only if uncached and store with 30-min TTL
        const user = await member.client.users.fetch(member.id, { force: false }).catch(() => null);
        primary = user?.clan || user?.primaryGuild || user?.primary_guild || null;
        userClanCache.set(member.id, { primary, timestamp: now });

        if (userClanCache.size > 10000) {
          const cutoff = now - CLAN_CACHE_TTL;
          for (const [k, v] of userClanCache.entries()) {
            if (v.timestamp < cutoff) userClanCache.delete(k);
          }
        }
      }
    }

    let hasTag = false;
    if (primary && (primary.identityGuildId === guild.id || primary.id === guild.id || primary.guildId === guild.id)) {
      if (primary.identityEnabled !== false) {
        hasTag = true;
      }
    }

    // Also check member displayName or username for clan tag
    if (!hasTag) {
      const displayName = member.displayName || member.user?.username || "";
      if (displayName.toLowerCase().includes(clanTag)) {
        hasTag = true;
      }
    }

    const hasRole = member.roles.cache.has(role.id);

    if ((hasTag && hasRole) || (!hasTag && !hasRole)) {
      return false;
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
          
          if (announcementCooldowns.size > 5000) {
            const cutoff = now - COOLDOWN_SECONDS;
            for (const [k, v] of announcementCooldowns.entries()) {
              if (v < cutoff) announcementCooldowns.delete(k);
            }
          }
          
          const msg = formatMessage(config.clan_message, member, role);
          await channel.send({
            content: msg,
            allowedMentions: { parse: ["users"], roles: [] }
          }).catch(() => {});
        }
      }
      return true;
    } else if (!hasTag && hasRole) {
      await member.roles.remove(role, "User no longer has guild tag").catch(() => {});
      return true;
    }

  } catch (error) {
    console.error(`[SupporterHandler] Error checking Clan Tag for ${member.user?.tag || member.id}:`, error.message);
  }
  return false;
}

export async function checkMemberVanity(member, presence = null) {
  if (!member || member.user?.bot || !member.guild) return false;
  const guild = member.guild;

  try {
    const config = await getSupporterConfig(guild.id);
    if (!config || !config.enabled || !config.vanity_role_id || !config.vanity_text) return false;

    const vanityCode = config.vanity_text.toLowerCase();
    const role = guild.roles.cache.get(config.vanity_role_id);
    if (!role) return false;

    const botMember = guild.members.me;
    if (!botMember || role.position >= botMember.roles.highest.position) return false;
    if (checkDangerousPermissions(role)) return false;

    const hasRole = member.roles.cache.has(role.id);
    const activePresence = presence || member.presence;

    if (!activePresence) return false;

    const activities = activePresence.activities || [];
    let hasVanityUrl = false;

    for (const activity of activities) {
      if (activity.type === ActivityType.Custom && activity.state) {
        if (activity.state.toLowerCase().includes(vanityCode)) {
          hasVanityUrl = true;
          break;
        }
      }
    }

    const isOffline = activePresence.status === "offline" || activePresence.status === "invisible";
    
    // Ignore offline transitions unless they explicitly removed the vanity while online
    if (isOffline && hasRole) return false;
    if ((hasVanityUrl && hasRole) || (!hasVanityUrl && !hasRole && !isOffline)) return false;

    if (hasVanityUrl && !hasRole) {
      await member.roles.add(role, "Vanity added to status").catch(() => {});
      
      const cdKey = `${guild.id}:${member.id}:vanity`;
      const now = Date.now() / 1000;
      const lastAnnounce = announcementCooldowns.get(cdKey) || 0;

      if (config.vanity_channel_id && (now - lastAnnounce) > COOLDOWN_SECONDS) {
        const channel = guild.channels.cache.get(config.vanity_channel_id);
        if (channel && channel.isTextBased()) {
          announcementCooldowns.set(cdKey, now);
          
          if (announcementCooldowns.size > 5000) {
            const cutoff = now - COOLDOWN_SECONDS;
            for (const [k, v] of announcementCooldowns.entries()) {
              if (v < cutoff) announcementCooldowns.delete(k);
            }
          }
          
          const msg = formatMessage(config.vanity_message, member, role);
          await channel.send({
            content: msg,
            allowedMentions: { parse: ["users"], roles: [] }
          }).catch(() => {});
        }
      }
      return true;
    } else if (!hasVanityUrl && hasRole && !isOffline) {
      await member.roles.remove(role, "Vanity removed from status").catch(() => {});
      return true;
    }

  } catch (error) {
    console.error(`[SupporterHandler] Error checking Vanity for ${member.user?.tag || member.id}:`, error.message);
  }
  return false;
}

export async function checkVanityStatus(oldPresence, newPresence) {
  if (!newPresence?.member || !newPresence.guild) return;
  await checkMemberVanity(newPresence.member, newPresence);
}

export async function checkMemberSupporter(member, force = false) {
  if (!member || member.user?.bot || !member.guild) return;

  if (!force) {
    const evalKey = `${member.guild.id}:${member.id}`;
    const now = Date.now();
    const lastEval = memberEvalCooldowns.get(evalKey) || 0;
    if (now - lastEval < MEMBER_EVAL_COOLDOWN) {
      return; // Skip already checked member to prevent spam
    }
    memberEvalCooldowns.set(evalKey, now);

    if (memberEvalCooldowns.size > 10000) {
      const cutoff = now - MEMBER_EVAL_COOLDOWN;
      for (const [k, v] of memberEvalCooldowns.entries()) {
        if (v < cutoff) memberEvalCooldowns.delete(k);
      }
    }
  }

  await Promise.allSettled([
    checkMemberVanity(member),
    checkGuildTag(member),
  ]);
}

export async function syncAllSupporters(client) {
  for (const guild of client.guilds.cache.values()) {
    try {
      const config = await getSupporterConfig(guild.id);
      if (!config || !config.enabled) continue;
      if (!config.vanity_role_id && !config.clan_role_id) continue;

      const members = Array.from(guild.members.cache.values());
      for (const member of members) {
        if (!member || member.user?.bot) continue;

        const evalKey = `${guild.id}:${member.id}`;
        const lastEval = memberEvalCooldowns.get(evalKey) || 0;
        if (Date.now() - lastEval < MEMBER_EVAL_COOLDOWN) continue;

        let roleChanged = false;
        if (config.vanity_role_id) {
          const changed = await checkMemberVanity(member).catch(() => false);
          if (changed) roleChanged = true;
        }
        if (config.clan_role_id) {
          const changed = await checkGuildTag(member).catch(() => false);
          if (changed) roleChanged = true;
        }

        memberEvalCooldowns.set(evalKey, Date.now());

        // Pacing: If a role modification occurred, sleep 350ms to strictly comply with Discord rate limits
        if (roleChanged) {
          await new Promise((r) => setTimeout(r, 350));
        } else {
          // Cooperative yield to keep event loop free
          await new Promise((r) => setTimeout(r, 20));
        }
      }
    } catch (err) {
      console.error(`[SupporterHandler] Error syncing guild ${guild.id}:`, err?.message);
    }
  }
}

export class SupporterWorker {
  constructor(client, intervalMs = 120000) {
    this.client = client;
    this.intervalMs = intervalMs;
    this.timer = null;
    this.isProcessing = false;
  }

  start() {
    if (!this.timer) {
      this.timer = setInterval(() => this.check(), this.intervalMs);
      setTimeout(() => this.check(), 8000);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async check() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    try {
      await syncAllSupporters(this.client);
    } catch (err) {
      console.error("[SupporterWorker] Sync error:", err);
    } finally {
      this.isProcessing = false;
    }
  }
}
