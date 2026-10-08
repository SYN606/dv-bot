import crypto from "node:crypto";
import { MessageDraft, MessageTemplate, MessageHistory } from "../models/index.js";
import { ensureGuild } from "./common.js";

function safeJsonParse(val, fallback = null) {
  if (!val) return fallback;
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function safeJsonStringify(val, fallback = "[]") {
  if (val === undefined || val === null) return fallback;
  if (typeof val === "string") return val;
  try {
    return JSON.stringify(val);
  } catch {
    return fallback;
  }
}

function formatDraft(record) {
  if (!record) return null;
  const raw = typeof record.toJSON === "function" ? record.toJSON() : { ...record };
  return {
    ...raw,
    embeds: safeJsonParse(raw.embeds, []),
    attachments: safeJsonParse(raw.attachments, []),
    reply_config: safeJsonParse(raw.reply_config, {}),
    mention_config: safeJsonParse(raw.mention_config, {}),
  };
}

function formatTemplate(record) {
  if (!record) return null;
  const raw = typeof record.toJSON === "function" ? record.toJSON() : { ...record };
  return {
    ...raw,
    embeds: safeJsonParse(raw.embeds, []),
    attachments: safeJsonParse(raw.attachments, []),
    mention_config: safeJsonParse(raw.mention_config, {}),
  };
}

function formatHistory(record) {
  if (!record) return null;
  const raw = typeof record.toJSON === "function" ? record.toJSON() : { ...record };
  return {
    ...raw,
    payload: safeJsonParse(raw.payload, {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Draft Operations
// ─────────────────────────────────────────────────────────────────────────────

export async function listDrafts(guildId) {
  const gId = String(guildId);
  await ensureGuild(gId);
  const rows = await MessageDraft.findAll({
    where: { guild_id: gId },
    order: [["updated_at", "DESC"]],
  });
  return rows.map(formatDraft);
}

export async function getDraft(guildId, draftId) {
  const gId = String(guildId);
  const dId = String(draftId);
  const record = await MessageDraft.findOne({
    where: { guild_id: gId, id: dId },
  });
  return formatDraft(record);
}

export async function saveDraft(guildId, draftData, userId = null) {
  const gId = String(guildId);
  await ensureGuild(gId);

  const draftId = draftData.id ? String(draftData.id) : crypto.randomUUID();
  const existing = await MessageDraft.findOne({
    where: { guild_id: gId, id: draftId },
  });

  const payload = {
    guild_id: gId,
    name: draftData.name ? String(draftData.name).slice(0, 100) : "Untitled Message",
    mode: ["normal", "embed", "hybrid"].includes(draftData.mode) ? draftData.mode : "normal",
    content: draftData.content !== undefined ? String(draftData.content || "") : "",
    embeds: safeJsonStringify(draftData.embeds, "[]"),
    attachments: safeJsonStringify(draftData.attachments, "[]"),
    channel_id: draftData.channel_id ? String(draftData.channel_id) : null,
    reply_config: safeJsonStringify(draftData.reply_config, "{}"),
    mention_config: safeJsonStringify(draftData.mention_config, "{}"),
    created_by: userId ? String(userId) : (existing?.created_by || null),
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // Optimistic concurrency check if expectedRevision was supplied
    if (
      draftData.expectedRevision !== undefined &&
      existing.revision !== undefined &&
      Number(draftData.expectedRevision) !== Number(existing.revision)
    ) {
      return {
        conflict: true,
        currentDraft: formatDraft(existing),
      };
    }

    const nextRevision = (Number(existing.revision) || 1) + 1;
    payload.revision = nextRevision;

    if (typeof existing.update === "function") {
      await existing.update(payload);
    } else {
      Object.assign(existing, payload);
      await existing.save?.();
    }
    return { draft: formatDraft(existing) };
  } else {
    payload.id = draftId;
    payload.revision = 1;
    payload.created_at = new Date().toISOString();
    const created = await MessageDraft.create(payload);
    return { draft: formatDraft(created) };
  }
}

export async function deleteDraft(guildId, draftId) {
  const gId = String(guildId);
  const dId = String(draftId);
  const existing = await MessageDraft.findOne({
    where: { guild_id: gId, id: dId },
  });
  if (!existing) return false;
  await existing.destroy();
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Operations
// ─────────────────────────────────────────────────────────────────────────────

export async function listTemplates(guildId, { category = null, search = "" } = {}) {
  const gId = String(guildId);
  await ensureGuild(gId);

  const rows = await MessageTemplate.findAll({
    where: { guild_id: gId },
    order: [["name", "ASC"]],
  });

  let templates = rows.map(formatTemplate);

  if (category && category !== "All") {
    templates = templates.filter(
      (t) => String(t.category).toLowerCase() === String(category).toLowerCase()
    );
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    templates = templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.category && t.category.toLowerCase().includes(q))
    );
  }

  return templates;
}

export async function getTemplate(guildId, templateId) {
  const gId = String(guildId);
  const tId = String(templateId);
  const record = await MessageTemplate.findOne({
    where: { guild_id: gId, id: tId },
  });
  return formatTemplate(record);
}

export async function createTemplate(guildId, templateData, userId = null) {
  const gId = String(guildId);
  await ensureGuild(gId);

  const templateId = templateData.id ? String(templateData.id) : crypto.randomUUID();
  const payload = {
    id: templateId,
    guild_id: gId,
    name: templateData.name ? String(templateData.name).slice(0, 100) : "Reusable Template",
    description: templateData.description ? String(templateData.description).slice(0, 250) : "",
    category: templateData.category ? String(templateData.category).slice(0, 50) : "General",
    mode: ["normal", "embed", "hybrid"].includes(templateData.mode) ? templateData.mode : "normal",
    content: templateData.content !== undefined ? String(templateData.content || "") : "",
    embeds: safeJsonStringify(templateData.embeds, "[]"),
    attachments: safeJsonStringify(templateData.attachments, "[]"),
    mention_config: safeJsonStringify(templateData.mention_config, "{}"),
    created_by: userId ? String(userId) : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const created = await MessageTemplate.create(payload);
  return formatTemplate(created);
}

export async function updateTemplate(guildId, templateId, templateData) {
  const gId = String(guildId);
  const tId = String(templateId);
  const existing = await MessageTemplate.findOne({
    where: { guild_id: gId, id: tId },
  });
  if (!existing) return null;

  const payload = {
    updated_at: new Date().toISOString(),
  };

  if (templateData.name !== undefined) payload.name = String(templateData.name).slice(0, 100);
  if (templateData.description !== undefined) payload.description = String(templateData.description).slice(0, 250);
  if (templateData.category !== undefined) payload.category = String(templateData.category).slice(0, 50);
  if (templateData.mode !== undefined) payload.mode = templateData.mode;
  if (templateData.content !== undefined) payload.content = String(templateData.content || "");
  if (templateData.embeds !== undefined) payload.embeds = safeJsonStringify(templateData.embeds, "[]");
  if (templateData.attachments !== undefined) payload.attachments = safeJsonStringify(templateData.attachments, "[]");
  if (templateData.mention_config !== undefined) payload.mention_config = safeJsonStringify(templateData.mention_config, "{}");

  if (typeof existing.update === "function") {
    await existing.update(payload);
  } else {
    Object.assign(existing, payload);
    await existing.save?.();
  }

  return formatTemplate(existing);
}

export async function duplicateTemplate(guildId, templateId, userId = null) {
  const original = await getTemplate(guildId, templateId);
  if (!original) return null;

  const cloneData = {
    name: `Copy of ${original.name}`.slice(0, 100),
    description: original.description,
    category: original.category,
    mode: original.mode,
    content: original.content,
    embeds: original.embeds,
    attachments: original.attachments,
    mention_config: original.mention_config,
  };

  return await createTemplate(guildId, cloneData, userId);
}

export async function deleteTemplate(guildId, templateId) {
  const gId = String(guildId);
  const tId = String(templateId);
  const existing = await MessageTemplate.findOne({
    where: { guild_id: gId, id: tId },
  });
  if (!existing) return false;
  await existing.destroy();
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// History Operations
// ─────────────────────────────────────────────────────────────────────────────

export async function recordHistory(guildId, data) {
  const gId = String(guildId);
  await ensureGuild(gId);

  const payload = {
    id: data.id || crypto.randomUUID(),
    guild_id: gId,
    message_id: data.message_id ? String(data.message_id) : null,
    channel_id: String(data.channel_id),
    user_id: data.user_id ? String(data.user_id) : null,
    source_type: data.source_type || "direct",
    source_id: data.source_id ? String(data.source_id) : null,
    payload: safeJsonStringify(data.payload, "{}"),
    status: data.status || "delivered",
    error_message: data.error_message ? String(data.error_message).slice(0, 500) : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const created = await MessageHistory.create(payload);
  return formatHistory(created);
}

export async function listHistory(guildId, { limit = 50, offset = 0 } = {}) {
  const gId = String(guildId);
  await ensureGuild(gId);

  const safeLimit = Math.min(Math.max(1, Number(limit) || 50), 100);
  const safeOffset = Math.max(0, Number(offset) || 0);

  const rows = await MessageHistory.findAll({
    where: { guild_id: gId },
    order: [["created_at", "DESC"]],
    limit: safeLimit,
    offset: safeOffset,
  });

  return rows.map(formatHistory);
}

export async function getHistoryEntry(guildId, historyId) {
  const gId = String(guildId);
  const hId = String(historyId);
  const row = await MessageHistory.findOne({
    where: { guild_id: gId, id: hId },
  });
  return formatHistory(row);
}

export async function updateHistoryStatus(guildId, identifier, status, { errorMessage = null } = {}) {
  const gId = String(guildId);
  const idStr = String(identifier);

  // Check by history primary key first, then fallback to Discord message_id
  let row = await MessageHistory.findOne({
    where: { guild_id: gId, id: idStr },
  });

  if (!row) {
    row = await MessageHistory.findOne({
      where: { guild_id: gId, message_id: idStr },
    });
  }

  if (!row) return null;

  const updates = {
    status: String(status),
    updated_at: new Date().toISOString(),
  };
  if (errorMessage !== null) {
    updates.error_message = errorMessage ? String(errorMessage).slice(0, 500) : null;
  }

  if (typeof row.update === "function") {
    await row.update(updates);
  } else {
    Object.assign(row, updates);
    await row.save?.();
  }

  return formatHistory(row);
}
