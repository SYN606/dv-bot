import { Events, ActivityType } from "discord.js";
import { checkVanityStatus } from "../handlers/supporterHandler.js";

export default {
  name: Events.PresenceUpdate,
  once: false,
  async execute(oldPresence, newPresence) {
    if (!newPresence?.member || !newPresence.guild || newPresence.member.user?.bot) return;

    // Filter out irrelevant presence events (e.g. game activity, Spotify tracks) to avoid rate limits
    const oldCustom = oldPresence?.activities?.find((a) => a.type === ActivityType.Custom)?.state || null;
    const newCustom = newPresence?.activities?.find((a) => a.type === ActivityType.Custom)?.state || null;
    const statusChanged = oldPresence?.status !== newPresence?.status;

    if (oldCustom === newCustom && !statusChanged) {
      return;
    }

    await checkVanityStatus(oldPresence, newPresence);
  },
};
