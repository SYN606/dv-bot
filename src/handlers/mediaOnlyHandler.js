import { getMediaOnlyChannel } from "../db/helpers/mediaOnly.js";
import { makeEmbed } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";

export async function handleMediaOnly(message) {
  if (!message.guild || message.author.bot) return false;

  const channelConfig = await getMediaOnlyChannel(message.guild.id, message.channel.id);
  if (!channelConfig) return false;

  // Check NSFW bypass
  if (channelConfig.nsfw_bypass && message.channel.nsfw) {
    return false;
  }

  // Check Whitelist role
  if (channelConfig.whitelist_role_id && message.member?.roles.cache.has(String(channelConfig.whitelist_role_id))) {
    return false;
  }

  // Check if message has media attachments or link embeds
  const hasAttachments = message.attachments.size > 0;
  const hasMediaLinks = /(https?:\/\/[^\s]+(?:\.png|\.jpg|\.jpeg|\.gif|\.webp|\.mp4|\.mov|\.webm))/i.test(
    message.content
  );

  if (hasAttachments || hasMediaLinks) {
    return false;
  }

  // Non-media message -> delete
  if (message.deletable) {
    await message.delete().catch(() => {});

    const warning = makeEmbed({
      title: "Media-Only Channel",
      description: `${EMOJIS.get("warning") || "⚠️"} <@${message.author.id}>, only images, videos, and media links are allowed in ${message.channel}.`,
      level: "WARNING",
    });

    const reply = await message.channel.send({ embeds: [warning] }).catch(() => null);
    if (reply) {
      setTimeout(() => reply.delete().catch(() => {}), 6000);
    }
  }

  return true;
}
