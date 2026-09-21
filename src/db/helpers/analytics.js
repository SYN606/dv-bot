import { MemberAnalytics, ChannelActivity, DailyActivitySnapshot, HourlyActivity } from "../models/index.js";
import { ensureGuildAndUser } from "./common.js";

export async function getMemberAnalytics(guildId, userId) {
  const [record] = await MemberAnalytics.findOrCreate({
    where: {
      guild_id: String(guildId),
      user_id: String(userId),
    },
    defaults: {
      guild_id: String(guildId),
      user_id: String(userId),
      total_messages: 0,
      weekly_messages: 0,
      total_vc_seconds: 0,
      weekly_vc_seconds: 0,
      is_active: true,
    },
  });
  return record;
}

export async function incrementMessageCount(guildId, userId, count = 1) {
  const gId = String(guildId);
  const uId = String(userId);
  await ensureGuildAndUser(gId, uId);

  const record = await getMemberAnalytics(gId, uId);
  record.total_messages = Number(record.total_messages) + count;
  record.weekly_messages = Number(record.weekly_messages) + count;
  record.last_active_at = new Date();
  await record.save();
}

export async function incrementVoiceTime(guildId, userId, seconds) {
  const gId = String(guildId);
  const uId = String(userId);
  await ensureGuildAndUser(gId, uId);

  const record = await getMemberAnalytics(gId, uId);
  record.total_vc_seconds = Number(record.total_vc_seconds) + seconds;
  record.weekly_vc_seconds = Number(record.weekly_vc_seconds) + seconds;
  record.last_active_at = new Date();
  await record.save();
}

export async function getLeaderboard(guildId, type = "messages", timeframe = "total", limit = 10) {
  const field = `${timeframe === "weekly" ? "weekly" : "total"}_${type === "vc" ? "vc_seconds" : "messages"}`;
  return await MemberAnalytics.findAll({
    where: {
      guild_id: String(guildId),
      is_active: true,
    },
    order: [[field, "DESC"]],
    limit,
  });
}
