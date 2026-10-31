import { Events, type Collection, type Snowflake, type Message } from "discord.js";
import { sendModLog } from "../utils/modLog.js";

export default {
  name: Events.MessageBulkDelete,
  async execute(client: any, messages: Collection<Snowflake, Message>) {
    if (!messages || messages.size === 0) return;

    const firstMsg = messages.first();
    const guild = firstMsg?.guild;
    const channel = firstMsg?.channel;
    if (!guild || !channel) return;

    try {
      const uniqueAuthors = new Set<string>();
      let mediaCount = 0;
      for (const msg of messages.values()) {
        if (msg.author?.id) uniqueAuthors.add(`<@${msg.author.id}>`);
        if (msg.attachments && msg.attachments.size > 0) mediaCount += msg.attachments.size;
      }

      const sampleAuthors = Array.from(uniqueAuthors).slice(0, 5).join(", ");
      const extraAuthors = uniqueAuthors.size > 5 ? ` and ${uniqueAuthors.size - 5} more` : "";

      const extraFields: Record<string, any> = {
        Channel: `<#${channel.id}>`,
        "Total Purged": `${messages.size} message(s)`,
        "Target Authors": sampleAuthors ? `${sampleAuthors}${extraAuthors}` : "*Unknown authors*",
      };

      if (mediaCount > 0) {
        extraFields["Purged Attachments"] = `${mediaCount} attached file(s)`;
      }

      await sendModLog({
        guild,
        category: "MESSAGES",
        eventType: "messages_bulk_deleted",
        title: "Messages Bulk Deleted",
        level: "WARNING",
        description: `**${messages.size}** messages were bulk deleted in <#${channel.id}>.`,
        extraFields,
      });
    } catch (_) {}
  },
};
