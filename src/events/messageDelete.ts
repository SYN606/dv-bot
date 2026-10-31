import { Events, type Message } from "discord.js";
import { recordDeletedMessage } from "../services/snipeService.js";
import { sendModLog } from "../utils/modLog.js";
import { extractMediaData, formatMediaFields } from "../utils/mediaLogHelper.js";

export default {
  name: Events.MessageDelete,
  async execute(client: any, message: Message) {
    if (!message || !message.guild) return;

    try {
      recordDeletedMessage(message);
    } catch (err) {
      console.error("[MESSAGE DELETE SNIPE ERROR]:", err);
    }

    // Skip bot deleted messages to prevent self-logging spam
    if (message.author?.bot) return;

    // Skip uncached empty messages with no author and no content
    if (!message.author && !message.content && (!message.attachments || message.attachments.size === 0)) {
      return;
    }

    try {
      const media = extractMediaData(message);
      const mediaFields = formatMediaFields(media);
      const channelName = (message.channel as any)?.name ? `#${(message.channel as any).name}` : "channel";

      const cleanContent = message.content?.trim();
      const truncated = cleanContent
        ? cleanContent.length > 1500
          ? cleanContent.slice(0, 1500) + "..."
          : cleanContent
        : "*[No text content - Media/Attachment only]*";

      const extraFields: Record<string, any> = {
        Channel: `<#${message.channel.id}>`,
        "Message ID": `\`${message.id}\``,
      };

      if (message.createdTimestamp) {
        extraFields["Sent"] = `<t:${Math.floor(message.createdTimestamp / 1000)}:R>`;
      }

      // Merge formatted media fields (Attached Files, Media Links, Stickers)
      Object.assign(extraFields, mediaFields);

      await sendModLog({
        guild: message.guild,
        category: "MESSAGES",
        eventType: "message_deleted",
        title: `Message Deleted in ${channelName}`,
        level: "WARNING",
        target: message.author || null,
        description: `> ${truncated.replace(/\n/g, "\n> ")}`,
        extraFields,
        image: media.previewImageUrl,
      });
    } catch (_) {}
  },
};
