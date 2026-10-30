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
      for (const msg of messages.values()) {
        if (msg.author?.id) uniqueAuthors.add(`<@${msg.author.id}>`);
      }

      const sampleAuthors = Array.from(uniqueAuthors).slice(0, 5).join(", ");
      const extraAuthors = uniqueAuthors.size > 5 ? ` and ${uniqueAuthors.size - 5} more` : "";

      await sendModLog({
        guild,
        category: "MESSAGES",
        title: "Messages Bulk Deleted",
        level: "WARNING",
        description: `**${messages.size}** messages were bulk deleted in <#${channel.id}>.`,
        extraFields: {
          Channel: `<#${channel.id}>`,
          "Total Purged": `${messages.size} messages`,
          "Target Authors": sampleAuthors ? `${sampleAuthors}${extraAuthors}` : "*Unknown authors*",
        },
      });
    } catch (_) {}
  },
};
