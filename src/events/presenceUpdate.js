import { Events } from "discord.js";
import { checkVanityStatus } from "../handlers/supporterHandler.js";

export default {
  name: Events.PresenceUpdate,
  once: false,
  async execute(oldPresence, newPresence) {
    await checkVanityStatus(oldPresence, newPresence);
  },
};
