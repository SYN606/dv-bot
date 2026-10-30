import { WelcomeConfig, VerificationConfig } from "../db/models/index.js";
import { buildWelcomePayload } from "../utils/welcomeFormatter.js";
import { logger } from "../utils/logger.js";

// Bounded in-memory cache to prevent duplicate welcome dispatches to the same member
const welcomedMembers = new Map<string, number>();

// Clean up stale entries every 15 minutes (TTL: 1 hour)
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of welcomedMembers.entries()) {
    if (now - timestamp > 60 * 60 * 1000) {
      welcomedMembers.delete(key);
    }
  }
}, 15 * 60 * 1000);
if (sweeper.unref) sweeper.unref();

export function clearMemberWelcomeCache(guildId: string, userId: string): void {
  welcomedMembers.delete(`${guildId}:${userId}`);
}

export type WelcomeTriggerEvent = "join" | "onboarding" | "verification";

/**
 * High-performance Welcome & Onboarding Dispatcher.
 * Respects configured trigger timing ("join", "onboarding", "verification")
 * and prevents double-welcoming.
 */
export async function dispatchWelcomeOnTrigger({
  guild,
  member,
  trigger,
}: {
  guild: any;
  member: any;
  trigger: WelcomeTriggerEvent;
}): Promise<boolean> {
  if (!guild || !member) return false;

  const guildId = String(guild.id);
  const userId = String(member.id);
  const lockKey = `${guildId}:${userId}`;
  const isBot = Boolean(member.user?.bot);

  try {
    const welcomeCfg = await WelcomeConfig.findByPk(guildId);
    if (!welcomeCfg) return false;

    const configuredTrigger = (welcomeCfg.welcome_trigger || "join").toLowerCase();

    // 1. Evaluate Trigger Match
    if (configuredTrigger === "verification") {
      // Bots cannot undergo verification; allow bot autorole on join
      if (isBot) {
        if (trigger !== "join") return false;
      } else {
        if (trigger === "join") {
          // Check if server verification is actually active
          const vConfig = await VerificationConfig.findByPk(guildId);
          if (vConfig && vConfig.enabled) {
            // Server verification is active; wait for verification event
            return false;
          }
          // Fallback: If verification is disabled, check if member is pending onboarding
          if (member.pending) return false;
        } else if (trigger === "onboarding") {
          // Onboarding completed, but verification is the gatekeeper
          const vConfig = await VerificationConfig.findByPk(guildId);
          if (vConfig && vConfig.enabled) return false;
        } else if (trigger !== "verification") {
          return false;
        }
      }
    } else if (configuredTrigger === "onboarding") {
      if (trigger === "join") {
        // If member has not completed Discord onboarding or screening yet, defer!
        if (member.pending) {
          return false;
        }
      } else if (trigger === "verification") {
        return false;
      }
    } else {
      // Default: "join" trigger
      if (trigger !== "join") {
        return false;
      }
    }

    // 2. Prevent Duplicate Welcomes
    if (welcomedMembers.has(lockKey)) {
      return false;
    }
    welcomedMembers.set(lockKey, Date.now());

    const botMember = guild.members?.me;

    // 3. Auto-Roles: Assign Human Join Roles
    if (welcomeCfg.autorole_enabled && !isBot) {
      let roleIds: string[] = [];
      try {
        roleIds = typeof welcomeCfg.join_role_ids === "string"
          ? JSON.parse(welcomeCfg.join_role_ids || "[]")
          : (welcomeCfg.join_role_ids || []);
      } catch (_) {
        roleIds = [];
      }

      if (Array.isArray(roleIds) && roleIds.length > 0 && botMember) {
        const rolesToAdd: any[] = [];
        for (const rId of roleIds) {
          const r = guild.roles.cache.get(String(rId));
          if (r && r.position < botMember.roles.highest.position) {
            const hasRole = member.roles?.cache ? member.roles.cache.has(r.id) : false;
            if (!hasRole) {
              rolesToAdd.push(r);
            }
          }
        }
        if (rolesToAdd.length > 0) {
          await member.roles.add(rolesToAdd, `Welcome Gatekeeper: assigned join auto-roles (Trigger: ${trigger})`).catch((err: any) => {
            logger.warn(`[WELCOME AUTOROLE WARNING]: Failed to assign roles in guild ${guildId}:`, err.message);
          });
        }
      }
    }

    // 4. Public Channel Welcome Message Dispatch
    if (welcomeCfg.welcome_enabled && welcomeCfg.welcome_channel_id) {
      let welcomeChannel = guild.channels.cache.get(String(welcomeCfg.welcome_channel_id));
      if (!welcomeChannel && guild.channels?.fetch) {
        welcomeChannel = await guild.channels.fetch(String(welcomeCfg.welcome_channel_id)).catch(() => null);
      }

      if (welcomeChannel && typeof welcomeChannel.send === "function") {
        const payload = buildWelcomePayload(welcomeCfg, member, "welcome");
        if (payload) {
          const sentMsg = await welcomeChannel.send(payload).catch((err: any) => {
            logger.error(`[WELCOME CHANNEL SEND ERROR]: Guild ${guildId}:`, err.message);
            return null;
          });

          // Auto-delete timer if configured
          if (sentMsg && welcomeCfg.welcome_delete_seconds > 0) {
            setTimeout(() => {
              sentMsg.delete().catch(() => {});
            }, Number(welcomeCfg.welcome_delete_seconds) * 1000);
          }
        }
      }
    }

    // 5. Direct Message (DM) Onboarding Dispatch
    if (welcomeCfg.dm_enabled && !isBot) {
      const dmPayload = buildWelcomePayload(welcomeCfg, member, "dm");
      if (dmPayload && (dmPayload.content || dmPayload.embeds?.length > 0)) {
        await member.send(dmPayload).catch(() => {
          // Direct messages are often blocked by user privacy settings; silently catch
        });
      }
    }

    return true;
  } catch (err: any) {
    logger.error(`[WELCOME DISPATCH ERROR]: Guild ${guildId}:`, err.message);
    return false;
  }
}
