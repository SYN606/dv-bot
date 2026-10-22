import { Events } from "discord.js";
import { checkGuildTag } from "../handlers/supporterHandler.js";

export default {
  name: Events.UserUpdate,
  once: false,
  async execute(client, oldUser, newUser) {
    if (!oldUser || !newUser) return;
    const oldClan = oldUser.primaryGuild || oldUser.primary_guild || oldUser.clan;
    const newClan = newUser.primaryGuild || newUser.primary_guild || newUser.clan;

    if (JSON.stringify(oldClan) === JSON.stringify(newClan)) return;

    // We must find which guilds this user is in to trigger the check
    const botClient = client || newUser.client;
    if (!botClient?.guilds?.cache) return;
    const memberGuilds = botClient.guilds.cache.filter((g) => g.members.cache.has(newUser.id));
    
    for (const guild of memberGuilds.values()) {
      const member = guild.members.cache.get(newUser.id);
      if (member) {
        await checkGuildTag(member);
      }
    }
  },
};
