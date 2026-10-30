import { Events, type Message } from "discord.js";
import { sendModLog } from "../utils/modLog.js";

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
      const truncate = (str: string, len = 500) => (str.length > len ? str.slice(0, len) + "..." : str);

      await sendModLog({
        guild: newMessage.guild,
        category: "MESSAGES",
        title: "Message Edited",
        level: "INFO",
        target: newMessage.author || null,
        description: `**Before:**\n${truncate(oldContent)}\n\n**After:**\n${truncate(newContent)}`,
        extraFields: {
          Channel: `<#${newMessage.channel.id}>`,
          Author: `<@${newMessage.author.id}> (\`${newMessage.author.tag || newMessage.author.username}\`)`,
          "Jump to Message": `[Click to View](${newMessage.url})`,
        },
      });
    } catch (_) {}
  },
};
