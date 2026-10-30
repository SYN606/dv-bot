import { Events } from "discord.js";
import { DailyActivitySnapshot, MemberAnalytics, WelcomeConfig } from "../db/models/index.js";
import { ensureGuild } from "../db/helpers/common.js";
import { deleteSupporterAnnouncement } from "../handlers/supporterHandler.js";
import { buildWelcomePayload } from "../utils/welcomeFormatter.js";
import { sendModLog } from "../utils/modLog.js";
import { clearMemberWelcomeCache } from "../services/welcomeService.js";

export default {
  name: Events.GuildMemberRemove,
  async execute(client, member) {
    if (!member.guild) return;

    const guildId = String(member.guild.id);
    const userId = String(member.id);
    const today = new Date().toISOString().split("T")[0];

    // Telemetry: Increment daily leaves count
    clearMemberWelcomeCache(guildId, userId);
    try {
      await ensureGuild(guildId);
      const [snapshot]: any = await DailyActivitySnapshot.findOrCreate({
        where: { guild_id: guildId, date: today },
        defaults: { guild_id: guildId, date: today, leaves_count: 0 },
      });
      await snapshot.increment("leaves_count");
    } catch (err) {
      console.error("[MEMBER REMOVE TELEMETRY ERROR]:", err);
    }

    // Update member status in MemberAnalytics
    try {
      const memberRecord = await MemberAnalytics.findOne({
        where: { guild_id: guildId, user_id: userId },
      });
      if (memberRecord) {
        memberRecord.is_active = false;
        memberRecord.left_at = new Date().toISOString();
        await memberRecord.save();
      }
    } catch (err) {
      console.error("[MEMBER REMOVE ANALYTICS ERROR]:", err);
    }

    // Supporter announcement cleanup on leave
    try {
      await Promise.allSettled([
        deleteSupporterAnnouncement(member.guild, userId, "clan"),
        deleteSupporterAnnouncement(member.guild, userId, "vanity"),
      ]);
    } catch (_) {}

    // Welcome & Leave Gatekeeper: Goodbye / Leave Dispatch
    try {
      const welcomeCfg = await WelcomeConfig.findByPk(guildId);
      if (welcomeCfg && welcomeCfg.leave_enabled && welcomeCfg.leave_channel_id) {
        let leaveChannel = member.guild.channels.cache.get(String(welcomeCfg.leave_channel_id));
        if (!leaveChannel && member.guild.channels.fetch) {
          leaveChannel = await member.guild.channels.fetch(String(welcomeCfg.leave_channel_id)).catch(() => null);
        }

        if (leaveChannel && leaveChannel.isTextBased()) {
          const payload = buildWelcomePayload(welcomeCfg, member, "leave");
          if (payload) {
            await leaveChannel.send(payload).catch((err) => {
              console.error("[LEAVE CHANNEL SEND ERROR]:", err);
            });
          }
        }
      }
    } catch (err) {
      console.error("[LEAVE GATEKEEPER ERROR]:", err);
    }

    // Mod Log: Member Left Dispatch
    try {
      const joinedAgo = member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "*Unknown*";
      const rolesList = member.roles?.cache
        ? member.roles.cache.filter((r: any) => r.id !== member.guild.id).map((r: any) => `<@&${r.id}>`).slice(0, 8).join(", ")
        : null;

      await sendModLog({
        guild: member.guild,
        category: "MEMBERS",
        title: "Member Left",
        level: "INFO",
        target: member.user || null,
        description: `<@${member.id}> has left the server.`,
        extraFields: {
          "Joined Server": joinedAgo,
          "Roles Held": rolesList || "*None*",
          "Remaining Members": `${member.guild.memberCount || "N/A"} members`,
        },
      });
    } catch (_) {}
  },
};
