import crypto from "node:crypto";
import {
  AntinukeSettings,
  AntinukeTrustee,
  AntinukeIncident,
} from "../models/index.js";
import { ensureGuild } from "./common.js";

export interface IAntinukeSettings {
  guild_id: string;
  enabled: boolean;
  punishment_type: "quarantine" | "ban" | "kick" | "strip_roles";
  channel_delete_threshold: number;
  channel_create_threshold: number;
  role_delete_threshold: number;
  role_create_threshold: number;
  member_ban_threshold: number;
  member_kick_threshold: number;
  webhook_create_threshold: number;
  window_seconds: number;
  strict_anti_bot: boolean;
  strict_dangerous_perms: boolean;
  strict_vanity_protect: boolean;
  auto_recreate_assets: boolean;
  quarantine_role_id: string | null;
  log_channel_id: string | null;
  emergency_lockdown_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IAntinukeTrustee {
  id: string;
  guild_id: string;
  target_id: string;
  target_type: "user" | "role" | "bot";
  trust_tier: number; // 1 = Extra Owner, 2 = Senior Admin, 3 = Mod
  bypass_channels: boolean;
  bypass_roles: boolean;
  bypass_members: boolean;
  bypass_bots: boolean;
  bypass_webhooks: boolean;
  created_at?: string;
}

export interface IAntinukeIncident {
  id: string;
  guild_id: string;
  executor_id: string;
  threat_type: string;
  actions_count: number;
  punishment_applied: string;
  snapshot_data: string | null;
  resolved: boolean;
  created_at?: string;
}

// In-memory cache for ultra-fast evaluation on high-frequency events
const settingsCache = new Map<string, IAntinukeSettings>();
const trusteesCache = new Map<string, IAntinukeTrustee[]>();

export function invalidateAntinukeCache(guildId?: string | null): void {
  if (guildId) {
    settingsCache.delete(String(guildId));
    trusteesCache.delete(String(guildId));
  } else {
    settingsCache.clear();
    trusteesCache.clear();
  }
}

export async function getAntinukeSettings(guildId: string): Promise<IAntinukeSettings> {
  const gId = String(guildId);
  if (settingsCache.has(gId)) {
    return settingsCache.get(gId)!;
  }

  await ensureGuild(gId);

  let record: any = await AntinukeSettings.findOne({
    where: { guild_id: gId },
  });

  if (!record) {
    record = await AntinukeSettings.create({
      guild_id: gId,
      enabled: 0,
      punishment_type: "quarantine",
      channel_delete_threshold: 3,
      channel_create_threshold: 4,
      role_delete_threshold: 3,
      role_create_threshold: 4,
      member_ban_threshold: 3,
      member_kick_threshold: 3,
      webhook_create_threshold: 2,
      window_seconds: 10,
      strict_anti_bot: 1,
      strict_dangerous_perms: 1,
      strict_vanity_protect: 1,
      auto_recreate_assets: 1,
      quarantine_role_id: null,
      log_channel_id: null,
      emergency_lockdown_active: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const raw = typeof record.toJSON === "function" ? record.toJSON() : { ...record };
  const formatted: IAntinukeSettings = {
    ...raw,
    enabled: Boolean(raw.enabled),
    punishment_type: raw.punishment_type || "quarantine",
    channel_delete_threshold: Number(raw.channel_delete_threshold) || 3,
    channel_create_threshold: Number(raw.channel_create_threshold) || 4,
    role_delete_threshold: Number(raw.role_delete_threshold) || 3,
    role_create_threshold: Number(raw.role_create_threshold) || 4,
    member_ban_threshold: Number(raw.member_ban_threshold) || 3,
    member_kick_threshold: Number(raw.member_kick_threshold) || 3,
    webhook_create_threshold: Number(raw.webhook_create_threshold) || 2,
    window_seconds: Number(raw.window_seconds) || 10,
    strict_anti_bot: Boolean(raw.strict_anti_bot),
    strict_dangerous_perms: Boolean(raw.strict_dangerous_perms),
    strict_vanity_protect: Boolean(raw.strict_vanity_protect),
    auto_recreate_assets: Boolean(raw.auto_recreate_assets),
    quarantine_role_id: raw.quarantine_role_id || null,
    log_channel_id: raw.log_channel_id || null,
    emergency_lockdown_active: Boolean(raw.emergency_lockdown_active),
  };

  settingsCache.set(gId, formatted);
  return formatted;
}

export async function updateAntinukeSettings(
  guildId: string,
  updates: Record<string, any> = {}
): Promise<IAntinukeSettings> {
  const gId = String(guildId);
  await ensureGuild(gId);

  const payload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.enabled !== undefined) payload.enabled = updates.enabled ? 1 : 0;
  if (updates.punishment_type !== undefined) {
    payload.punishment_type = ["quarantine", "ban", "kick", "strip_roles"].includes(updates.punishment_type)
      ? updates.punishment_type
      : "quarantine";
  }
  if (updates.channel_delete_threshold !== undefined) {
    payload.channel_delete_threshold = Math.max(1, Number(updates.channel_delete_threshold) || 3);
  }
  if (updates.channel_create_threshold !== undefined) {
    payload.channel_create_threshold = Math.max(1, Number(updates.channel_create_threshold) || 4);
  }
  if (updates.role_delete_threshold !== undefined) {
    payload.role_delete_threshold = Math.max(1, Number(updates.role_delete_threshold) || 3);
  }
  if (updates.role_create_threshold !== undefined) {
    payload.role_create_threshold = Math.max(1, Number(updates.role_create_threshold) || 4);
  }
  if (updates.member_ban_threshold !== undefined) {
    payload.member_ban_threshold = Math.max(1, Number(updates.member_ban_threshold) || 3);
  }
  if (updates.member_kick_threshold !== undefined) {
    payload.member_kick_threshold = Math.max(1, Number(updates.member_kick_threshold) || 3);
  }
  if (updates.webhook_create_threshold !== undefined) {
    payload.webhook_create_threshold = Math.max(1, Number(updates.webhook_create_threshold) || 2);
  }
  if (updates.window_seconds !== undefined) {
    payload.window_seconds = Math.max(5, Math.min(60, Number(updates.window_seconds) || 10));
  }
  if (updates.strict_anti_bot !== undefined) payload.strict_anti_bot = updates.strict_anti_bot ? 1 : 0;
  if (updates.strict_dangerous_perms !== undefined) payload.strict_dangerous_perms = updates.strict_dangerous_perms ? 1 : 0;
  if (updates.strict_vanity_protect !== undefined) payload.strict_vanity_protect = updates.strict_vanity_protect ? 1 : 0;
  if (updates.auto_recreate_assets !== undefined) payload.auto_recreate_assets = updates.auto_recreate_assets ? 1 : 0;
  if (updates.quarantine_role_id !== undefined) payload.quarantine_role_id = updates.quarantine_role_id || null;
  if (updates.log_channel_id !== undefined) payload.log_channel_id = updates.log_channel_id || null;
  if (updates.emergency_lockdown_active !== undefined) {
    payload.emergency_lockdown_active = updates.emergency_lockdown_active ? 1 : 0;
  }

  const existing = await AntinukeSettings.findOne({ where: { guild_id: gId } });
  if (existing) {
    await AntinukeSettings.update(payload, { where: { guild_id: gId } });
  } else {
    payload.guild_id = gId;
    await AntinukeSettings.create(payload);
  }

  invalidateAntinukeCache(gId);
  return await getAntinukeSettings(gId);
}

export async function getAntinukeTrustees(guildId: string): Promise<IAntinukeTrustee[]> {
  const gId = String(guildId);
  if (trusteesCache.has(gId)) {
    return trusteesCache.get(gId)!;
  }

  const records: any[] = await AntinukeTrustee.findAll({
    where: { guild_id: gId },
  });

  const formatted: IAntinukeTrustee[] = records.map((r) => {
    const raw = typeof r.toJSON === "function" ? r.toJSON() : { ...r };
    return {
      id: String(raw.id),
      guild_id: String(raw.guild_id),
      target_id: String(raw.target_id),
      target_type: raw.target_type || "user",
      trust_tier: Number(raw.trust_tier) || 2,
      bypass_channels: Boolean(raw.bypass_channels),
      bypass_roles: Boolean(raw.bypass_roles),
      bypass_members: Boolean(raw.bypass_members),
      bypass_bots: Boolean(raw.bypass_bots),
      bypass_webhooks: Boolean(raw.bypass_webhooks),
      created_at: raw.created_at,
    };
  });

  trusteesCache.set(gId, formatted);
  return formatted;
}

export async function addAntinukeTrustee(
  guildIdOrPayload: string | Record<string, any>,
  data?: {
    targetId?: string;
    targetType?: "user" | "role";
    trustTier?: number;
    bypassChannels?: boolean;
    bypassRoles?: boolean;
    bypassMembers?: boolean;
    bypassBots?: boolean;
    bypassWebhooks?: boolean;
    [key: string]: any;
  }
): Promise<IAntinukeTrustee> {
  let gId: string;
  let payloadInput: Record<string, any>;

  if (typeof guildIdOrPayload === "string") {
    gId = String(guildIdOrPayload);
    payloadInput = data || {};
  } else {
    payloadInput = guildIdOrPayload || {};
    gId = String(payloadInput.guild_id || payloadInput.guildId);
  }

  const targetId = String(payloadInput.targetId || payloadInput.target_id);
  await ensureGuild(gId);

  const existing: any = await AntinukeTrustee.findOne({
    where: { guild_id: gId, target_id: targetId },
  });

  const payload: Record<string, any> = {
    guild_id: gId,
    target_id: targetId,
    target_type: payloadInput.targetType || payloadInput.target_type || "user",
    trust_tier: payloadInput.trustTier !== undefined ? Number(payloadInput.trustTier) : (payloadInput.trust_tier !== undefined ? Number(payloadInput.trust_tier) : 2),
    bypass_channels: (payloadInput.bypassChannels ?? payloadInput.bypass_channels) ? 1 : 0,
    bypass_roles: (payloadInput.bypassRoles ?? payloadInput.bypass_roles) ? 1 : 0,
    bypass_members: (payloadInput.bypassMembers ?? payloadInput.bypass_members) ? 1 : 0,
    bypass_bots: (payloadInput.bypassBots ?? payloadInput.bypass_bots) ? 1 : 0,
    bypass_webhooks: (payloadInput.bypassWebhooks ?? payloadInput.bypass_webhooks) ? 1 : 0,
  };

  let record: any;
  if (existing) {
    await AntinukeTrustee.update(payload, { where: { id: existing.id } });
    record = await AntinukeTrustee.findOne({ where: { id: existing.id } });
  } else {
    payload.id = crypto.randomUUID();
    payload.created_at = new Date().toISOString();
    record = await AntinukeTrustee.create(payload);
  }

  invalidateAntinukeCache(gId);
  const raw = typeof record.toJSON === "function" ? record.toJSON() : { ...record };
  return {
    id: String(raw.id),
    guild_id: String(raw.guild_id),
    target_id: String(raw.target_id),
    target_type: raw.target_type,
    trust_tier: Number(raw.trust_tier),
    bypass_channels: Boolean(raw.bypass_channels),
    bypass_roles: Boolean(raw.bypass_roles),
    bypass_members: Boolean(raw.bypass_members),
    bypass_bots: Boolean(raw.bypass_bots),
    bypass_webhooks: Boolean(raw.bypass_webhooks),
    created_at: raw.created_at,
  };
}

export async function removeAntinukeTrustee(guildId: string, targetOrTrusteeId: string): Promise<boolean> {
  const gId = String(guildId);
  const idStr = String(targetOrTrusteeId);

  const deleted = await AntinukeTrustee.destroy({
    where: {
      guild_id: gId,
      target_id: idStr,
    },
  });

  if (deleted === 0) {
    await AntinukeTrustee.destroy({
      where: {
        guild_id: gId,
        id: idStr,
      },
    });
  }

  invalidateAntinukeCache(gId);
  return true;
}

export async function recordAntinukeIncident(
  guildId: string,
  data: {
    executorId: string;
    threatType: string;
    actionsCount?: number;
    punishmentApplied: string;
    snapshotData?: any;
  }
): Promise<IAntinukeIncident> {
  const gId = String(guildId);
  const incidentId = crypto.randomUUID();

  const payload: Record<string, any> = {
    id: incidentId,
    guild_id: gId,
    executor_id: String(data.executorId),
    threat_type: String(data.threatType),
    actions_count: Number(data.actionsCount) || 1,
    punishment_applied: String(data.punishmentApplied),
    snapshot_data: data.snapshotData ? (typeof data.snapshotData === "string" ? data.snapshotData : JSON.stringify(data.snapshotData)) : null,
    resolved: 0,
    created_at: new Date().toISOString(),
  };

  const record: any = await AntinukeIncident.create(payload);
  const raw = typeof record.toJSON === "function" ? record.toJSON() : { ...record };
  return {
    id: String(raw.id),
    guild_id: String(raw.guild_id),
    executor_id: String(raw.executor_id),
    threat_type: raw.threat_type,
    actions_count: Number(raw.actions_count),
    punishment_applied: raw.punishment_applied,
    snapshot_data: raw.snapshot_data,
    resolved: Boolean(raw.resolved),
    created_at: raw.created_at,
  };
}

export async function getAntinukeIncidents(guildId: string, limit: number = 25): Promise<IAntinukeIncident[]> {
  const gId = String(guildId);
  const records: any[] = await AntinukeIncident.findAll({
    where: { guild_id: gId },
    order: [["created_at", "DESC"]],
    limit: Math.max(1, Math.min(100, Number(limit) || 25)),
  });

  return records.map((r) => {
    const raw = typeof r.toJSON === "function" ? r.toJSON() : { ...r };
    return {
      id: String(raw.id),
      guild_id: String(raw.guild_id),
      executor_id: String(raw.executor_id),
      threat_type: raw.threat_type,
      actions_count: Number(raw.actions_count),
      punishment_applied: raw.punishment_applied,
      snapshot_data: raw.snapshot_data,
      resolved: Boolean(raw.resolved),
      created_at: raw.created_at,
    };
  });
}

export async function getAntinukeIncidentById(guildId: string, incidentId: string): Promise<IAntinukeIncident | null> {
  const record: any = await AntinukeIncident.findOne({
    where: { guild_id: String(guildId), id: String(incidentId) },
  });
  if (!record) return null;
  const raw = typeof record.toJSON === "function" ? record.toJSON() : { ...record };
  return {
    id: String(raw.id),
    guild_id: String(raw.guild_id),
    executor_id: String(raw.executor_id),
    threat_type: raw.threat_type,
    actions_count: Number(raw.actions_count),
    punishment_applied: raw.punishment_applied,
    snapshot_data: raw.snapshot_data,
    resolved: Boolean(raw.resolved),
    created_at: raw.created_at,
  };
}

export async function resolveAntinukeIncident(guildId: string, incidentId: string): Promise<boolean> {
  const [affected]: any = await AntinukeIncident.update(
    { resolved: 1 },
    { where: { guild_id: String(guildId), id: String(incidentId) } }
  );
  return Boolean(affected);
}


