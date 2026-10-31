import crypto from "node:crypto";
import { TicketConfig, TicketPanel, Ticket, Op } from "../models/index.js";
import { ensureGuild } from "./common.js";

// In-memory cache
const configCache = new Map<string, any>();
const panelsCache = new Map<string, any[]>();
const ticketCounterMutex = new Map<string, Promise<any>>();

export interface ReasonCategoryItem {
  id: string;
  label: string;
  emoji?: string;
  description?: string;
  category_id?: string | null; // Discord channel category override
  role_ids?: string[]; // Support roles override to ping
  require_reason?: boolean; // Whether to prompt user for reason via modal
}

export function normalizeReasonCategories(raw: any): ReasonCategoryItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeSupportRoles(raw: any): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function normalizeConfig(record: any) {
  if (!record) return null;
  const raw = typeof record.toJSON === "function" ? record.toJSON() : record;
  return {
    guild_id: raw.guild_id,
    enabled: Boolean(raw.enabled),
    transcript_channel_id: raw.transcript_channel_id || null,
    category_id: raw.category_id || null,
    support_role_ids: normalizeSupportRoles(raw.support_role_ids),
    max_tickets_per_user: Number(raw.max_tickets_per_user ?? 3),
    ticket_counter: Number(raw.ticket_counter ?? 0),
    auto_close_hours: Number(raw.auto_close_hours ?? 0),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

export function normalizePanel(record: any) {
  if (!record) return null;
  const raw = typeof record.toJSON === "function" ? record.toJSON() : record;
  return {
    id: raw.id,
    guild_id: raw.guild_id,
    channel_id: raw.channel_id || null,
    message_id: raw.message_id || null,
    title: raw.title || "🎫 Support Tickets",
    description: raw.description || "Need assistance? Click a button or select a department below.",
    color: raw.color || "#6366F1",
    image_url: raw.image_url || null,
    button_text: raw.button_text || "Open Ticket",
    button_emoji: raw.button_emoji || "📩",
    button_style: raw.button_style || "Primary",
    select_placeholder: raw.select_placeholder || "Select a ticket reason / category...",
    enable_reason_categories: Boolean(raw.enable_reason_categories),
    reason_categories: normalizeReasonCategories(raw.reason_categories),
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

export async function getTicketConfig(guildId: string) {
  const gId = String(guildId);
  if (configCache.has(gId)) {
    return configCache.get(gId);
  }

  await ensureGuild(gId);
  const where: Record<string, any> = { guild_id: gId };
  const defaults: Record<string, any> = {
    guild_id: gId,
    enabled: false,
    transcript_channel_id: null,
    category_id: null,
    support_role_ids: "[]",
    max_tickets_per_user: 3,
    ticket_counter: 0,
    auto_close_hours: 0,
  };

  const [record, created]: any = await TicketConfig.findOrCreate({ where, defaults });
  const parsed = normalizeConfig(record);
  configCache.set(gId, parsed);
  return parsed;
}

export async function saveTicketConfig(guildId: string, updates: Record<string, any>) {
  const gId = String(guildId);
  await ensureGuild(gId);

  const payload: Record<string, any> = { updated_at: new Date().toISOString() };

  if (updates.enabled !== undefined) payload.enabled = Boolean(updates.enabled);
  if (updates.transcript_channel_id !== undefined) payload.transcript_channel_id = updates.transcript_channel_id;
  if (updates.category_id !== undefined) payload.category_id = updates.category_id;
  if (updates.max_tickets_per_user !== undefined) payload.max_tickets_per_user = Math.max(1, Number(updates.max_tickets_per_user) || 3);
  if (updates.auto_close_hours !== undefined) payload.auto_close_hours = Math.max(0, Number(updates.auto_close_hours) || 0);
  if (updates.support_role_ids !== undefined) {
    payload.support_role_ids = Array.isArray(updates.support_role_ids)
      ? JSON.stringify(updates.support_role_ids)
      : String(updates.support_role_ids);
  }

  const where: Record<string, any> = { guild_id: gId };
  await TicketConfig.update(payload, { where });
  configCache.delete(gId);
  return await getTicketConfig(gId);
}

export async function getTicketPanels(guildId: string) {
  const gId = String(guildId);
  if (panelsCache.has(gId)) {
    return panelsCache.get(gId);
  }

  const where: Record<string, any> = { guild_id: gId };
  const records = await TicketPanel.findAll({ where });
  const parsed = records.map(normalizePanel);
  panelsCache.set(gId, parsed);
  return parsed;
}

export async function getTicketPanel(guildId: string, panelId: string) {
  const gId = String(guildId);
  const where: Record<string, any> = { guild_id: gId, id: panelId };
  const record = await TicketPanel.findOne({ where });
  return record ? normalizePanel(record) : null;
}

export async function saveTicketPanel(guildId: string, panelData: Record<string, any>) {
  const gId = String(guildId);
  await ensureGuild(gId);

  const id = panelData.id || `pnl_${crypto.randomBytes(6).toString("hex")}`;
  const payload: Record<string, any> = {
    guild_id: gId,
    id,
    title: panelData.title || "🎫 Support Tickets",
    description: panelData.description || "Need assistance? Click a button or select a department below.",
    color: panelData.color || "#6366F1",
    image_url: panelData.image_url || null,
    button_text: panelData.button_text || "Open Ticket",
    button_emoji: panelData.button_emoji || "📩",
    button_style: panelData.button_style || "Primary",
    select_placeholder: panelData.select_placeholder || "Select a ticket reason / category...",
    enable_reason_categories: Boolean(panelData.enable_reason_categories),
    reason_categories: Array.isArray(panelData.reason_categories)
      ? JSON.stringify(panelData.reason_categories)
      : (panelData.reason_categories || "[]"),
    channel_id: panelData.channel_id || null,
    message_id: panelData.message_id || null,
    updated_at: new Date().toISOString(),
  };

  const where: Record<string, any> = { guild_id: gId, id };
  const existing = await TicketPanel.findOne({ where });

  if (existing) {
    await TicketPanel.update(payload, { where });
  } else {
    payload.created_at = new Date().toISOString();
    await TicketPanel.create(payload);
  }

  panelsCache.delete(gId);
  return await getTicketPanel(gId, id);
}

export async function deleteTicketPanel(guildId: string, panelId: string) {
  const gId = String(guildId);
  const where: Record<string, any> = { guild_id: gId, id: panelId };
  const count = await TicketPanel.destroy({ where });
  panelsCache.delete(gId);
  return count > 0;
}

export async function getNextTicketNumber(guildId: string): Promise<number> {
  const gId = String(guildId);
  while (ticketCounterMutex.has(gId)) {
    await ticketCounterMutex.get(gId);
  }

  let resolveMutex: () => void;
  const promise = new Promise<void>((res) => {
    resolveMutex = res;
  });
  ticketCounterMutex.set(gId, promise);

  try {
    const config = await getTicketConfig(gId);
    const nextNum = (config.ticket_counter || 0) + 1;

    const payload: Record<string, any> = { ticket_counter: nextNum, updated_at: new Date().toISOString() };
    const where: Record<string, any> = { guild_id: gId };
    await TicketConfig.update(payload, { where });
    configCache.delete(gId);

    return nextNum;
  } finally {
    ticketCounterMutex.delete(gId);
    resolveMutex!();
  }
}

export async function createTicket(ticketData: {
  guild_id: string;
  user_id: string;
  user_tag: string;
  channel_id?: string | null;
  panel_id?: string | null;
  category_name?: string;
  reason?: string | null;
}) {
  const gId = String(ticketData.guild_id);
  const ticketNumber = await getNextTicketNumber(gId);
  const ticketId = `tkt_${crypto.randomBytes(6).toString("hex")}`;

  const payload: Record<string, any> = {
    id: ticketId,
    guild_id: gId,
    ticket_number: ticketNumber,
    user_id: ticketData.user_id,
    user_tag: ticketData.user_tag,
    channel_id: ticketData.channel_id || null,
    panel_id: ticketData.panel_id || null,
    category_name: ticketData.category_name || "General Support",
    reason: ticketData.reason || null,
    status: "open",
    claimed_by: null,
    claimed_by_tag: null,
    closed_by: null,
    closed_by_tag: null,
    close_reason: null,
    transcript_url: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const record = await Ticket.create(payload);
  return typeof record.toJSON === "function" ? record.toJSON() : record;
}

export async function getTicketById(ticketId: string) {
  const where: Record<string, any> = { id: ticketId };
  const record = await Ticket.findOne({ where });
  return record ? (typeof record.toJSON === "function" ? record.toJSON() : record) : null;
}

export async function getTicketByChannel(channelId: string) {
  const where: Record<string, any> = { channel_id: channelId };
  const record = await Ticket.findOne({ where });
  return record ? (typeof record.toJSON === "function" ? record.toJSON() : record) : null;
}

export async function getUserOpenTicketsCount(guildId: string, userId: string): Promise<number> {
  const where: Record<string, any> = {
    guild_id: String(guildId),
    user_id: String(userId),
    status: { [Op.or]: ["open", "claimed"] },
  };
  return await Ticket.count({ where });
}

export async function updateTicket(ticketId: string, updates: Record<string, any>) {
  const payload: Record<string, any> = { ...updates, updated_at: new Date().toISOString() };
  const where: Record<string, any> = { id: ticketId };
  await Ticket.update(payload, { where });
  return await getTicketById(ticketId);
}

export async function listTickets(guildId: string, options: { status?: string; limit?: number; offset?: number } = {}) {
  const where: Record<string, any> = { guild_id: String(guildId) };
  if (options.status && options.status !== "all") {
    where.status = options.status;
  }

  const limit = Math.min(100, Math.max(1, Number(options.limit) || 25));
  const offset = Math.max(0, Number(options.offset) || 0);

  const records = await Ticket.findAll({
    where,
    limit,
    offset,
    order: [["ticket_number", "DESC"]],
  });

  const total = await Ticket.count({ where });

  return {
    tickets: records.map((r: any) => (typeof r.toJSON === "function" ? r.toJSON() : r)),
    total,
    limit,
    offset,
  };
}
