import { StickyMessage } from "../models/index.js";
import { ensureGuild } from "./common.js";

// In-memory zero-query filter and sticky cache
const stickyChannelIds = new Set();
const stickyCache = new Map();

export async function initStickyCache() {
  try {
    const records = await StickyMessage.findAll();
    stickyChannelIds.clear();
    stickyCache.clear();
    for (const r of records) {
      const cId = String(r.channel_id);
      stickyChannelIds.add(cId);
      stickyCache.set(cId, r);
    }
  } catch (err) {
    console.error("[STICKY CACHE INIT ERROR]:", err);
  }
}

export async function getStickyMessage(guildId, channelId) {
  const cId = String(channelId);
  // Fast path: 0ms lookup without DB query for channels with no sticky message
  if (!stickyChannelIds.has(cId)) {
    return null;
  }

  if (stickyCache.has(cId)) {
    return stickyCache.get(cId);
  }

  const record = await StickyMessage.findOne({
    where: {
      guild_id: String(guildId),
      channel_id: cId,
    },
  });

  if (record) {
    stickyCache.set(cId, record);
  } else {
    stickyChannelIds.delete(cId);
  }

  return record;
}

export async function setStickyMessage(guildId, channelId, content) {
  const gId = String(guildId);
  const cId = String(channelId);

  await ensureGuild(gId);
  const [record, created] = await StickyMessage.findOrCreate({
    where: {
      guild_id: gId,
      channel_id: cId,
    },
    defaults: {
      guild_id: gId,
      channel_id: cId,
      sticky_content: content,
      counter: 0,
    },
  });

  if (!created) {
    record.sticky_content = content;
    record.counter = 0;
    await record.save();
  }

  stickyChannelIds.add(cId);
  stickyCache.set(cId, record);

  return record;
}

export async function removeStickyMessage(guildId, channelId) {
  const gId = String(guildId);
  const cId = String(channelId);

  const deleted = await StickyMessage.destroy({
    where: {
      guild_id: gId,
      channel_id: cId,
    },
  });

  stickyChannelIds.delete(cId);
  stickyCache.delete(cId);

  return deleted > 0;
}

export async function updateStickyLastMessage(guildId, channelId, messageId) {
  const cId = String(channelId);
  const record = await getStickyMessage(guildId, cId);
  if (record) {
    record.last_message_id = String(messageId);
    record.counter = (record.counter || 0) + 1;
    await record.save();
    stickyCache.set(cId, record);
  }
}
