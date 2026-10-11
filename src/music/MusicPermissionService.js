import { PermissionFlagsBits } from "discord.js";
import { isBotAdmin } from "../core/permissions.js";
import { getMusicSettings } from "../db/helpers/music.js";

export class MusicPermissionService {
  /**
   * Evaluates if a member has permission to control music playback
   * @param {GuildMember} member
   * @param {GuildPlayer} player
   * @param {string} action - 'play' | 'control' | 'volume' | 'filter' | 'admin'
   * @returns {Promise<{ allowed: boolean, reason?: string, isDj?: boolean, isVoteSkip?: boolean }>}
   */
  static async checkPermission(member, player = null, action = "control") {
    if (!member || !member.guild) {
      return { allowed: false, reason: "You must be in a Discord server to use music commands." };
    }

    const guild = member.guild;
    const settings = await getMusicSettings(guild.id);

    // 1. Is Music Enabled in this Guild?
    if (!settings.enabled) {
      return {
        allowed: false,
        reason: "Music playback is currently disabled on this server by administrators.",
      };
    }

    // 2. Is Command Locked to a Specific Text Channel?
    // Handled in Command check or here if channel passed
    // 3. User Voice Channel Verification
    const memberVoiceChannel = member.voice?.channel;
    if (!memberVoiceChannel) {
      return {
        allowed: false,
        reason: "You must be connected to a voice channel to use music commands.",
      };
    }

    // 4. Same Voice Channel Check with Active Player
    if (player && player.voiceChannelId) {
      if (memberVoiceChannel.id !== player.voiceChannelId) {
        return {
          allowed: false,
          reason: `You must be in the same voice channel (<#${player.voiceChannelId}>) as the bot to control music.`,
        };
      }
    }

    // 5. Check if Member is Bot Admin or Guild Owner
    const isOwner = guild.ownerId === member.id;
    const hasAdminPerm = member.permissions.has(PermissionFlagsBits.Administrator);
    const isBotAdminUser = await isBotAdmin(member);

    if (isOwner || hasAdminPerm || isBotAdminUser) {
      return { allowed: true, isDj: true, isAdmin: true };
    }

    // 6. Check DJ Role
    const hasDjRole = settings.dj_role_id
      ? member.roles.cache.has(settings.dj_role_id)
      : false;

    if (hasDjRole) {
      return { allowed: true, isDj: true };
    }

    // 7. Check if Member is Alone with the Bot in Voice
    if (player && player.voiceChannelId) {
      const channel = guild.channels.cache.get(player.voiceChannelId);
      if (channel && channel.members) {
        const humanListeners = channel.members.filter((m) => !m.user.bot);
        if (humanListeners.size <= 1) {
          // Sole listener gets automatic control
          return { allowed: true, isDj: false, isSoleListener: true };
        }
      }
    }

    // 8. If DJ Only mode is active and user is not DJ
    if (settings.dj_only) {
      return {
        allowed: false,
        reason: "Only members with the configured DJ role can control music on this server.",
      };
    }

    // 9. Play action is generally open to all listeners unless DJ-only
    if (action === "play") {
      return { allowed: true, isDj: false };
    }

    // 10. Vote Skip handling for 'skip' action
    if (action === "skip" && settings.vote_skip) {
      return { allowed: true, isDj: false, isVoteSkip: true };
    }

    // For standard control (pause, resume, loop, shuffle), allow if same voice channel
    return { allowed: true, isDj: false };
  }

  /**
   * Checks if user has permission to change guild music settings
   */
  static async checkAdminPermission(member) {
    if (!member || !member.guild) return false;
    const guild = member.guild;
    if (guild.ownerId === member.id) return true;
    if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    return isBotAdmin(member);
  }
}
