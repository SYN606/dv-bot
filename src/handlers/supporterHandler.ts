import { ActivityType, PermissionFlagsBits } from "discord.js";
import { getSupporterConfig } from "../db/helpers/supporter.js";
import { SystemMeta } from "../db/models/index.js";

// LRU Cache for anti-spam (Key: 'guildId:userId', Value: timestamp of last announcement)
const announcementCooldowns = new Map<string, number>();
const COOLDOWN_SECONDS = 3600; // 1 hour cooldown per user per guild

// In-memory cache for fast announcement message lookups: `${type}:${guildId}:${userId}` -> { channelId, messageId }
const supporterAnnouncementCache = new Map<string, any>();

export async function saveSupporterAnnouncement(guildId, userId, type, channelId, messageId) {
  const cacheKey = `${type}:${guildId}:${userId}`;
  supporterAnnouncementCache.set(cacheKey, { channelId, messageId });

  try {
    const metaKey = `supporter_${type}_msg:${guildId}:${userId}`;
    await SystemMeta.upsert({
      key: metaKey,
      value: JSON.stringify({ channelId, messageId, savedAt: Date.now() }),
    });
  } catch (err) {
    console.error(`[SupporterHandler] Failed to save announcement meta for ${cacheKey}:`, err?.message);
  }
}

export async function deleteSupporterAnnouncement(guild, userId, type = "clan", fallbackChannelId = null) {
  if (!guild || !userId) return;

  const cacheKey = `${type}:${guild.id}:${userId}`;
  const metaKey = `supporter_${type}_msg:${guild.id}:${userId}`;
  let channelId = fallbackChannelId;
  let messageId = null;

  // 1. Check in-memory cache
  if (supporterAnnouncementCache.has(cacheKey)) {
    const cached = supporterAnnouncementCache.get(cacheKey);
    channelId = cached.channelId || channelId;
    messageId = cached.messageId;
    supporterAnnouncementCache.delete(cacheKey);
  }

  // 2. Check persistent DB storage
  try {
    const metaRecord = await SystemMeta.findByPk(metaKey);
    if (metaRecord?.value) {
      const parsed = JSON.parse(metaRecord.value);
      if (parsed.messageId) messageId = parsed.messageId;
      if (parsed.channelId) channelId = parsed.channelId;
    }
    await SystemMeta.destroy({ where: { key: metaKey } });
  } catch (_) {}

  if (!channelId) return;

  const channel = guild.channels.cache.get(channelId) || (await guild.channels.fetch(channelId).catch(() => null));
  if (!channel || !channel.isTextBased()) return;

  // 3. Direct fetch and deletion by message ID
  if (messageId) {
    const msg = await channel.messages.fetch(messageId).catch(() => null);
    if (msg) {
      if (msg.deletable) {
        await msg.delete().catch(() => {});
      }
      return;
    }
  }

  // 4. Fallback search: scan recent messages sent by this bot mentioning the user
  try {
    const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
    if (recent) {
      const botMsg = recent.find(
        (m) =>
          m.author?.id === guild.client.user?.id &&
          (m.content.includes(`<@${userId}>`) || m.content.includes(`<@!${userId}>`))
      );
      if (botMsg && botMsg.deletable) {
        await botMsg.delete().catch(() => {});
      }
    }
  } catch (_) {}
}

// User Clan details cache to eliminate repetitive REST /users/{id} API calls
const userClanCache = new Map<string, any>(); // userId -> { primary: object, timestamp: number }
const CLAN_CACHE_TTL = 30 * 60 * 1000; // 30 minutes cache TTL
let clanRestBackoffUntil = 0; // Cooldown for /users/:id to avoid Discord 429 rate limits

export function clearUserClanCache(userId = null) {
  if (userId) {
    userClanCache.delete(String(userId));
  } else {
    userClanCache.clear();
  }
}

// Member evaluation cooldown to avoid repeatedly evaluating the same user on high-frequency chat
const memberEvalCooldowns = new Map<string, number>(); // `${guildId}:${userId}` -> timestamp
const MEMBER_EVAL_COOLDOWN = 180 * 1000; // 3 minutes cooldown

const RESTRICTED_PERMISSIONS = [
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.MentionEveryone,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageWebhooks,
  PermissionFlagsBits.ManageEvents,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.ManageGuildExpressions,
].filter(Boolean);

function checkDangerousPermissions(role) {
  if (!role?.permissions) return true;
  return RESTRICTED_PERMISSIONS.some((p) => role.permissions.has(p));
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

export async function checkGuildTag(member, force = false, allowRestFetch = true) {
  if (!member || member.user?.bot || !member.guild) return false;
  const guild = member.guild;

  try {
    const config = await getSupporterConfig(guild.id);
    if (!config || !config.enabled || !config.clan_role_id) return false;

    const role = guild.roles.cache.get(config.clan_role_id);
    if (!role) return false;

    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
    if (!botMember || role.position >= botMember.roles.highest.position) return false;
    if (checkDangerousPermissions(role)) return false;

    // Fetch user or retrieve from cache to access clan/primaryGuild payload
    let user = member.user;
    let primary = user?.primaryGuild || user?.primary_guild || user?.clan || null;

    if (!primary || force) {
      const now = Date.now();
      const cached = userClanCache.get(member.id);
      if (!force && cached && (now - cached.timestamp < CLAN_CACHE_TTL)) {
        primary = cached.primary;
      } else if (allowRestFetch && member.client?.users?.fetch && now > clanRestBackoffUntil) {
        try {
          const fetched = await member.client.users.fetch(member.id, { force: Boolean(force) }).catch((err) => {
            if (err?.status === 429 || String(err?.message || '').includes('429')) {
              clanRestBackoffUntil = Date.now() + 35000;
            }
            return null;
          });
          if (fetched) {
            user = fetched;
            primary = fetched.primaryGuild || fetched.primary_guild || fetched.clan || null;
          }
        } catch (_) {}

        // Cache result (even if null or failed) to prevent hammering REST /users/:id
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

    // 1. Direct Discord Server Tag (Clan) Identity check
    if (primary) {
      const identityGuildId = String(
        primary.identityGuildId ||
        primary.identity_guild_id ||
        primary.id ||
        primary.guildId ||
        primary.guild_id ||
        ""
      );

      const isIdentityEnabled = primary.identityEnabled !== false && primary.identity_enabled !== false;

      if (identityGuildId === String(guild.id) && isIdentityEnabled) {
        hasTag = true;
      }

      // Also match if primary clan's tag equals the configured clan_tag (e.g. tag badge text)
      const configuredTag = (config.clan_tag || "").trim().toLowerCase();
      if (!hasTag && configuredTag && primary.tag) {
        if (String(primary.tag).toLowerCase() === configuredTag && isIdentityEnabled) {
          hasTag = true;
        }
      }
    }

    // 2. Fallback: check member displayName or username if a text clan_tag is configured
    const configuredTag = (config.clan_tag || "").trim().toLowerCase();
    if (!hasTag && configuredTag && configuredTag.length >= 2) {
      const displayName = (member.displayName || member.user?.username || "").toLowerCase();
      if (displayName.includes(configuredTag)) {
        hasTag = true;
      }
    }

    const hasRole = member.roles.cache.has(role.id);

    if ((hasTag && hasRole) || (!hasTag && !hasRole)) {
      return false;
    }

    if (hasTag && !hasRole) {
      await member.roles.add(role, "User equipped guild tag").catch((err) => {
        console.error(`[GuildTag] Failed to add role to ${member.user?.tag || member.id}:`, err?.message);
      });
      
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
          const sent = await channel.send({
            content: msg,
            allowedMentions: { parse: ["users"], roles: [] }
          }).catch(() => {});

          if (sent?.id) {
            await saveSupporterAnnouncement(guild.id, member.id, "clan", channel.id, sent.id);
          }
        }
      }
      return true;
    } else if (!hasTag && hasRole) {
      await member.roles.remove(role, "User no longer has guild tag").catch((err) => {
        console.error(`[GuildTag] Failed to remove role from ${member.user?.tag || member.id}:`, err?.message);
      });
      announcementCooldowns.delete(`${guild.id}:${member.id}:clan`);
      await deleteSupporterAnnouncement(guild, member.id, "clan", config.clan_channel_id);
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

    const botMember = guild.members.me || (await guild.members.fetchMe().catch(() => null));
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
          const sent = await channel.send({
            content: msg,
            allowedMentions: { parse: ["users"], roles: [] }
          }).catch(() => {});

          if (sent?.id) {
            await saveSupporterAnnouncement(guild.id, member.id, "vanity", channel.id, sent.id);
          }
        }
      }
      return true;
    } else if (!hasVanityUrl && hasRole && !isOffline) {
      await member.roles.remove(role, "Vanity removed from status").catch(() => {});
      announcementCooldowns.delete(`${guild.id}:${member.id}:vanity`);
      await deleteSupporterAnnouncement(guild, member.id, "vanity", config.vanity_channel_id);
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
    checkGuildTag(member, force),
  ]);
}

export async function syncAllSupporters(client) {
  for (const guild of client.guilds.cache.values()) {
    try {
      const config = await getSupporterConfig(guild.id);
      if (!config || !config.enabled) continue;
      if (!config.vanity_role_id && !config.clan_role_id) continue;

      const members: any[] = Array.from(guild.members.cache.values());
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
          // In bulk sync loop across all guild members, never execute REST user fetches
          const changed = await checkGuildTag(member, false, false).catch(() => false);
          if (changed) roleChanged = true;
        }

        memberEvalCooldowns.set(evalKey, Date.now());

        // Pacing: If a role modification occurred, sleep 350ms to strictly comply with Discord rate limits
        if (roleChanged) {
          await new Promise((r) => setTimeout(r, 350));
        } else {
          // Cooperative yield to keep event loop free
          await new Promise((r) => setImmediate(r));
        }
      }
    } catch (err) {
      console.error(`[SupporterHandler] Error syncing guild ${guild.id}:`, err?.message);
    }
  }
}

export class SupporterWorker {
  public client: any;
  public intervalMs: number;
  public timer: any;
  public isProcessing: boolean;
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
