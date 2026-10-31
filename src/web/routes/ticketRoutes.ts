import { Hono } from "hono";
import {
  getTicketConfig,
  saveTicketConfig,
  getTicketPanels,
  getTicketPanel,
  saveTicketPanel,
  deleteTicketPanel,
  listTickets,
  getTicketById,
} from "../../db/helpers/tickets.js";
import { setModuleEnabled } from "../../db/helpers/moduleStatus.js";
import { deployTicketPanel } from "../../services/ticketService.js";

export const ticketRoutes = new Hono();

// 1. Get Ticket Global Settings
ticketRoutes.get("/guilds/:guildId/tickets/config", async (c) => {
  const guildId = c.req.param("guildId");
  const config = await getTicketConfig(guildId);
  return c.json(config);
});

// 2. Update Ticket Global Settings
ticketRoutes.put("/guilds/:guildId/tickets/config", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));

  const updates: Record<string, any> = {};
  if (body.enabled !== undefined) updates.enabled = Boolean(body.enabled);
  if (body.transcript_channel_id !== undefined) updates.transcript_channel_id = body.transcript_channel_id || null;
  if (body.category_id !== undefined) updates.category_id = body.category_id || null;
  if (body.support_role_ids !== undefined) updates.support_role_ids = Array.isArray(body.support_role_ids) ? body.support_role_ids : [];
  if (body.max_tickets_per_user !== undefined) updates.max_tickets_per_user = Math.max(1, Number(body.max_tickets_per_user) || 3);
  if (body.auto_close_hours !== undefined) updates.auto_close_hours = Math.max(0, Number(body.auto_close_hours) || 0);

  const updated = await saveTicketConfig(guildId, updates);
  if (updates.enabled !== undefined) {
    await setModuleEnabled(guildId, "tickets", updates.enabled);
  }

  return c.json({ success: true, config: updated });
});

// 3. Get All Ticket Panels (with Reason Categories)
ticketRoutes.get("/guilds/:guildId/tickets/panels", async (c) => {
  const guildId = c.req.param("guildId");
  const panels = await getTicketPanels(guildId);
  return c.json(panels);
});

// 4. Create or Save Ticket Panel
ticketRoutes.post("/guilds/:guildId/tickets/panels", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));

  if (!body.title || !body.title.trim()) {
    return c.json({ error: "Panel title is required." }, 400);
  }

  const saved = await saveTicketPanel(guildId, body);
  return c.json({ success: true, panel: saved });
});

// 5. Delete Ticket Panel
ticketRoutes.delete("/guilds/:guildId/tickets/panels/:panelId", async (c) => {
  const guildId = c.req.param("guildId");
  const panelId = c.req.param("panelId");

  const success = await deleteTicketPanel(guildId, panelId);
  return c.json({ success });
});

// 6. Deploy Ticket Panel to Discord Channel
ticketRoutes.post("/guilds/:guildId/tickets/panels/:panelId/deploy", async (c) => {
  const guildId = c.req.param("guildId");
  const panelId = c.req.param("panelId");

  const discordClient = c.get("discordClient");
  if (!discordClient) {
    return c.json({ error: "Discord client is unavailable." }, 500);
  }

  const botGuild = discordClient.guilds?.cache?.get(guildId) || (await discordClient.guilds?.fetch(guildId).catch(() => null));
  if (!botGuild) {
    return c.json({ error: "Bot is not present in this server." }, 404);
  }

  const panel = await getTicketPanel(guildId, panelId);
  if (!panel) {
    return c.json({ error: "Panel not found." }, 404);
  }

  if (!panel.channel_id) {
    return c.json({ error: "Please configure a channel for this panel first." }, 400);
  }

  try {
    const sent = await deployTicketPanel(discordClient, botGuild, panel);
    await saveTicketPanel(guildId, { ...panel, message_id: sent.id });
    return c.json({ success: true, message: "Ticket panel deployed successfully!" });
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to deploy ticket panel." }, 400);
  }
});

// 7. Get Paginated Tickets Stream & Log
ticketRoutes.get("/guilds/:guildId/tickets/list", async (c) => {
  const guildId = c.req.param("guildId");
  const status = c.req.query("status") || "all";
  const limit = Number(c.req.query("limit") || 25);
  const offset = Number(c.req.query("offset") || 0);

  const result = await listTickets(guildId, { status, limit, offset });
  return c.json(result);
});

// 8. Get Ticket Details
ticketRoutes.get("/guilds/:guildId/tickets/:ticketId", async (c) => {
  const ticketId = c.req.param("ticketId");
  const ticket = await getTicketById(ticketId);
  if (!ticket) {
    return c.json({ error: "Ticket not found." }, 404);
  }
  return c.json(ticket);
});
