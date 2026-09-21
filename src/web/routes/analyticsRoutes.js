import { Hono } from "hono";
import { Op } from "sequelize";
import { DailyActivitySnapshot } from "../../db/models/index.js";
import { getLeaderboard } from "../../db/helpers/analytics.js";
import { apiCache } from "./cache.js";

export const analyticsRoutes = new Hono();

// Analytics Telemetry & Leaderboards
analyticsRoutes.get("/guilds/:guildId/analytics", async (c) => {
  const guildId = c.req.param("guildId");
  const cacheKey = `guild:${guildId}:analytics`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const botGuild = c.get("botGuild");

  // Get last 7 days of dates (YYYY-MM-DD)
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }

  // Fetch daily snapshots
  const snapshots = await DailyActivitySnapshot.findAll({
    where: {
      guild_id: String(guildId),
      date: { [Op.in]: days },
    },
    order: [["date", "ASC"]],
  });

  const snapshotMap = new Map(snapshots.map((s) => [s.date, s]));
  const timeline = days.map((date) => {
    const s = snapshotMap.get(date);
    return {
      date,
      messages: Number(s?.total_messages || 0),
      vc_minutes: Math.round(Number(s?.total_vc_seconds || 0) / 60),
      voiceMinutes: Math.round(Number(s?.total_vc_seconds || 0) / 60),
      joins: Number(s?.joins_count || 0),
      leaves: Number(s?.leaves_count || 0),
    };
  });

  // Top Chatters & Top Voice Members
  const [topChattersRaw, topVoiceRaw] = await Promise.all([
    getLeaderboard(guildId, "messages", "total", 5),
    getLeaderboard(guildId, "vc", "total", 5),
  ]);

  const topChatters = topChattersRaw.map((m) => {
    const member = botGuild?.members.cache.get(String(m.user_id));
    return {
      userId: String(m.user_id),
      username: member?.user?.username || `User ${m.user_id}`,
      avatar: member?.user?.displayAvatarURL?.() || null,
      messages: Number(m.total_messages || 0),
      count: Number(m.total_messages || 0),
    };
  });

  const topVoice = topVoiceRaw.map((m) => {
    const member = botGuild?.members.cache.get(String(m.user_id));
    return {
      userId: String(m.user_id),
      username: member?.user?.username || `User ${m.user_id}`,
      avatar: member?.user?.displayAvatarURL?.() || null,
      vcMinutes: Math.round(Number(m.total_vc_seconds || 0) / 60),
      minutes: Math.round(Number(m.total_vc_seconds || 0) / 60),
    };
  });

  const payload = { timeline, topChatters, topVoice };

  // Cache for 60 seconds
  apiCache.set(cacheKey, payload, 60000);

  return c.json(payload);
});
