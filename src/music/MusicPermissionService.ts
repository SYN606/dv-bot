import { PermissionFlagsBits, type GuildMember } from "discord.js";
import { isBotAdmin } from "../core/permissions.js";
import { getMusicSettings } from "../db/helpers/music.js";

export interface IMusicPermissionResult {
  allowed: boolean;
  reason?: string;
  isDj?: boolean;
  isAdmin?: boolean;
  isSoleListener?: boolean;
  isVoteSkip?: boolean;
}

export class MusicPermissionService {
  /**
   * Evaluates if a member has permission to control music playback
   */
  static async checkPermission(
    member: GuildMember | any,
    player: any = null,
    action: string = "control"
  ): Promise<IMusicPermissionResult> {
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

    // 2. User Voice Channel Verification
    const memberVoiceChannel = member.voice?.channel;
    if (!memberVoiceChannel) {
      return {
        allowed: false,
        reason: "You must be connected to a voice channel to use music commands.",
      };
    }

    // 3. Same Voice Channel Check with Active Player
    if (player && player.voiceChannelId) {
      if (memberVoiceChannel.id !== player.voiceChannelId) {
        return {
          allowed: false,
          reason: `You must be in the same voice channel (<#${player.voiceChannelId}>) as the bot to control music.`,
        };
      }
    }

    // 4. Check if Member is Bot Admin or Guild Owner
    const isOwner = guild.ownerId === member.id;
    const hasAdminPerm = member.permissions ? member.permissions.has(PermissionFlagsBits.Administrator) : false;
    const isBotAdminUser = await isBotAdmin(member);

    if (isOwner || hasAdminPerm || isBotAdminUser) {
      return { allowed: true, isDj: true, isAdmin: true };
    }

    // 5. Check DJ Role
    const hasDjRole = settings.dj_role_id
      ? member.roles?.cache?.has(settings.dj_role_id)
      : false;

    if (hasDjRole) {
      return { allowed: true, isDj: true };
    }

    // 6. If DJ-Only mode is active, strictly require DJ role or Admin
    if (settings.dj_only) {
      const roleMention = settings.dj_role_id ? `<@&${settings.dj_role_id}>` : "the DJ";
      return {
        allowed: false,
        reason: `DJ-Only Mode is active. Only members with ${roleMention} role (or Server Administrators) can control music on this server.`,
      };
    }

    // 7. Check if Member is Alone with the Bot in Voice (Sole listener gets automatic control in non-DJ-only mode)
    if (player && player.voiceChannelId) {
      const channel = guild.channels?.cache?.get(player.voiceChannelId);
      if (channel && channel.members) {
        const humanListeners = channel.members.filter((m: any) => !m.user?.bot);
        if (humanListeners.size <= 1) {
          return { allowed: true, isDj: false, isSoleListener: true };
        }
      }
    }

    // 8. Play action is generally open to all listeners unless DJ-only
    if (action === "play") {
      return { allowed: true, isDj: false };
    }

    // 9. Vote Skip handling for 'skip' action
    if (action === "skip" && settings.vote_skip) {
      return { allowed: true, isDj: false, isVoteSkip: true };
    }

    // For standard control (pause, resume, loop, shuffle), allow if same voice channel
    return { allowed: true, isDj: false };
  }

  /**
   * Checks if user has permission to change guild music settings
   */
  static async checkAdminPermission(member: GuildMember | any): Promise<boolean> {
    if (!member || !member.guild) return false;
    const guild = member.guild;
    if (guild.ownerId === member.id) return true;
    if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
    return isBotAdmin(member);
  }
}
