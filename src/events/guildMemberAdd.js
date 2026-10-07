import { Events } from "discord.js";
import { VerificationConfig, DailyActivitySnapshot, TempbanRecord, AutoRoleConfig } from "../db/models/index.js";
import { getTempbanConfig } from "../db/helpers/tempban.js";
import { ensureGuild } from "../db/helpers/common.js";
import { checkMemberSupporter } from "../handlers/supporterHandler.js";

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
        defaults: { guild_id: guildId, date: today, joins_count: 0 },
      });
      await snapshot.increment("joins_count");
    } catch (err) {
      console.error("[MEMBER ADD TELEMETRY ERROR]:", err);
    }

    // 2. Security Check: Re-apply Tempban Isolation Role if active
    try {
      const activeTempban = await TempbanRecord.findOne({
        where: { guild_id: guildId, user_id: String(member.id), active: true },
      });
      if (activeTempban) {
        const tempbanCfg = await getTempbanConfig(guildId);
        if (tempbanCfg && tempbanCfg.role_id) {
          const isolationRole = member.guild.roles.cache.get(String(tempbanCfg.role_id));
          const botMember = member.guild.members.me;
          if (isolationRole && botMember && isolationRole.position < botMember.roles.highest.position) {
            await member.roles.add(isolationRole, "Security enforcement: active tempban isolation re-applied on join").catch(() => {});
            return; // Do not assign unverified or standard roles to actively tempbanned users
          }
        }
      }
    } catch (err) {
      console.error("[TEMPBAN RE-APPLY ERROR]:", err);
    }

    // 3. Automated Verification Gate: Assign Unverified Role
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

    // 4. Default Auto-Role on Join (Server Welcome / Member Role)
    try {
      const autoRole = await AutoRoleConfig.findByPk(guildId);
      if (autoRole && autoRole.role_id) {
        const role = member.guild.roles.cache.get(String(autoRole.role_id));
        const botMember = member.guild.members.me;
        if (role && botMember && role.position < botMember.roles.highest.position) {
          await member.roles.add(role, "Auto-Role: automatically assigned on server join").catch(() => {});
        }
      }
    } catch (err) {
      console.error("[AUTO-ROLE ON JOIN ERROR]:", err);
    }

    // 5. Supporter Rewards Check on Join (Clan Tag & Vanity Status)
    try {
      await checkMemberSupporter(member);
    } catch (_) {}
  },
};
