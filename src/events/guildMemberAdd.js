import { Events } from "discord.js";
import { VerificationConfig, DailyActivitySnapshot } from "../db/models/index.js";
import { ensureGuild } from "../db/helpers/common.js";

export default {
  name: Events.GuildMemberAdd,
  async execute(client, member) {
    if (!member.guild) return;

    const guildId = String(member.guild.id);
    const today = new Date().toISOString().split("T")[0];

    // 1. Telemetry: Increment daily joins count
    try {
      await ensureGuild(guildId);
      const [snapshot] = await DailyActivitySnapshot.findOrCreate({
        where: { guild_id: guildId, date: today },
        defaults: { guild_id: guildId, date: today, joins_count: 1 },
      });
      await snapshot.increment("joins_count");
    } catch (err) {
      console.error("[MEMBER ADD TELEMETRY ERROR]:", err);
    }

    // 2. Automated Verification Gate: Assign Unverified Role
    try {
      const config = await VerificationConfig.findByPk(guildId);
      if (config && config.enabled && config.unverified_role_id) {
        const unverifiedRole = member.guild.roles.cache.get(String(config.unverified_role_id));
        const botMember = member.guild.members.me;

        if (unverifiedRole && botMember && unverifiedRole.position < botMember.roles.highest.position) {
          await member.roles.add(unverifiedRole, "Automatic verification gate: assigned unverified role on join").catch(() => {});
        }
      }
    } catch (err) {
      console.error("[AUTO-UNVERIFIED ROLE ERROR]:", err);
    }
  },
};
