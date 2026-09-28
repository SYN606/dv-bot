import { MediaOnlyChannel } from "../models/index.js";
import { ensureGuild } from "./common.js";

const mediaOnlyCache = new Map();

export function clearMediaOnlyCache(guildId = null) {
  if (guildId) {
    mediaOnlyCache.delete(String(guildId));
  } else {
    mediaOnlyCache.clear();
  }
}

export async function getMediaOnlyChannels(guildId) {
  const gId = String(guildId);
  if (mediaOnlyCache.has(gId)) {
    return mediaOnlyCache.get(gId);
  }

  const records = await MediaOnlyChannel.findAll({
    where: { guild_id: gId },
  });

  mediaOnlyCache.set(gId, records);
  return records;
}

export async function getMediaOnlyChannel(guildId, channelId) {
  const channels = await getMediaOnlyChannels(guildId);
  return channels.find((c) => String(c.channel_id) === String(channelId)) || null;
}

export async function setMediaOnlyChannel(guildId, channelId, options = {}) {
  const gId = String(guildId);
  const cId = String(channelId);
  await ensureGuild(gId);

  const [record, created] = await MediaOnlyChannel.findOrCreate({
    where: { guild_id: gId, channel_id: cId },
    defaults: {
      guild_id: gId,
      channel_id: cId,
      image_only: options.image_only ?? false,
      auto_mute: options.auto_mute ?? false,
      nsfw_bypass: options.nsfw_bypass ?? true,
      whitelist_role_id: options.whitelist_role_id ? String(options.whitelist_role_id) : null,
      sticky_message_id: options.sticky_message_id ? String(options.sticky_message_id) : null,
    },
  });

  if (!created) {
    if (options.image_only !== undefined) record.image_only = Boolean(options.image_only);
    if (options.auto_mute !== undefined) record.auto_mute = Boolean(options.auto_mute);
    if (options.nsfw_bypass !== undefined) record.nsfw_bypass = Boolean(options.nsfw_bypass);
    if (options.whitelist_role_id !== undefined) {
      record.whitelist_role_id = options.whitelist_role_id ? String(options.whitelist_role_id) : null;
    }
    if (options.sticky_message_id !== undefined) {
      record.sticky_message_id = options.sticky_message_id ? String(options.sticky_message_id) : null;
    }
    await record.save();
  }

  clearMediaOnlyCache(gId);
  return record;
}

export async function updateMediaStickyMessageId(guildId, channelId, messageId) {
  const gId = String(guildId);
  const cId = String(channelId);
  const record = await MediaOnlyChannel.findOne({
    where: { guild_id: gId, channel_id: cId },
  });
  if (record) {
    record.sticky_message_id = messageId ? String(messageId) : null;
    await record.save();
    clearMediaOnlyCache(gId);
  }
}

export async function removeMediaOnlyChannel(guildId, channelId) {
  const gId = String(guildId);
  const cId = String(channelId);

  const deleted = await MediaOnlyChannel.destroy({
    where: { guild_id: gId, channel_id: cId },
  });

  clearMediaOnlyCache(gId);
  return deleted > 0;
}

export async function isMediaOnlyChannel(guildId, channelId) {
  const record = await getMediaOnlyChannel(guildId, channelId);
  return !!record;
}
