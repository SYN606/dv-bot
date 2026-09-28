import { Op } from "sequelize";
import {
  MemberAnalytics,
  ChannelActivity,
  DailyActivitySnapshot,
  HourlyActivity,
} from "../models/index.js";
import { ensureGuildAndUser, ensureGuild } from "./common.js";

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

/**
 * Record message activity across member, daily snapshot, channel, and hourly matrices.
 */
export async function recordMessageActivity(guildId, userId, channelId = null, count = 1) {
  const gId = String(guildId);
  const uId = String(userId);
  const cId = channelId ? String(channelId) : null;
  const numCount = Number(count) || 1;
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  // 0 = Monday, ..., 6 = Sunday
  const jsDay = now.getUTCDay();
  const dayOfWeek = (jsDay + 6) % 7;
  const hourOfDay = now.getUTCHours();

  await ensureGuildAndUser(gId, uId);

  // 1. Member Analytics
  const memberRecord = await getMemberAnalytics(gId, uId);
  memberRecord.total_messages = Number(memberRecord.total_messages || 0) + numCount;
  memberRecord.weekly_messages = Number(memberRecord.weekly_messages || 0) + numCount;
  memberRecord.last_active_at = now.toISOString();
  await memberRecord.save();

  // 2. Daily Snapshot
  try {
    const [snapshot] = await DailyActivitySnapshot.findOrCreate({
      where: { guild_id: gId, date: today },
      defaults: {
        guild_id: gId,
        date: today,
        total_messages: 0,
        total_vc_seconds: 0,
        joins_count: 0,
        leaves_count: 0,
      },
    });
    if (snapshot) {
      await snapshot.increment("total_messages", { by: numCount });
    }
  } catch (err) {
    console.error("[ANALYTICS] Failed to update daily snapshot messages:", err);
  }

  // 3. Channel Activity
  if (cId) {
    try {
      const [channelRecord] = await ChannelActivity.findOrCreate({
        where: { guild_id: gId, channel_id: cId, date: today },
        defaults: {
          guild_id: gId,
          channel_id: cId,
          date: today,
          message_count: 0,
          vc_seconds_spent: 0,
        },
      });
      if (channelRecord) {
        await channelRecord.increment("message_count", { by: numCount });
      }
    } catch (err) {
      console.error("[ANALYTICS] Failed to update channel activity messages:", err);
    }
  }

  // 4. Hourly Activity
  try {
    const [hourlyRecord] = await HourlyActivity.findOrCreate({
      where: { guild_id: gId, day_of_week: dayOfWeek, hour_of_day: hourOfDay },
      defaults: {
        guild_id: gId,
        day_of_week: dayOfWeek,
        hour_of_day: hourOfDay,
        message_count: 0,
        vc_seconds: 0,
      },
    });
    if (hourlyRecord) {
      await hourlyRecord.increment("message_count", { by: numCount });
    }
  } catch (err) {
    console.error("[ANALYTICS] Failed to update hourly activity messages:", err);
  }
}

/**
 * Backward compatibility alias for message count increment.
 */
export async function incrementMessageCount(guildId, userId, count = 1) {
  return await recordMessageActivity(guildId, userId, null, count);
}

/**
 * Record voice activity across member, daily snapshot, channel, and hourly matrices.
 */
export async function recordVoiceActivity(guildId, userId, channelId = null, seconds = 0) {
  const gId = String(guildId);
  const uId = String(userId);
  const cId = channelId ? String(channelId) : null;
  const numSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  if (numSeconds <= 0) return;

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const jsDay = now.getUTCDay();
  const dayOfWeek = (jsDay + 6) % 7;
  const hourOfDay = now.getUTCHours();

  await ensureGuildAndUser(gId, uId);

  // 1. Member Analytics
  const memberRecord = await getMemberAnalytics(gId, uId);
  memberRecord.total_vc_seconds = Number(memberRecord.total_vc_seconds || 0) + numSeconds;
  memberRecord.weekly_vc_seconds = Number(memberRecord.weekly_vc_seconds || 0) + numSeconds;
  memberRecord.last_active_at = now.toISOString();
  await memberRecord.save();

  // 2. Daily Snapshot
  try {
    const [snapshot] = await DailyActivitySnapshot.findOrCreate({
      where: { guild_id: gId, date: today },
      defaults: {
        guild_id: gId,
        date: today,
        total_messages: 0,
        total_vc_seconds: 0,
        joins_count: 0,
        leaves_count: 0,
      },
    });
    if (snapshot) {
      await snapshot.increment("total_vc_seconds", { by: numSeconds });
    }
  } catch (err) {
    console.error("[ANALYTICS] Failed to update daily snapshot voice:", err);
  }

  // 3. Channel Activity
  if (cId) {
    try {
      const [channelRecord] = await ChannelActivity.findOrCreate({
        where: { guild_id: gId, channel_id: cId, date: today },
        defaults: {
          guild_id: gId,
          channel_id: cId,
          date: today,
          message_count: 0,
          vc_seconds_spent: 0,
        },
      });
      if (channelRecord) {
        await channelRecord.increment("vc_seconds_spent", { by: numSeconds });
      }
    } catch (err) {
      console.error("[ANALYTICS] Failed to update channel activity voice:", err);
    }
  }

  // 4. Hourly Activity
  try {
    const [hourlyRecord] = await HourlyActivity.findOrCreate({
      where: { guild_id: gId, day_of_week: dayOfWeek, hour_of_day: hourOfDay },
      defaults: {
        guild_id: gId,
        day_of_week: dayOfWeek,
        hour_of_day: hourOfDay,
        message_count: 0,
        vc_seconds: 0,
      },
    });
    if (hourlyRecord) {
      await hourlyRecord.increment("vc_seconds", { by: numSeconds });
    }
  } catch (err) {
    console.error("[ANALYTICS] Failed to update hourly activity voice:", err);
  }
}

/**
 * Backward compatibility alias for voice time increment.
 */
export async function incrementVoiceTime(guildId, userId, seconds) {
  return await recordVoiceActivity(guildId, userId, null, seconds);
}

/**
 * Retrieve server retention and population statistics over a given timeframe (days).
 */
export async function getServerRetentionStats(guildId, days = 7) {
  const gId = String(guildId);
  const now = new Date();
  const sinceDateObj = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const sinceDate = sinceDateObj.toISOString().split("T")[0];

  const totalActive = await MemberAnalytics.count({
    where: { guild_id: gId, is_active: true },
  });

  const snapshots = await DailyActivitySnapshot.findAll({
    where: {
      guild_id: gId,
      date: { [Op.gte]: sinceDate },
    },
    order: [["date", "ASC"]],
  });

  let totalJoins = 0;
  let totalLeaves = 0;
  let totalMessages = 0;
  let totalVcSeconds = 0;

  for (const s of snapshots) {
    totalJoins += Number(s.joins_count || 0);
    totalLeaves += Number(s.leaves_count || 0);
    totalMessages += Number(s.total_messages || 0);
    totalVcSeconds += Number(s.total_vc_seconds || 0);
  }

  // If daily snapshots haven't accumulated yet, fallback to active members totals for baseline
  if (totalMessages === 0 && totalVcSeconds === 0) {
    const allMembers = await MemberAnalytics.findAll({
      where: { guild_id: gId, is_active: true },
    });
    for (const m of allMembers) {
      totalMessages += Number(m.total_messages || 0);
      totalVcSeconds += Number(m.total_vc_seconds || 0);
    }
  }

  const netGrowth = totalJoins - totalLeaves;
  const retentionRate = totalJoins > 0 ? Math.max(0, Math.min(100, Math.round(((totalJoins - totalLeaves) / totalJoins) * 100))) : 100;

  return {
    totalActive,
    totalJoins,
    totalLeaves,
    totalMessages,
    totalVcSeconds,
    totalVcHours: Math.round((totalVcSeconds / 3600) * 10) / 10,
    netGrowth,
    retentionRate,
    snapshots,
  };
}

/**
 * Get channel activity breakdown over the timeframe (days).
 */
export async function getChannelBreakdown(guildId, days = 7, limit = 8) {
  const gId = String(guildId);
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const activities = await ChannelActivity.findAll({
    where: {
      guild_id: gId,
      date: { [Op.gte]: sinceDate },
    },
  });

  const channelMap = new Map();
  let serverTotalMessages = 0;

  for (const act of activities) {
    const cId = String(act.channel_id);
    const existing = channelMap.get(cId) || { channelId: cId, messages: 0, vcSeconds: 0 };
    existing.messages += Number(act.message_count || 0);
    existing.vcSeconds += Number(act.vc_seconds_spent || 0);
    serverTotalMessages += Number(act.message_count || 0);
    channelMap.set(cId, existing);
  }

  const list = Array.from(channelMap.values());
  list.sort((a, b) => b.messages - a.messages || b.vcSeconds - a.vcSeconds);

  return list.slice(0, limit).map((c) => ({
    ...c,
    percentage: serverTotalMessages > 0 ? Math.round((c.messages / serverTotalMessages) * 100) : 0,
    vcMinutes: Math.round(c.vcSeconds / 60),
  }));
}

/**
 * Get 24-hour distribution and peak activity metrics for the server.
 */
export async function getHourlyDistribution(guildId) {
  const gId = String(guildId);
  const rows = await HourlyActivity.findAll({
    where: { guild_id: gId },
  });

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const dayMessageCounts = new Array(7).fill(0);

  // Initialize 24 slots (0..23)
  const hourMap = new Map();
  for (let h = 0; h < 24; h++) {
    hourMap.set(h, { hour: h, messages: 0, vcSeconds: 0 });
  }

  for (const r of rows) {
    const h = Number(r.hour_of_day);
    const d = Number(r.day_of_week);
    const msgs = Number(r.message_count || 0);
    const vcs = Number(r.vc_seconds || 0);

    if (h >= 0 && h < 24) {
      const slot = hourMap.get(h);
      slot.messages += msgs;
      slot.vcSeconds += vcs;
    }
    if (d >= 0 && d < 7) {
      dayMessageCounts[d] += msgs;
    }
  }

  const hoursList = Array.from(hourMap.values());
  const sortedByMessages = [...hoursList].sort((a, b) => b.messages - a.messages);
  const peakHourObj = sortedByMessages[0] || { hour: 20, messages: 0 };
  const peakHour = peakHourObj.hour;

  // Prime window: 3-hour block around peak
  const startWindow = (peakHour - 1 + 24) % 24;
  const endWindow = (peakHour + 2) % 24;
  const primeWindow = `${String(startWindow).padStart(2, "0")}:00 – ${String(endWindow).padStart(2, "0")}:00 UTC`;

  // Busiest day
  let maxDayIdx = 0;
  let maxDayMsgs = 0;
  for (let i = 0; i < 7; i++) {
    if (dayMessageCounts[i] > maxDayMsgs) {
      maxDayMsgs = dayMessageCounts[i];
      maxDayIdx = i;
    }
  }
  const busiestDay = dayNames[maxDayIdx];

  return {
    hours: hoursList.map((h) => ({
      hour: h.hour,
      label: `${String(h.hour).padStart(2, "0")}:00`,
      messages: h.messages,
      vcMinutes: Math.round(h.vcSeconds / 60),
    })),
    peakHour,
    primeWindow,
    busiestDay,
    hasActivity: sortedByMessages.some((h) => h.messages > 0 || h.vcSeconds > 0),
  };
}

/**
 * Get leaderboard members.
 */
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
