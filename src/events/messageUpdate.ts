import { Events, type Message } from "discord.js";
import { sendModLog } from "../utils/modLog.js";
import { extractMediaData, formatMediaFields } from "../utils/mediaLogHelper.js";

export default {
  name: Events.MessageUpdate,
  async execute(client: any, oldMessage: Message, newMessage: Message) {
    if (!newMessage || !newMessage.guild) return;
    if (newMessage.author?.bot) return;

    // Ignore if content did not change (e.g. embed preview loaded, pin status changed)
    const oldContent = oldMessage?.content ? oldMessage.content.trim() : "";
    const newContent = newMessage?.content ? newMessage.content.trim() : "";

    if (!oldContent || !newContent || oldContent === newContent) return;

    try {
      const truncate = (str: string, len = 900) => (str.length > len ? str.slice(0, len) + "..." : str);
      const newMedia = extractMediaData(newMessage);
      const mediaFields = formatMediaFields(newMedia);
      const channelName = (newMessage.channel as any)?.name ? `#${(newMessage.channel as any).name}` : "channel";

      const extraFields: Record<string, any> = {
        Channel: `<#${newMessage.channel.id}>`,
        "Message ID": `\`${newMessage.id}\``,
        "Jump to Message": `[Click to View](${newMessage.url})`,
      };

      if (newMessage.createdTimestamp) {
        extraFields["Originally Sent"] = `<t:${Math.floor(newMessage.createdTimestamp / 1000)}:R>`;
      }

      // Add media fields if updated message has media
      Object.assign(extraFields, mediaFields);

      await sendModLog({
        guild: newMessage.guild,
        category: "MESSAGES",
        eventType: "message_edited",
        title: `Message Edited in ${channelName}`,
        level: "INFO",
        target: newMessage.author || null,
        description: `**Before:**\n> ${truncate(oldContent).replace(/\n/g, "\n> ")}\n\n**After:**\n> ${truncate(newContent).replace(/\n/g, "\n> ")}`,
        extraFields,
        image: newMedia.previewImageUrl,
      });
    } catch (_) {}
  },
};
