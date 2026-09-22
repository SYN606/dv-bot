import { Hono } from "hono";
import { Op } from "sequelize";
import { DailyActivitySnapshot } from "../../db/models/index.js";
import {
  getLeaderboard,
  getServerRetentionStats,
  getChannelBreakdown,
  getHourlyDistribution,
} from "../../db/helpers/analytics.js";
import { apiCache } from "./cache.js";

export const analyticsRoutes = new Hono();

// Detailed Analytics Telemetry, Server Insights & Leaderboards
analyticsRoutes.get("/guilds/:guildId/analytics", async (c) => {
  const guildId = c.req.param("guildId");
  const daysParam = parseInt(c.req.query("days"), 10);
  const numDays = [7, 14, 30].includes(daysParam) ? daysParam : 7;

  const cacheKey = `guild:${guildId}:analytics:${numDays}`;
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return c.json(cached);
  }

  const botGuild = c.get("botGuild");

  // 1. Generate date range (YYYY-MM-DD)
  const days = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }

  // 2. Fetch daily snapshots within window
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
    const msgs = Number(s?.total_messages || 0);
    const vcMins = Math.round(Number(s?.total_vc_seconds || 0) / 60);
    const joins = Number(s?.joins_count || 0);
    const leaves = Number(s?.leaves_count || 0);

    return {
      date,
      messages: msgs,
      vc_minutes: vcMins,
      voiceMinutes: vcMins,
      joins,
      leaves,
      netGrowth: joins - leaves,
    };
  });

  // 3. Server Retention & Engagement Summary
  const stats = await getServerRetentionStats(guildId, numDays);
  const totalMessages = timeline.reduce((acc, curr) => acc + curr.messages, 0) || stats.totalMessages;
  const totalVoiceMinutes = timeline.reduce((acc, curr) => acc + curr.voiceMinutes, 0) || Math.round(stats.totalVcSeconds / 60);
  const totalVoiceHours = Math.round((totalVoiceMinutes / 60) * 10) / 10;
  const totalJoins = timeline.reduce((acc, curr) => acc + curr.joins, 0) || stats.totalJoins;
  const totalLeaves = timeline.reduce((acc, curr) => acc + curr.leaves, 0) || stats.totalLeaves;
  const netGrowth = totalJoins - totalLeaves;
  const dailyAvgMessages = Math.round(totalMessages / numDays);
  const dailyAvgVoiceMinutes = Math.round(totalVoiceMinutes / numDays);
  const totalGuildMembers = botGuild?.memberCount || stats.totalActive || 0;

  const summary = {
    totalMessages,
    dailyAvgMessages,
    totalVoiceMinutes,
    totalVoiceHours,
    dailyAvgVoiceMinutes,
    totalJoins,
    totalLeaves,
    netGrowth,
    retentionRate: stats.retentionRate,
    activeTracked: stats.totalActive,
    totalGuildMembers,
  };

  // 4. Channel Activity Breakdown
  const rawChannels = await getChannelBreakdown(guildId, numDays, 8);
  const channelBreakdown = rawChannels.map((ch) => {
    const discordCh = botGuild?.channels?.cache?.get(String(ch.channelId));
    return {
      channelId: ch.channelId,
      name: discordCh?.name || `channel-${ch.channelId.slice(-4)}`,
      type: discordCh?.type === 2 ? "voice" : "text",
      messages: ch.messages,
      voiceMinutes: ch.vcMinutes,
      percentage: ch.percentage,
    };
  });

  // 5. 24-Hour Peak Activity & Prime Window
  const hourly = await getHourlyDistribution(guildId);

  // 6. Algorithmic Server Insights
  const topChannelItem = channelBreakdown[0];
  const insights = {
    primeWindow: hourly.primeWindow,
    busiestDay: hourly.busiestDay,
    topChannel: topChannelItem ? `#${topChannelItem.name} (${topChannelItem.percentage}% of chat)` : "No channel activity yet",
    growthSummary: `${netGrowth >= 0 ? "+" : ""}${netGrowth} members over past ${numDays} days (${stats.retentionRate}% retention)`,
  };

  // 7. Top Chatters & Top Voice Members (Top 10)
  const [topChattersRaw, topVoiceRaw] = await Promise.all([
    getLeaderboard(guildId, "messages", numDays <= 7 ? "weekly" : "total", 10),
    getLeaderboard(guildId, "vc", numDays <= 7 ? "weekly" : "total", 10),
  ]);

  const topChatters = topChattersRaw.map((m) => {
    const member = botGuild?.members?.cache?.get(String(m.user_id));
    return {
      userId: String(m.user_id),
      username: member?.user?.username || `User ${m.user_id}`,
      avatar: member?.user?.displayAvatarURL?.() || null,
      messages: Number(m.total_messages || 0),
      weeklyMessages: Number(m.weekly_messages || 0),
      totalMessages: Number(m.total_messages || 0),
      count: Number(m.total_messages || 0),
    };
  });

  const topVoice = topVoiceRaw.map((m) => {
    const member = botGuild?.members?.cache?.get(String(m.user_id));
    const totalMinutes = Math.round(Number(m.total_vc_seconds || 0) / 60);
    const weeklyMinutes = Math.round(Number(m.weekly_vc_seconds || 0) / 60);

    return {
      userId: String(m.user_id),
      username: member?.user?.username || `User ${m.user_id}`,
      avatar: member?.user?.displayAvatarURL?.() || null,
      vcMinutes: totalMinutes,
      totalMinutes,
      weeklyMinutes,
      minutes: totalMinutes,
    };
  });

  const payload = {
    timeframe: numDays,
    summary,
    insights,
    timeline,
    channelBreakdown,
    hourlyDistribution: hourly.hours,
    topChatters,
    topVoice,
  };

  // Cache for 60 seconds
  apiCache.set(cacheKey, payload, 60000);

  return c.json(payload);
});
