import { VCRoleConfig, MemberAnalytics } from "../db/models/index.js";
import { incrementVoiceTime } from "../db/helpers/analytics.js";

const activeVoiceSessions = new Map(); // `${guildId}:${userId}` -> timestamp

export default {
  name: "voiceStateUpdate",
  async execute(client, oldState, newState) {
    const guild = newState.guild || oldState.guild;
    const member = newState.member || oldState.member;
    if (!guild || !member || member.user.bot) return;

    const guildId = guild.id;
    const userId = member.id;
    const sessionKey = `${guildId}:${userId}`;

    // 1. VC Role Management
    try {
      const vcConfig = await VCRoleConfig.findByPk(guildId);
      if (vcConfig && vcConfig.role_id) {
        const roleId = String(vcConfig.role_id);
        const joinedChannel = !oldState.channelId && newState.channelId;
        const leftChannel = oldState.channelId && !newState.channelId;

        if (joinedChannel) {
          await member.roles.add(roleId).catch(() => {});
        } else if (leftChannel) {
          await member.roles.remove(roleId).catch(() => {});
        }
      }
    } catch {}

    // 2. Voice Analytics Tracking
    const joined = !oldState.channelId && newState.channelId;
    const left = oldState.channelId && !newState.channelId;

    if (joined) {
      activeVoiceSessions.set(sessionKey, Date.now());
    } else if (left) {
      const startTime = activeVoiceSessions.get(sessionKey);
      if (startTime) {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        activeVoiceSessions.delete(sessionKey);

        if (elapsedSeconds > 5) {
          await incrementVoiceTime(guildId, userId, elapsedSeconds).catch(() => {});
        }
      }
    }
  },
};
