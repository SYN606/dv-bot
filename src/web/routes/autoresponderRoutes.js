import { Hono } from "hono";
import {
  getGuildAutoresponders,
  getRuleById,
  upsertAutoresponder,
  updateAutoresponder,
  toggleAutoresponder,
  deleteAutoresponder,
  setResponderReactions,
  clearResponderReactions,
} from "../../db/helpers/autoresponder.js";
import { apiCache } from "./cache.js";

export const autoresponderRoutes = new Hono();

function formatRule(r) {
  const raw = r.toJSON ? r.toJSON() : r;
  const reactionList = (raw.reactions || []).map((rx) => {
    if (typeof rx === "string") return rx;
    return rx?.emoji || rx?.dataValues?.emoji || "";
  }).filter(Boolean);

  return {
    ...raw,
    id: raw.responder_id,
    responder_id: raw.responder_id,
    trigger: raw.trigger_phrase,
    trigger_phrase: raw.trigger_phrase,
    match_mode: raw.match_type || "contains",
    match_type: raw.match_type || "contains",
    reply: raw.reply_content || "",
    reply_content: raw.reply_content || "",
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
}

// 1. Autoresponders List
autoresponderRoutes.get("/guilds/:guildId/autoresponder", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:autoresponders`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const rawResponders = await getGuildAutoresponders(guildId);
  const responders = rawResponders.map(formatRule);

  // Cache for 20 seconds
  apiCache.set(cacheKey, responders, 20000);
  return c.json(responders);
});

// 2. Fetch Single Autoresponder Rule by ID
autoresponderRoutes.get("/guilds/:guildId/autoresponder/:id", async (c) => {
  const id = c.req.param("id");
  const rule = await getRuleById(Number(id));
  if (!rule) {
    return c.json({ error: "Autoresponder rule not found." }, 404);
  }
  return c.json(formatRule(rule));
});

// Shared validation & normalization function
function parseAndValidateBody(body) {
  const trigger = (body.trigger_phrase || body.trigger || "").trim();
  const reply = (body.reply_content || body.reply || "").trim();
  const matchType = (body.match_type || body.matchMode || body.match_mode || "contains").toLowerCase();
  const isEmbed = body.is_embed !== undefined ? Boolean(body.is_embed) : Boolean(body.isEmbed);
  const embedTitle = (body.embed_title || body.embedTitle || "").trim() || null;
  const imageUrl = (body.image_url || body.imageUrl || "").trim() || null;
  const cooldown = Math.max(0, Number(body.cooldown || 0));
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

  if (!trigger) {
    return { error: "Trigger phrase is required." };
  }

  // Requires at least one action: reply message, embed title, or reaction emoji
  if (!reply && !embedTitle && reactionList.length === 0) {
    return { error: "Please configure a reply message, embed, or at least one reaction emoji." };
  }

  // Regex compilation integrity check
  if (matchType === "regex") {
    try {
      new RegExp(trigger, "i");
    } catch (err) {
      return { error: `Invalid regular expression pattern: ${err.message}` };
    }
  }

  return {
    data: {
      trigger,
      reply,
      matchType,
      isEmbed,
      embedTitle,
      imageUrl,
      cooldown,
      deleteTrigger,
      ignoreBots,
      enabled,
      reactionList,
    },
  };
}

// 3. Autoresponder Create or Update via POST
autoresponderRoutes.post("/guilds/:guildId/autoresponder", async (c) => {
  const guildId = c.req.param("guildId");
  const body = await c.req.json().catch(() => ({}));

  const validation = parseAndValidateBody(body);
  if (validation.error) {
    return c.json({ error: validation.error }, 400);
  }

  const {
    trigger,
    reply,
    matchType,
    isEmbed,
    embedTitle,
    imageUrl,
    cooldown,
    deleteTrigger,
    ignoreBots,
    enabled,
    reactionList,
  } = validation.data;

  const responderId = body.responder_id || body.id;
  let responder;

  if (responderId) {
    await updateAutoresponder(guildId, responderId, {
      trigger_phrase: trigger,
      match_type: matchType,
      reply_content: reply || null,
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
      reply_content: reply || null,
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

  return c.json({
    success: true,
    responder,
    id: responder.responder_id,
    isUpdate: Boolean(responderId),
  });
});

// 4. Update Existing Autoresponder Rule via PUT
autoresponderRoutes.put("/guilds/:guildId/autoresponder/:id", async (c) => {
  const guildId = c.req.param("guildId");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  const validation = parseAndValidateBody(body);
  if (validation.error) {
    return c.json({ error: validation.error }, 400);
  }

  const {
    trigger,
    reply,
    matchType,
    isEmbed,
    embedTitle,
    imageUrl,
    cooldown,
    deleteTrigger,
    ignoreBots,
    enabled,
    reactionList,
  } = validation.data;

  const updated = await updateAutoresponder(guildId, id, {
    trigger_phrase: trigger,
    match_type: matchType,
    reply_content: reply || null,
    is_embed: isEmbed,
    embed_title: embedTitle,
    image_url: imageUrl,
    cooldown,
    delete_trigger: deleteTrigger,
    ignore_bots: ignoreBots,
    enabled,
  });

  if (!updated) {
    return c.json({ error: "Autoresponder rule not found or could not be updated." }, 404);
  }

  await setResponderReactions(id, reactionList);
  apiCache.delete(`guild:${guildId}:autoresponders`);

  return c.json({
    success: true,
    id: Number(id),
    message: "Autoresponder rule updated successfully.",
  });
});

// 5. Toggle Autoresponder Rule Status
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

// 6. Delete Autoresponder Rule
autoresponderRoutes.delete("/guilds/:guildId/autoresponder/:id", async (c) => {
  const guildId = c.req.param("guildId");
  const id = c.req.param("id");
  await clearResponderReactions(id);
  const deleted = await deleteAutoresponder(guildId, id);

  // Invalidate cache
  apiCache.delete(`guild:${guildId}:autoresponders`);
  return c.json({ success: deleted > 0 });
});
