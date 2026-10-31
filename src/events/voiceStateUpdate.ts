import { VCRoleConfig } from "../db/models/index.js";
import { ANALYTICS_BATCHER } from "../handlers/analyticsBatcher.js";
import { checkMemberSupporter } from "../handlers/supporterHandler.js";
import { logger } from "../utils/logger.js";
import { sendModLog } from "../utils/modLog.js";

export const activeVoiceSessions = new Map<string, any>(); // `${guildId}:${userId}` -> { startTime, channelId }
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours max session duration

// Periodic sweeper for orphaned/disconnected sessions
const voiceCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, session] of activeVoiceSessions.entries()) {
    const start = typeof session === "object" ? session.startTime : session;
    if (now - start > SESSION_TTL_MS) {
      activeVoiceSessions.delete(key);
    }
  }
}, 60 * 60 * 1000);
if (voiceCleanupInterval.unref) voiceCleanupInterval.unref();

/**
 * Hydrate active voice sessions across all guilds upon bot startup/restart.
 */
export function hydrateVoiceSessions(client) {
  let count = 0;
  for (const guild of client.guilds.cache.values()) {
    const afkChannelId = guild.afkChannelId;
    for (const [channelId, channel] of guild.channels.cache) {
      if (channel.isVoiceBased() && channelId !== afkChannelId) {
        for (const [memberId, member] of channel.members) {
          if (!member.user?.bot && !member.voice.selfDeaf && !member.voice.serverDeaf) {
            activeVoiceSessions.set(`${guild.id}:${member.id}`, {
              startTime: Date.now(),
              channelId,
            });
            count++;
          }
        }
      }
    }
  }
  if (count > 0) {
    logger.info(`[ANALYTICS] Hydrated ${count} active voice session(s) on startup.`);
  }
}

function isEligibleForVoiceAnalytics(state) {
  if (!state?.channelId || !state.member || state.member.user?.bot) return false;
  // Ignore server's AFK channel
  if (state.guild?.afkChannelId === state.channelId) return false;
  // Anti-exploit: do not credit deafened users (farming prevention)
  if (state.selfDeaf || state.serverDeaf) return false;
  return true;
}

export default {
  name: "voiceStateUpdate",
  async execute(client, oldState, newState) {
    const guild = newState.guild || oldState.guild;
    const member = newState.member || oldState.member;
    if (!guild || !member || member.user.bot) return;

    const guildId = guild.id;
    const userId = member.id;
    const sessionKey = `${guildId}:${userId}`;

    // Supporter Rewards Check (Passive evaluation)
    checkMemberSupporter(member).catch(() => {});

    // 1. VC Role Management
    try {
      const vcConfig = await VCRoleConfig.findByPk(guildId);
      if (vcConfig && vcConfig.role_id) {
        const roleId = String(vcConfig.role_id);
        const joinedChannel = !oldState.channelId && newState.channelId;
        const leftChannel = oldState.channelId && !newState.channelId;

        if (joinedChannel) {
          if (!member.roles.cache.has(roleId)) {
            await member.roles.add(roleId).catch(() => {});
          }
        } else if (leftChannel) {
          if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId).catch(() => {});
          }
        }
      }
    } catch {}

    // 2. Voice Analytics Tracking with Anti-Exploit Deafen & AFK Guard
    const wasEligible = isEligibleForVoiceAnalytics(oldState);
    const isNowEligible = isEligibleForVoiceAnalytics(newState);
    const channelChanged = oldState.channelId !== newState.channelId;

    const existingSession = activeVoiceSessions.get(sessionKey);
    const sessionStartTime = existingSession
      ? (typeof existingSession === "object" ? existingSession.startTime : existingSession)
      : null;
    const recordedChannelId = existingSession?.channelId || oldState.channelId;

    // A. Transition out of eligible state or channel switch: credit elapsed voice time
    if (sessionStartTime && (!isNowEligible || channelChanged)) {
      const elapsedSeconds = Math.floor((Date.now() - sessionStartTime) / 1000);
      activeVoiceSessions.delete(sessionKey);

      if (elapsedSeconds > 5 && recordedChannelId) {
        ANALYTICS_BATCHER.addVoice(guildId, userId, recordedChannelId, elapsedSeconds).catch(() => {});
      }
    }

    // B. Transition into eligible state or channel switch: start a new session timer
    if (isNowEligible && (!sessionStartTime || channelChanged || !wasEligible)) {
      activeVoiceSessions.set(sessionKey, {
        startTime: Date.now(),
        channelId: newState.channelId,
      });
    }

    // 3. Mod Log: Voice Events Dispatch
    try {
      if (!oldState.channelId && newState.channelId) {
        // Voice Join
        sendModLog({
          guild,
          category: "VOICE",
          eventType: "voice_joined",
          title: "Member Joined Voice Channel",
          level: "SUCCESS",
          target: member.user,
          description: `<@${member.id}> connected to <#${newState.channelId}>.`,
          extraFields: {
            Channel: `<#${newState.channelId}>`,
          },
        }).catch(() => {});
      } else if (oldState.channelId && !newState.channelId) {
        // Voice Leave
        const durationStr = sessionStartTime
          ? `${Math.max(1, Math.floor((Date.now() - sessionStartTime) / 60000))} minute(s)`
          : "*Recent session*";

        sendModLog({
          guild,
          category: "VOICE",
          eventType: "voice_left",
          title: "Member Left Voice Channel",
          level: "INFO",
          target: member.user,
          description: `<@${member.id}> disconnected from <#${oldState.channelId}>.`,
          extraFields: {
            Channel: `<#${oldState.channelId}>`,
            "Session Duration": durationStr,
          },
        }).catch(() => {});
      } else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
        // Voice Move
        sendModLog({
          guild,
          category: "VOICE",
          eventType: "voice_moved",
          title: "Member Moved Voice Channel",
          level: "INFO",
          target: member.user,
          description: `<@${member.id}> moved from <#${oldState.channelId}> to <#${newState.channelId}>.`,
          extraFields: {
            "From Channel": `<#${oldState.channelId}>`,
            "To Channel": `<#${newState.channelId}>`,
          },
        }).catch(() => {});
      }
    } catch (_) {}
  },
};
