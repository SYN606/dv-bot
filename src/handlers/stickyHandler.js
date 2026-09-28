import { getStickyMessage, updateStickyLastMessage } from "../db/helpers/sticky.js";
import { makeEmbed } from "../core/embeds.js";
import { EMOJIS } from "../core/emojis.js";
import { dispatchStickyNotice } from "../utils/webhookManager.js";

const COMMAND_PREFIXES = ["!", "/", ".", "dv "];
const IMAGE_URL_REGEX = /(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S+)?)/i;

export async function handleSticky(message) {
  if (!message.guild || message.author.bot) return;

  // Ignore bot command invocations so commands don't cause sticky reposition loops
  if (message.content && COMMAND_PREFIXES.some((p) => message.content.startsWith(p))) {
    return;
  }

  const guildId = message.guild.id;
  const channelId = message.channel.id;

  const sticky = await getStickyMessage(guildId, channelId);
  if (!sticky || !sticky.sticky_content) return;

  const lastMsgId = sticky.last_message_id ? String(sticky.last_message_id) : null;

  // Don't re-send if the last message in the channel is already the sticky message
  if (lastMsgId && lastMsgId === message.id) return;

  try {
    // Extract image URL if present in sticky content
    const imgMatch = sticky.sticky_content.match(IMAGE_URL_REGEX);
    const imageUrl = imgMatch ? imgMatch[1] : null;
    const cleanText = imageUrl ? sticky.sticky_content.replace(imageUrl, "").trim() : sticky.sticky_content;

    const embed = makeEmbed({
      title: "📌 Sticky Message",
      description: cleanText ? `${EMOJIS.get("announcement") || "📌"} ${cleanText}` : "📌 **Sticky Notice**",
      image: imageUrl,
      level: "SYSTEM",
    });

    const newMsgId = await dispatchStickyNotice({
      channel: message.channel,
      embed,
      lastMessageId: lastMsgId,
      minCooldownMs: 3000,
    });

    if (newMsgId && newMsgId !== lastMsgId) {
      await updateStickyLastMessage(guildId, channelId, newMsgId);
    }
  } catch (err) {
    console.error(`[STICKY ERROR] Channel ${channelId}:`, err);
  }
}
