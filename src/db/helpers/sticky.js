import { StickyMessage } from "../models/index.js";
import { ensureGuild } from "./common.js";

export async function getStickyMessage(guildId, channelId) {
  return await StickyMessage.findOne({
    where: {
      guild_id: String(guildId),
      channel_id: String(channelId),
    },
  });
}

export async function setStickyMessage(guildId, channelId, content) {
  await ensureGuild(guildId);
  const [record, created] = await StickyMessage.findOrCreate({
    where: {
      guild_id: String(guildId),
      channel_id: String(channelId),
    },
    defaults: {
      guild_id: String(guildId),
      channel_id: String(channelId),
      sticky_content: content,
      counter: 0,
    },
  });

  if (!created) {
    record.sticky_content = content;
    record.counter = 0;
    await record.save();
  }

  return record;
}

export async function removeStickyMessage(guildId, channelId) {
  const deleted = await StickyMessage.destroy({
    where: {
      guild_id: String(guildId),
      channel_id: String(channelId),
    },
  });
  return deleted > 0;
}

export async function updateStickyLastMessage(guildId, channelId, messageId) {
  const record = await getStickyMessage(guildId, channelId);
  if (record) {
    record.last_message_id = String(messageId);
    record.counter = (record.counter || 0) + 1;
    await record.save();
  }
}
