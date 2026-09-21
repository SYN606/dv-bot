import { Hono } from "hono";
import {
  getGuildAutoresponders,
  upsertAutoresponder,
  updateAutoresponder,
  toggleAutoresponder,
  deleteAutoresponder,
  setResponderReactions,
} from "../../db/helpers/autoresponder.js";
import { apiCache } from "./cache.js";

export const autoresponderRoutes = new Hono();

// Autoresponders List
autoresponderRoutes.get("/guilds/:guildId/autoresponder", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:autoresponders`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const rawResponders = await getGuildAutoresponders(guildId);

  const responders = rawResponders.map((r) => {
    const raw = r.toJSON ? r.toJSON() : r;
    const reactionList = (raw.reactions || []).map((rx) => (typeof rx === "object" ? rx.emoji : rx));
    return {
      ...raw,
      id: raw.responder_id,
      responder_id: raw.responder_id,
      trigger: raw.trigger_phrase,
      trigger_phrase: raw.trigger_phrase,
      match_mode: raw.match_type,
      match_type: raw.match_type,
      reply: raw.reply_content,
      reply_content: raw.reply_content,
      is_embed: Boolean(raw.is_embed),
      embed_title: raw.embed_title || "",
      image_url: raw.image_url || "",
      enabled: raw.enabled !== false,
      ignore_bots: raw.ignore_bots !== false,
      delete_trigger: Boolean(raw.delete_trigger),
      cooldown: Number(raw.cooldown || 0),
      reactions: reactionList,
      emoji_reactions: reactionList,
    };
  });

  // Cache for 20 seconds
  apiCache.set(cacheKey, responders, 20000);

  return c.json(responders);
});

// Autoresponder Create or Update
autoresponderRoutes.post("/guilds/:guildId/autoresponder", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json();

  const trigger = (body.trigger_phrase || body.trigger || "").trim();
  const reply = (body.reply_content || body.reply || "").trim();
  const matchType = body.match_type || body.matchMode || body.match_mode || "contains";
  const isEmbed = body.is_embed !== undefined ? Boolean(body.is_embed) : Boolean(body.isEmbed);
  const embedTitle = body.embed_title || body.embedTitle || null;
  const imageUrl = body.image_url || body.imageUrl || null;
  const cooldown = Number(body.cooldown || 0);
  const deleteTrigger = body.delete_trigger !== undefined ? Boolean(body.delete_trigger) : Boolean(body.deleteTrigger);
  const ignoreBots = body.ignore_bots !== undefined ? Boolean(body.ignore_bots) : (body.ignoreBots !== undefined ? Boolean(body.ignoreBots) : true);
  const enabled = body.enabled !== undefined ? Boolean(body.enabled) : true;

  // Normalize reactions
  let reactionList = [];
  if (Array.isArray(body.emoji_reactions)) {
    reactionList = body.emoji_reactions;
  } else if (Array.isArray(body.reactions)) {
    reactionList = body.reactions;
  } else if (typeof body.reaction === "string" && body.reaction.trim()) {
    reactionList = [body.reaction.trim()];
  } else if (typeof body.reactions === "string" && body.reactions.trim()) {
    reactionList = body.reactions.split(",").map((s) => s.trim()).filter(Boolean);
  }

  if (!trigger || !reply) {
    return c.json({ error: "Trigger phrase and response message content are required." }, 400);
  }

  const responderId = body.responder_id || body.id;
  let responder;

  if (responderId) {
    await updateAutoresponder(guildId, responderId, {
      trigger_phrase: trigger,
      match_type: matchType,
      reply_content: reply,
      is_embed: isEmbed,
      embed_title: embedTitle,
      image_url: imageUrl,
      cooldown,
      delete_trigger: deleteTrigger,
      ignore_bots: ignoreBots,
      enabled,
    });
    await setResponderReactions(responderId, reactionList);
    responder = { responder_id: Number(responderId), trigger_phrase: trigger, reply_content: reply };
  } else {
    responder = await upsertAutoresponder(guildId, {
      trigger_phrase: trigger,
      match_type: matchType,
      reply_content: reply,
      is_embed: isEmbed,
      embed_title: embedTitle,
      image_url: imageUrl,
      cooldown,
      delete_trigger: deleteTrigger,
      ignore_bots: ignoreBots,
      enabled,
    });
    if (reactionList.length > 0) {
      await setResponderReactions(responder.responder_id, reactionList);
    }
  }

  // Invalidate cache immediately on write
  apiCache.delete(`guild:${guildId}:autoresponders`);

  return c.json({ success: true, responder, id: responder.responder_id });
});

// Toggle Autoresponder Rule Status
autoresponderRoutes.post("/guilds/:guildId/autoresponder/:id/toggle", async (c) => {
  const guildId = c.req.param("guildId");
  const id = c.req.param("id");
  const newStatus = await toggleAutoresponder(guildId, id);
  if (newStatus === null) {
    return c.json({ error: "Autoresponder rule not found." }, 404);
  }

  // Invalidate cache
  apiCache.delete(`guild:${guildId}:autoresponders`);

  return c.json({ success: true, id: Number(id), enabled: newStatus });
});

// Delete Autoresponder Rule
autoresponderRoutes.delete("/guilds/:guildId/autoresponder/:id", async (c) => {
  const guildId = c.req.param("guildId");
  const id = c.req.param("id");
  const deleted = await deleteAutoresponder(guildId, id);

  // Invalidate cache
  apiCache.delete(`guild:${guildId}:autoresponders`);

  return c.json({ success: deleted > 0 });
});
