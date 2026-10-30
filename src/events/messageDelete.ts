import { Events, type Message } from "discord.js";
import { recordDeletedMessage } from "../services/snipeService.js";
import { sendModLog } from "../utils/modLog.js";

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

    try {
      const attachmentsCount = message.attachments?.size || 0;
      const extraFields: Record<string, any> = {
        Channel: `<#${message.channel.id}>`,
        Author: message.author ? `<@${message.author.id}> (\`${message.author.tag || message.author.username}\`)` : "*Unknown Author*",
      };

      if (attachmentsCount > 0) {
        extraFields["Attachments"] = `${attachmentsCount} attached file(s)`;
      }

      await sendModLog({
        guild: message.guild,
        category: "MESSAGES",
        title: "Message Deleted",
        level: "WARNING",
        target: message.author || null,
        description: message.content ? `**Deleted Content:**\n${message.content.length > 800 ? message.content.slice(0, 800) + "..." : message.content}` : "*[No text content - Media/attachment only]*",
        extraFields,
      });
    } catch (_) {}
  },
};
