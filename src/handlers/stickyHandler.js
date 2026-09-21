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

  const lastMsgId = sticky.last_message_id ? String(sticky.last_message_id) : null;

  // Don't re-send if the last message in the channel is already the sticky message
  if (lastMsgId && lastMsgId === message.id) return;

  stickyLocks.add(lockKey);

  try {
    // Delete the previous sticky message if it exists
    if (lastMsgId && /^\d{17,20}$/.test(lastMsgId)) {
      try {
        const prevMsg = await message.channel.messages.fetch(lastMsgId).catch(() => null);
        if (prevMsg && typeof prevMsg.delete === "function" && prevMsg.id === lastMsgId) {
          await prevMsg.delete();
        }
      } catch {
        // Message already deleted or missing permissions, ignore safely
      }
    }

    // Send new sticky message
    const embed = makeEmbed({
      title: "Pinned Notice",
      description: `${EMOJIS.get("announcement") || "📌"} ${sticky.sticky_content}`,
      level: "SYSTEM",
    });

    const newMsg = await message.channel.send({ embeds: [embed] }).catch(() => null);
    if (newMsg && newMsg.id) {
      await updateStickyLastMessage(guildId, channelId, newMsg.id);
    }
  } catch (err) {
    console.error(`[STICKY ERROR] Channel ${channelId}:`, err);
  } finally {
    stickyLocks.delete(lockKey);
  }
}
