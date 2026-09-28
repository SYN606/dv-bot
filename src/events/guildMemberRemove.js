import { Events } from "discord.js";
import { DailyActivitySnapshot } from "../db/models/index.js";
import { ensureGuild } from "../db/helpers/common.js";

export default {
  name: Events.GuildMemberRemove,
  async execute(client, member) {
    if (!member.guild) return;

    const guildId = String(member.guild.id);
    const today = new Date().toISOString().split("T")[0];

    // Telemetry: Increment daily leaves count
    try {
      await ensureGuild(guildId);
      const [snapshot] = await DailyActivitySnapshot.findOrCreate({
        where: { guild_id: guildId, date: today },
        defaults: { guild_id: guildId, date: today, leaves_count: 1 },
      });
      await snapshot.increment("leaves_count");
    } catch (err) {
      console.error("[MEMBER REMOVE TELEMETRY ERROR]:", err);
    }
  },
};
