import {
  type Guild,
  type GuildMember,
  type User,
  PermissionFlagsBits,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import {
  getAntinukeSettings,
  getAntinukeTrustees,
  recordAntinukeIncident,
  updateAntinukeSettings,
  type IAntinukeSettings,
} from "../db/helpers/antinuke.js";
import { TOPOLOGY_MIRROR, type IChannelSnapshot, type IRoleSnapshot } from "./topologyMirror.js";
import { makeEmbed, COLORS } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";
import { logger } from "../utils/logger.js";
import { CONFIG } from "../config.js";

export const ThreatType = {
  CHANNEL_DELETE: "CHANNEL_DELETE_NUKE",
  CHANNEL_CREATE: "CHANNEL_CREATE_NUKE",
  ROLE_DELETE: "ROLE_DELETE_NUKE",
  ROLE_CREATE: "ROLE_CREATE_NUKE",
  MEMBER_BAN: "MEMBER_BAN_NUKE",
  MEMBER_KICK: "MEMBER_KICK_NUKE",
  WEBHOOK_CREATE: "WEBHOOK_NUKE",
  BOT_ADD: "ROGUE_BOT_ADD",
  DANGEROUS_PERMS: "DANGEROUS_PERMS_ESCALATION",
  SERVER_TAMPER: "SERVER_TAMPER",
  VANITY_CHANGE: "SERVER_TAMPER",
} as const;

export type ThreatTypeValue = (typeof ThreatType)[keyof typeof ThreatType];

export function formatThreatName(threatType: string): string {
  switch (threatType) {
    case ThreatType.BOT_ADD:
      return "Unauthorized Bot Added";
    case ThreatType.CHANNEL_DELETE:
      return "Mass Channel Deletion";
    case ThreatType.CHANNEL_CREATE:
      return "Mass Channel Creation";
    case ThreatType.ROLE_DELETE:
      return "Mass Role Deletion";
    case ThreatType.ROLE_CREATE:
      return "Mass Role Creation";
    case ThreatType.MEMBER_BAN:
      return "Mass Member Ban";
    case ThreatType.MEMBER_KICK:
      return "Mass Member Kick";
    case ThreatType.WEBHOOK_CREATE:
      return "Mass Webhook Spam";
    case ThreatType.DANGEROUS_PERMS:
      return "Dangerous Role Permission Grant";
    case ThreatType.SERVER_TAMPER:
      return "Server Identity Tampering";
    default:
      return threatType.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

export function formatThreatDescription(threatType: string): string {
  switch (threatType) {
    case ThreatType.BOT_ADD:
      return "An unauthorized bot was invited to the server and immediately banned.";
    case ThreatType.CHANNEL_DELETE:
      return "Multiple channels were rapidly deleted, exceeding server safety limits.";
    case ThreatType.CHANNEL_CREATE:
      return "Multiple channels were rapidly created, exceeding server anti-spam limits.";
    case ThreatType.ROLE_DELETE:
      return "Multiple server roles were rapidly deleted in a short timeframe.";
    case ThreatType.ROLE_CREATE:
      return "Excessive server roles were created rapidly, triggering spam defense limits.";
    case ThreatType.MEMBER_BAN:
      return "Multiple members were banned rapidly in a short period.";
    case ThreatType.MEMBER_KICK:
      return "Multiple members were kicked rapidly in a short period.";
    case ThreatType.WEBHOOK_CREATE:
      return "Multiple unauthorized webhooks were created rapidly.";
    case ThreatType.DANGEROUS_PERMS:
      return "Administrator or management permissions were granted to a public role.";
    case ThreatType.SERVER_TAMPER:
      return "Unauthorized changes were made to server identity (name, vanity URL, or icon).";
    default:
      return "Rapid administrative actions detected above server protection limits.";
  }
}

export function formatPunishmentApplied(punishment: string, threatType?: string): string {
  const p = String(punishment || "").toLowerCase();
  const isBotThreat = threatType === ThreatType.BOT_ADD;

  if (p === "banned") {
    return isBotThreat
      ? `${EMOJIS.get("ban") || "🔨"} Rogue Bot & Member Banned`
      : `${EMOJIS.get("ban") || "🔨"} Member Banned from Server`;
  }
  if (p === "kicked") {
    return isBotThreat
      ? `${EMOJIS.get("kick") || "👢"} Rogue Bot Banned & Member Kicked`
      : `${EMOJIS.get("kick") || "👢"} Member Kicked from Server`;
  }
  if (p === "quarantined") {
    return isBotThreat
      ? `${EMOJIS.get("timeout") || "⏳"} Rogue Bot Banned & Member Quarantined`
      : `${EMOJIS.get("timeout") || "⏳"} Member Quarantined (Admin Roles Revoked)`;
  }
  if (p === "roles_stripped") {
    return isBotThreat
      ? `${EMOJIS.get("moderation") || "🛡️"} Rogue Bot Banned & Staff Roles Revoked`
      : `${EMOJIS.get("moderation") || "🛡️"} Administrator Roles Revoked`;
  }
  if (p === "server_owner") {
    return `${EMOJIS.get("owner") || "👑"} Server Owner (Protected Account)`;
  }
  if (p === "role_above_bot") {
    return isBotThreat
      ? `${EMOJIS.get("warning") || "⚠️"} Rogue Bot Banned (Staff Role Higher than Bot)`
      : `${EMOJIS.get("warning") || "⚠️"} Role Higher than Bot (Cannot Modify Staff)`;
  }
  if (p === "bot_banned" || isBotThreat) {
    return `${EMOJIS.get("ban") || "🔨"} Rogue Bot Banned & Removed from Server`;
  }
  if (p === "none") {
    return `${EMOJIS.get("okay") || "✅"} Action Intercepted & Logged`;
  }
  return p;
}

class AntinukeService {
  // Key: `${guildId}:${executorId}:${threatType}` -> timestamps[]
  private slidingWindows = new Map<string, number[]>();
  private activeMitigations = new Set<string>();

  constructor() {
    // Periodic garbage collection every 2 minutes
    const pruneTimer = setInterval(() => this.pruneOldWindows(), 2 * 60 * 1000);
    if (pruneTimer.unref) pruneTimer.unref();
  }

  private pruneOldWindows(): void {
    const now = Date.now();
    for (const [key, timestamps] of this.slidingWindows.entries()) {
      const valid = timestamps.filter((t) => now - t < 120 * 1000);
      if (valid.length === 0) {
        this.slidingWindows.delete(key);
      } else {
        this.slidingWindows.set(key, valid);
      }
    }
  }

  /**
   * Tracks an action and determines if velocity limit was exceeded
   */
  public registerAction(
    guildId: string,
    executorId: string,
    threatType: ThreatTypeValue,
    threshold: number,
    windowSeconds: number
  ): { triggered: boolean; count: number } {
    const now = Date.now();
    const key = `${guildId}:${executorId}:${threatType}`;
    const windowMs = windowSeconds * 1000;

    let history = this.slidingWindows.get(key) || [];
    history = history.filter((ts) => now - ts <= windowMs);
    history.push(now);
    this.slidingWindows.set(key, history);

    return {
      triggered: history.length >= threshold,
      count: history.length,
    };
  }

  /**
   * Checks if an executor has permission / immunity for an action
   */
  public async isImmune(
    guild: Guild,
    executor: User | GuildMember,
    threatType: ThreatTypeValue
  ): Promise<boolean> {
    const executorId = executor.id;

    // 1. The Bot Itself is always immune
    if (executorId === guild.client.user?.id) return true;

    // 2. Server Owner Immunity (with token-compromise velocity monitor)
    if (executorId === guild.ownerId) {
      // If the owner account performs more than 10 destructive actions in 10s, flag compromise!
      const ownerWindowKey = `${guild.id}:${executorId}:OWNER_GUARD`;
      const now = Date.now();
      let history = this.slidingWindows.get(ownerWindowKey) || [];
      history = history.filter((ts) => now - ts <= 10000);
      history.push(now);
      this.slidingWindows.set(ownerWindowKey, history);

      if (history.length >= 8) {
        await this.engageEmergencyLockdown(guild, "Suspicious high-velocity administrative actions from Owner account (Suspected Compromise).");
        return false;
      }
      return true;
    }

    // 3. Check Granular Trustees / Whitelist
    const trustees = await getAntinukeTrustees(guild.id);
    const member = (executor as any).roles ? (executor as GuildMember) : await guild.members.fetch(executorId).catch(() => null);

    for (const t of trustees) {
      const matchesTarget =
        (t.target_type === "user" && t.target_id === executorId) ||
        (t.target_type === "role" && member?.roles.cache.has(t.target_id));

      if (matchesTarget) {
        // Extra Owner (Tier 1) has universal bypass
        if (t.trust_tier === 1) return true;

        // Scoped bypass checks
        if (
          (threatType === ThreatType.CHANNEL_DELETE || threatType === ThreatType.CHANNEL_CREATE) &&
          t.bypass_channels
        ) {
          return true;
        }
        if (
          (threatType === ThreatType.ROLE_DELETE || threatType === ThreatType.ROLE_CREATE || threatType === ThreatType.DANGEROUS_PERMS) &&
          t.bypass_roles
        ) {
          return true;
        }
        if (
          (threatType === ThreatType.MEMBER_BAN || threatType === ThreatType.MEMBER_KICK) &&
          t.bypass_members
        ) {
          return true;
        }
        if (threatType === ThreatType.BOT_ADD && t.bypass_bots) {
          return true;
        }
        if (threatType === ThreatType.WEBHOOK_CREATE && t.bypass_webhooks) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Primary Mitigation Sequence: Strip Roles -> Punish -> Restore Asset -> Dispatch Alerts
   */
  public async executeMitigation(options: {
    guild: Guild;
    executorId: string;
    threatType: ThreatTypeValue;
    count?: number;
    channelSnapshot?: IChannelSnapshot | null;
    roleSnapshot?: IRoleSnapshot | null;
    details?: string;
  }): Promise<void> {
    const { guild, executorId, threatType, count = 1, channelSnapshot, roleSnapshot, details } = options;
    const mitigationKey = `${guild.id}:${executorId}:${threatType}`;

    if (this.activeMitigations.has(mitigationKey)) return;
    this.activeMitigations.add(mitigationKey);

    try {
      const settings = await getAntinukeSettings(guild.id);
      if (!settings.enabled) return;

      const member = await guild.members.fetch(executorId).catch(() => null);
      let punishmentApplied = "none";
      const reason = `[DV-BOT ANTI-NUKE] Triggered ${threatType} limit (${count} actions).`;

      // Step 1: Instant Neutralization (Strip Administrator and Management Roles or Quarantine)
      if (member) {
        if (member.id === guild.ownerId) {
          punishmentApplied = "server_owner";
        } else if (!member.manageable) {
          punishmentApplied = threatType === ThreatType.BOT_ADD ? "bot_banned" : "role_above_bot";
        } else {
          try {
            if (settings.quarantine_role_id && guild.roles.cache.has(settings.quarantine_role_id)) {
              await member.roles.set([settings.quarantine_role_id], reason);
              punishmentApplied = "quarantined";
            } else {
              const dangerousPerms = [
                PermissionFlagsBits.Administrator,
                PermissionFlagsBits.ManageGuild,
                PermissionFlagsBits.ManageRoles,
                PermissionFlagsBits.ManageChannels,
                PermissionFlagsBits.BanMembers,
                PermissionFlagsBits.KickMembers,
              ];
              const safeRoles = member.roles.cache.filter((r) => !dangerousPerms.some((p) => r.permissions.has(p)));
              await member.roles.set(safeRoles, reason);
              punishmentApplied = "roles_stripped";
            }
          } catch (_) {}
        }
      } else {
        punishmentApplied = threatType === ThreatType.BOT_ADD ? "bot_banned" : "none";
      }

      // Step 2: Enforce Primary Punishment (Ban / Kick) if member is punishable
      if (settings.punishment_type === "ban" && member && member.bannable && member.id !== guild.ownerId) {
        try {
          await guild.members.ban(executorId, { reason, deleteMessageSeconds: 0 });
          punishmentApplied = "banned";
        } catch (_) {}
      } else if (settings.punishment_type === "kick" && member && member.kickable && member.id !== guild.ownerId) {
        try {
          await member.kick(reason);
          punishmentApplied = "kicked";
        } catch (_) {}
      }

      // Step 3: Record Forensic Incident Log in Database
      const incident = await recordAntinukeIncident(guild.id, {
        executorId,
        threatType,
        actionsCount: count,
        punishmentApplied,
        snapshotData: channelSnapshot || roleSnapshot || { details },
      });

      // Step 4: Pre-Cognitive Asset Restoration
      if (settings.auto_recreate_assets) {
        if (channelSnapshot) {
          TOPOLOGY_MIRROR.restoreChannel(guild, channelSnapshot).catch(() => {});
        } else if (roleSnapshot) {
          TOPOLOGY_MIRROR.restoreRole(guild, roleSnapshot).catch(() => {});
        }
      }

      // Step 5: High-Priority Incident Notification Dispatch
      await this.dispatchIncidentAlert(guild, settings, incident, executorId, threatType, count, details);
    } finally {
      setTimeout(() => this.activeMitigations.delete(mitigationKey), 5000);
    }
  }

  /**
   * Dispatches security alert embed to configured log channel and server owner
   */
  private async dispatchIncidentAlert(
    guild: Guild,
    settings: IAntinukeSettings,
    incident: any,
    executorId: string,
    threatType: string,
    count: number,
    details?: string
  ): Promise<void> {
    const friendlyName = formatThreatName(threatType);
    const friendlyDesc = formatThreatDescription(threatType);
    const actionTaken = formatPunishmentApplied(incident.punishment_applied, threatType);
    const shortIncidentId = incident.id ? String(incident.id).slice(0, 8) : "N/A";

    const embed = makeEmbed({
      title: `${EMOJIS.get("warning") || "⚠️"} Server Protection Alert: ${friendlyName}`,
      description: `${EMOJIS.get("red_dot") || "🔴"} **Action Intercepted**\n${friendlyDesc}`,
      fields: [
        {
          name: `${EMOJIS.get("admin") || "👤"} Responsible Member`,
          value: `<@${executorId}> (\`${executorId}\`)`,
          inline: true,
        },
        {
          name: `${EMOJIS.get("moderation") || "🛡️"} Action Taken`,
          value: actionTaken,
          inline: true,
        },
        {
          name: `${EMOJIS.get("arrow_point") || "⚡"} Activity Count`,
          value: `\`${count}\` action${count > 1 ? "s" : ""}`,
          inline: true,
        },
        {
          name: `${EMOJIS.get("okay") || "♻️"} Asset Auto-Recovery`,
          value: settings.auto_recreate_assets
            ? `${EMOJIS.get("success") || "✅"} Auto-Restored`
            : `${EMOJIS.get("fail") || "❌"} Disabled`,
          inline: true,
        },
        {
          name: `${EMOJIS.get("curved_arrow") || "🔖"} Incident Reference`,
          value: `\`#${shortIncidentId}\``,
          inline: true,
        },
      ],
      level: "ERROR",
      color: COLORS.DANGER,
    });

    if (details) {
      embed.addFields({
        name: `${EMOJIS.get("arrow_point") || "📋"} Event Details`,
        value: details.slice(0, 500),
        inline: false,
      });
    }

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel("Open Security Dashboard")
        .setStyle(ButtonStyle.Link)
        .setURL(`${CONFIG.DASHBOARD_URL}/dashboard/${guild.id}/antinuke`)
    );

    const messagePayload = {
      content: `${EMOJIS.get("warning") || "⚠️"} **Security Alert for ${guild.name}**`,
      embeds: [embed],
      components: [row],
    };

    // 1. Send to server designated log channel
    if (settings.log_channel_id) {
      const channel = guild.channels.cache.get(settings.log_channel_id) as any;
      if (channel && channel.isTextBased?.()) {
        channel.send(messagePayload).catch(() => {});
      }
    }

    // 2. DM the Server Owner directly
    try {
      const owner = await guild.fetchOwner();
      if (owner && typeof owner.send === "function") {
        await owner.send(messagePayload).catch(() => {});
      }
    } catch {}
  }

  /**
   * Engages server-wide emergency lockdown (@everyone permissions locked)
   */
  public async engageEmergencyLockdown(guild: Guild, reason: string): Promise<boolean> {
    try {
      const everyoneRole = guild.roles.everyone;
      await everyoneRole.setPermissions(
        everyoneRole.permissions.remove([
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.SendMessagesInThreads,
          PermissionFlagsBits.CreatePublicThreads,
          PermissionFlagsBits.CreatePrivateThreads,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.CreateInstantInvite,
        ]),
        `[DV-BOT EMERGENCY LOCKDOWN] ${reason}`
      );

      await updateAntinukeSettings(guild.id, { emergency_lockdown_active: 1 });
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Lifts server-wide emergency lockdown
   */
  public async liftEmergencyLockdown(guild: Guild, reason: string = "Admin lift"): Promise<boolean> {
    try {
      const everyoneRole = guild.roles.everyone;
      await everyoneRole.setPermissions(
        everyoneRole.permissions.add([
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.SendMessagesInThreads,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.CreateInstantInvite,
        ]),
        `[DV-BOT LOCKDOWN LIFTED] ${reason}`
      );

      await updateAntinukeSettings(guild.id, { emergency_lockdown_active: 0 });
      return true;
    } catch (_) {
      return false;
    }
  }
}

export const ANTINUKE_SERVICE = new AntinukeService();
