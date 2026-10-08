import { Hono } from "hono";
import { ChannelType, PermissionFlagsBits } from "discord.js";
import {
  listDrafts,
  getDraft,
  saveDraft,
  deleteDraft,
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  duplicateTemplate,
  deleteTemplate,
  listHistory,
  getHistoryEntry,
} from "../../db/helpers/messageStudio.js";
import {
  validateMessage,
  verifyAndFetchReply,
  publishMessage,
  editPublishedMessage,
  deletePublishedMessage,
  checkChannelPermissions,
} from "../../services/messageStudioService.js";
import { apiCache } from "./cache.js";

export const messageStudioRoutes = new Hono();

// Helper to invalidate studio caches for a guild
function invalidateStudioCaches(guildId, domain = null) {
  const gId = String(guildId);
  if (!domain || domain === "drafts") {
    apiCache.delete(`guild:${gId}:message-studio:drafts`);
  }
  if (!domain || domain === "templates") {
    apiCache.delete(`guild:${gId}:message-studio:templates`);
  }
  if (!domain || domain === "history") {
    apiCache.delete(`guild:${gId}:message-studio:history`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Destination Channels with Permission Verification
// ─────────────────────────────────────────────────────────────────────────────

messageStudioRoutes.get("/guilds/:guildId/message-studio/channels", async (c) => {
  const guildId = c.req.param("guildId");
  const botGuild = c.get("botGuild");

  if (!botGuild) {
    return c.json({ error: "Bot is not in this guild." }, 404);
  }

  let channelsCollection = botGuild.channels.cache;
  if (!channelsCollection || channelsCollection.size === 0) {
    channelsCollection = await botGuild.channels.fetch().catch(() => botGuild.channels.cache);
  }

  const botMember = botGuild.members.me || (await botGuild.members.fetchMe().catch(() => null));

  const accessibleChannels = Array.from(channelsCollection.values())
    .filter((ch) => {
      if (!ch) return false;
      const isText = ch.type === ChannelType.GuildText ||
        ch.type === ChannelType.GuildAnnouncement ||
        (ch.isTextBased?.() && !ch.isVoiceBased?.());
      return isText;
    })
    .map((ch) => {
      const permCheck = checkChannelPermissions(ch, botMember);
      return {
        id: ch.id,
        name: ch.name,
        type: ch.type,
        canSend: permCheck.ok,
        missingPermissions: permCheck.missing,
        parentName: ch.parent?.name || null,
        position: ch.position || 0,
      };
    })
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name));

  return c.json(accessibleChannels);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Drafts CRUD
// ─────────────────────────────────────────────────────────────────────────────

messageStudioRoutes.get("/guilds/:guildId/message-studio/drafts", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:message-studio:drafts`;
  const cached = apiCache.get(cacheKey);
  if (cached) return c.json(cached);

  const drafts = await listDrafts(guildId);
  apiCache.set(cacheKey, drafts, 15000);
  return c.json(drafts);
});

messageStudioRoutes.get("/guilds/:guildId/message-studio/drafts/:draftId", async (c) => {
  const guildId = c.req.param("guildId");
  const draftId = c.req.param("draftId");
  const draft = await getDraft(guildId, draftId);
  if (!draft) {
    return c.json({ error: "Draft not found." }, 404);
  }
  return c.json(draft);
});

messageStudioRoutes.post("/guilds/:guildId/message-studio/drafts", async (c) => {
  const guildId = c.req.param("guildId");
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));

  const result = await saveDraft(guildId, body, user?.id);
  if (result.conflict) {
    return c.json(
      {
        error: "Optimistic concurrency conflict. The draft was modified in another session.",
        currentDraft: result.currentDraft,
      },
      409
    );
  }

  invalidateStudioCaches(guildId, "drafts");
  return c.json(result.draft, 201);
});

messageStudioRoutes.delete("/guilds/:guildId/message-studio/drafts/:draftId", async (c) => {
  const guildId = c.req.param("guildId");
  const draftId = c.req.param("draftId");
  const deleted = await deleteDraft(guildId, draftId);
  if (!deleted) {
    return c.json({ error: "Draft not found." }, 404);
  }
  invalidateStudioCaches(guildId, "drafts");
  return c.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Templates CRUD
// ─────────────────────────────────────────────────────────────────────────────

messageStudioRoutes.get("/guilds/:guildId/message-studio/templates", async (c) => {
  const guildId = c.req.param("guildId");
  const category = c.req.query("category") || null;
  const search = c.req.query("search") || "";

  const cacheKey = `guild:${guildId}:message-studio:templates:${category || "all"}:${search}`;
  const cached = apiCache.get(cacheKey);
  if (cached) return c.json(cached);

  const templates = await listTemplates(guildId, { category, search });
  apiCache.set(cacheKey, templates, 15000);
  return c.json(templates);
});

messageStudioRoutes.get("/guilds/:guildId/message-studio/templates/:templateId", async (c) => {
  const guildId = c.req.param("guildId");
  const templateId = c.req.param("templateId");
  const template = await getTemplate(guildId, templateId);
  if (!template) {
    return c.json({ error: "Template not found." }, 404);
  }
  return c.json(template);
});

messageStudioRoutes.post("/guilds/:guildId/message-studio/templates", async (c) => {
  const guildId = c.req.param("guildId");
  const user = c.get("user");
  const body = await c.req.json().catch(() => ({}));

  if (!body.name || !String(body.name).trim()) {
    return c.json({ error: "Template name is required." }, 400);
  }

  const created = await createTemplate(guildId, body, user?.id);
  invalidateStudioCaches(guildId, "templates");
  return c.json(created, 201);
});

messageStudioRoutes.put("/guilds/:guildId/message-studio/templates/:templateId", async (c) => {
  const guildId = c.req.param("guildId");
  const templateId = c.req.param("templateId");
  const body = await c.req.json().catch(() => ({}));

  const updated = await updateTemplate(guildId, templateId, body);
  if (!updated) {
    return c.json({ error: "Template not found." }, 404);
  }

  invalidateStudioCaches(guildId, "templates");
  return c.json(updated);
});

messageStudioRoutes.post("/guilds/:guildId/message-studio/templates/:templateId/duplicate", async (c) => {
  const guildId = c.req.param("guildId");
  const templateId = c.req.param("templateId");
  const user = c.get("user");

  const duplicated = await duplicateTemplate(guildId, templateId, user?.id);
  if (!duplicated) {
    return c.json({ error: "Template not found to duplicate." }, 404);
  }

  invalidateStudioCaches(guildId, "templates");
  return c.json(duplicated, 201);
});

messageStudioRoutes.delete("/guilds/:guildId/message-studio/templates/:templateId", async (c) => {
  const guildId = c.req.param("guildId");
  const templateId = c.req.param("templateId");
  const deleted = await deleteTemplate(guildId, templateId);
  if (!deleted) {
    return c.json({ error: "Template not found." }, 404);
  }
  invalidateStudioCaches(guildId, "templates");
  return c.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Validation & Reply Parsing
// ─────────────────────────────────────────────────────────────────────────────

messageStudioRoutes.post("/guilds/:guildId/message-studio/validate", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const validation = validateMessage(body);
  return c.json(validation);
});

messageStudioRoutes.post("/guilds/:guildId/message-studio/validate-reply", async (c) => {
  const guildId = c.req.param("guildId");
  const client = c.get("discordClient");
  const body = await c.req.json().catch(() => ({}));

  if (!client) {
    return c.json({ error: "Discord client is unavailable." }, 503);
  }

  const replyInput = body.url || body.reply_config || body;
  const result = await verifyAndFetchReply(client, guildId, replyInput);

  if (!result.valid) {
    return c.json({ valid: false, error: result.error }, 400);
  }

  return c.json(result);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Publishing & History
// ─────────────────────────────────────────────────────────────────────────────

messageStudioRoutes.post("/guilds/:guildId/message-studio/publish", async (c) => {
  const guildId = c.req.param("guildId");
  const user = c.get("user");
  const client = c.get("discordClient");
  const body = await c.req.json().catch(() => ({}));

  if (!client) {
    return c.json({ error: "Discord client is unavailable." }, 503);
  }

  const channelId = body.channel_id;
  if (!channelId) {
    return c.json({ error: "Destination channel is required." }, 400);
  }

  const result = await publishMessage({
    client,
    guildId,
    channelId,
    userId: user?.id,
    payload: body.payload || body,
    sourceType: body.sourceType || "direct",
    sourceId: body.sourceId || null,
    idempotencyKey: body.idempotencyKey || null,
  });

  if (!result.success) {
    return c.json(result, 400);
  }

  invalidateStudioCaches(guildId, "history");
  return c.json(result, 200);
});

messageStudioRoutes.get("/guilds/:guildId/message-studio/history", async (c) => {
  const guildId = c.req.param("guildId");
  const limit = c.req.query("limit") || 50;
  const offset = c.req.query("offset") || 0;

  const history = await listHistory(guildId, { limit, offset });
  return c.json(history);
});

messageStudioRoutes.get("/guilds/:guildId/message-studio/history/:historyId", async (c) => {
  const guildId = c.req.param("guildId");
  const historyId = c.req.param("historyId");
  const entry = await getHistoryEntry(guildId, historyId);
  if (!entry) {
    return c.json({ error: "History entry not found." }, 404);
  }
  return c.json(entry);
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Edit & Delete Published Messages
// ─────────────────────────────────────────────────────────────────────────────

messageStudioRoutes.put("/guilds/:guildId/message-studio/messages/:messageId", async (c) => {
  const guildId = c.req.param("guildId");
  const messageId = c.req.param("messageId");
  const client = c.get("discordClient");
  const body = await c.req.json().catch(() => ({}));

  if (!client) {
    return c.json({ error: "Discord client is unavailable." }, 503);
  }

  const channelId = body.channel_id;
  if (!channelId) {
    return c.json({ error: "Channel ID is required to locate the message." }, 400);
  }

  const result = await editPublishedMessage({
    client,
    guildId,
    channelId,
    messageId,
    payload: body.payload || body,
  });

  if (!result.success) {
    return c.json(result, 400);
  }

  invalidateStudioCaches(guildId, "history");
  return c.json(result);
});

messageStudioRoutes.delete("/guilds/:guildId/message-studio/messages/:messageId", async (c) => {
  const guildId = c.req.param("guildId");
  const messageId = c.req.param("messageId");
  const channelId = c.req.query("channel_id");
  const client = c.get("discordClient");

  if (!client) {
    return c.json({ error: "Discord client is unavailable." }, 503);
  }

  if (!channelId) {
    return c.json({ error: "channel_id query parameter is required." }, 400);
  }

  const result = await deletePublishedMessage({
    client,
    guildId,
    channelId,
    messageId,
  });

  if (!result.success) {
    return c.json(result, 400);
  }

  invalidateStudioCaches(guildId, "history");
  return c.json(result);
});
