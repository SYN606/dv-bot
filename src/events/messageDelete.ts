import { Events, type Message } from "discord.js";
import { recordDeletedMessage } from "../services/snipeService.js";

export default {
  name: Events.MessageDelete,
  async execute(client: any, message: Message) {
    if (!message || !message.guild) return;

    try {
      recordDeletedMessage(message);
    } catch (err) {
      console.error("[MESSAGE DELETE SNIPE ERROR]:", err);
    }
  },
};
