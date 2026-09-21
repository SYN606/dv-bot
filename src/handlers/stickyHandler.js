import { getStickyMessage, updateStickyLastMessage } from "../db/helpers/sticky.js";
import { makeEmbed } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";

const stickyLocks = new Set();

export async function handleSticky(message) {
  if (!message.guild || message.author.bot) return;

  const guildId = message.guild.id;
  const channelId = message.channel.id;
  const lockKey = `${guildId}:${channelId}`;

  if (stickyLocks.has(lockKey)) return;

  const sticky = await getStickyMessage(guildId, channelId);
  if (!sticky || !sticky.sticky_content) return;

  // Don't re-send if the last message in the channel is already the sticky message
  if (sticky.last_message_id && sticky.last_message_id === message.id) return;

  stickyLocks.add(lockKey);

  try {
    // Delete the previous sticky message if it exists
    if (sticky.last_message_id) {
      const prevMsg = await message.channel.messages.fetch(sticky.last_message_id).catch(() => null);
      if (prevMsg) {
        await prevMsg.delete().catch(() => {});
      }
    }

    // Send new sticky message
    const embed = makeEmbed({
      title: "Pinned Notice",
      description: `${EMOJIS.get("announcement") || "📌"} ${sticky.sticky_content}`,
      level: "SYSTEM",
    });

    const newMsg = await message.channel.send({ embeds: [embed] }).catch(() => null);
    if (newMsg) {
      await updateStickyLastMessage(guildId, channelId, newMsg.id);
    }
  } finally {
    stickyLocks.delete(lockKey);
  }
}
