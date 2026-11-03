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
  addTicketNote,
  getTicketNotes,
  deleteTicketNote,
  getTicketEvents,
  getTicketAnalytics,
} from "../../db/helpers/tickets.js";
import { setModuleEnabled } from "../../db/helpers/moduleStatus.js";
import { deployTicketPanel, deleteTicketPanelMessages } from "../../services/ticketService.js";
import { transitionTicketState } from "../../services/ticketLifecycleService.js";

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
  if (body.logging_channel_id !== undefined) updates.logging_channel_id = body.logging_channel_id || null;
  if (body.category_id !== undefined) updates.category_id = body.category_id || null;
  if (body.support_role_ids !== undefined) updates.support_role_ids = Array.isArray(body.support_role_ids) ? body.support_role_ids : [];
  if (body.max_tickets_per_user !== undefined) updates.max_tickets_per_user = Math.max(1, Number(body.max_tickets_per_user) || 3);
  if (body.auto_close_hours !== undefined) updates.auto_close_hours = Math.max(0, Number(body.auto_close_hours) || 0);
  if (body.save_transcripts !== undefined) updates.save_transcripts = Boolean(body.save_transcripts);
  if (body.channel_name_pattern !== undefined) updates.channel_name_pattern = body.channel_name_pattern;
  if (body.ticket_counter !== undefined) updates.ticket_counter = Number(body.ticket_counter);
  if (body.next_ticket_number !== undefined) updates.next_ticket_number = Number(body.next_ticket_number);

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

  const panel = await getTicketPanel(guildId, panelId);
  const discordClient = (c as any).get("discordClient") as any;

  if (discordClient && panel) {
    try {
      const botGuild = discordClient.guilds?.cache?.get(guildId) || (await discordClient.guilds?.fetch(guildId).catch(() => null));
      if (botGuild) {
        await deleteTicketPanelMessages(discordClient, botGuild, panel);
      }
    } catch (err) {
      console.warn("[TICKET PANEL DELETE] Failed to clean up Discord message:", err);
    }
  }

  const success = await deleteTicketPanel(guildId, panelId);
  return c.json({ success });
});

// 6. Deploy Ticket Panel to Discord Channel
ticketRoutes.post("/guilds/:guildId/tickets/panels/:panelId/deploy", async (c) => {
  const guildId = c.req.param("guildId");
  const panelId = c.req.param("panelId");

  const discordClient = (c as any).get("discordClient") as any;
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
  const guildId = c.req.param("guildId");
  const ticketId = c.req.param("ticketId");
  const ticket = await getTicketById(ticketId);
  if (!ticket || ticket.guild_id !== guildId) {
    return c.json({ error: "Ticket not found in this server." }, 404);
  }
  return c.json(ticket);
});

// 9. Get Ticket Performance Analytics
ticketRoutes.get("/guilds/:guildId/tickets/analytics", async (c) => {
  const guildId = c.req.param("guildId");
  const stats = await getTicketAnalytics(guildId);
  return c.json(stats);
});

// 10. Get Ticket Private Staff Notes
ticketRoutes.get("/guilds/:guildId/tickets/:ticketId/notes", async (c) => {
  const guildId = c.req.param("guildId");
  const ticketId = c.req.param("ticketId");
  const ticket = await getTicketById(ticketId);
  if (!ticket || ticket.guild_id !== guildId) {
    return c.json({ error: "Ticket not found in this server." }, 404);
  }
  const notes = await getTicketNotes(ticketId);
  return c.json(notes);
});

// 11. Add Ticket Staff Note
ticketRoutes.post("/guilds/:guildId/tickets/:ticketId/notes", async (c) => {
  const guildId = c.req.param("guildId");
  const ticketId = c.req.param("ticketId");
  const ticket = await getTicketById(ticketId);
  if (!ticket || ticket.guild_id !== guildId) {
    return c.json({ error: "Ticket not found in this server." }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  if (!body.content || !body.content.trim()) {
    return c.json({ error: "Content is required." }, 400);
  }

  const user = (c as any).get("user") || { id: "dashboard_staff", tag: "Staff Member" };
  const note = await addTicketNote({
    ticket_id: ticketId,
    guild_id: guildId,
    author_id: user.id,
    author_tag: user.tag || user.username || "Staff",
    content: body.content,
  });

  return c.json(note);
});

// 12. Delete Ticket Staff Note
ticketRoutes.delete("/guilds/:guildId/tickets/:ticketId/notes/:noteId", async (c) => {
  const guildId = c.req.param("guildId");
  const ticketId = c.req.param("ticketId");
  const ticket = await getTicketById(ticketId);
  if (!ticket || ticket.guild_id !== guildId) {
    return c.json({ error: "Ticket not found in this server." }, 404);
  }

  const noteId = c.req.param("noteId");
  const user = (c as any).get("user") || { id: "dashboard_staff", tag: "Staff Member" };

  await deleteTicketNote(noteId, ticketId, user.id, user.tag || "Staff", guildId);
  return c.json({ success: true });
});

// 13. Get Ticket Activity Audit Events
ticketRoutes.get("/guilds/:guildId/tickets/:ticketId/events", async (c) => {
  const guildId = c.req.param("guildId");
  const ticketId = c.req.param("ticketId");
  const ticket = await getTicketById(ticketId);
  if (!ticket || ticket.guild_id !== guildId) {
    return c.json({ error: "Ticket not found in this server." }, 404);
  }

  const events = await getTicketEvents(ticketId);
  return c.json(events);
});

// 14. Transition Ticket State (claim, escalate, resolve, reopen, etc.)
ticketRoutes.post("/guilds/:guildId/tickets/:ticketId/transition", async (c) => {
  const guildId = c.req.param("guildId");
  const ticketId = c.req.param("ticketId");
  const ticket = await getTicketById(ticketId);
  if (!ticket || ticket.guild_id !== guildId) {
    return c.json({ error: "Ticket not found in this server." }, 404);
  }

  const body = await c.req.json().catch(() => ({}));
  const nextStatus = body.status;

  if (!nextStatus) {
    return c.json({ error: "Target status is required." }, 400);
  }

  let botGuild = (c as any).get("botGuild");
  if (!botGuild) {
    const client = (c as any).get("discordClient");
    if (client?.guilds) {
      botGuild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
    }
  }
  if (!botGuild) {
    return c.json({ error: "Bot is not in this guild." }, 404);
  }

  const user = (c as any).get("user") || { id: "dashboard_staff", tag: "Staff Member" };

  try {
    const updated = await transitionTicketState({
      guild: botGuild,
      ticketId,
      nextStatus,
      actor: { id: user.id, tag: user.tag || user.username || "Staff" },
      reason: body.reason,
    });
    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to transition ticket state." }, 400);
  }
});
