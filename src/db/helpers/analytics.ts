import { Op } from "../models/index.js";
import {
  MemberAnalytics,
  ChannelActivity,
  DailyActivitySnapshot,
  HourlyActivity,
} from "../models/index.js";
import { ensureGuildAndUser } from "./common.js";
import { getRawSqlite } from "../index.js";

export async function getMemberAnalytics(guildId, userId) {
  const [record]: any = await MemberAnalytics.findOrCreate({
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
  return record as any;
}

// Cached prepared statements for maximum performance across batch flushes
let cachedStatements = null;
let lastSqliteRef = null;

function ensureAnalyticsSchema(sqlite) {
  try {
    sqlite.exec("DELETE FROM member_analytics WHERE id NOT IN (SELECT MAX(id) FROM member_analytics GROUP BY guild_id, user_id);");
    sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_member_analytics_guild_user ON member_analytics (guild_id, user_id);");
  } catch (_) {}
  try {
    sqlite.exec("DELETE FROM daily_activity_snapshots WHERE id NOT IN (SELECT MAX(id) FROM daily_activity_snapshots GROUP BY guild_id, date);");
    sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_activity_guild_date ON daily_activity_snapshots (guild_id, date);");
  } catch (_) {}
  try {
    sqlite.exec("DELETE FROM channel_activities WHERE id NOT IN (SELECT MAX(id) FROM channel_activities GROUP BY guild_id, channel_id, date);");
    sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_activities_unique ON channel_activities (guild_id, channel_id, date);");
  } catch (_) {}
  try {
    sqlite.exec("DELETE FROM hourly_activities WHERE id NOT IN (SELECT MAX(id) FROM hourly_activities GROUP BY guild_id, day_of_week, hour_of_day);");
    sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_hourly_activities_unique ON hourly_activities (guild_id, day_of_week, hour_of_day);");
  } catch (_) {}
}

function getBatchStatements(sqlite) {
  if (cachedStatements && lastSqliteRef === sqlite) {
    return cachedStatements;
  }

  const prepare = () => {
    const insertGuild = sqlite.prepare("INSERT OR IGNORE INTO guilds (guild_id) VALUES (?)");
    const insertUser = sqlite.prepare("INSERT OR IGNORE INTO users (user_id) VALUES (?)");
    const upsertMember = sqlite.prepare(`
      INSERT INTO member_analytics (
        guild_id, user_id, total_messages, weekly_messages,
        total_vc_seconds, weekly_vc_seconds, last_active_at, is_active, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        total_messages = total_messages + excluded.total_messages,
        weekly_messages = weekly_messages + excluded.weekly_messages,
        total_vc_seconds = total_vc_seconds + excluded.total_vc_seconds,
        weekly_vc_seconds = weekly_vc_seconds + excluded.weekly_vc_seconds,
        last_active_at = excluded.last_active_at,
        is_active = 1,
        updated_at = excluded.updated_at
    `);
    const upsertDaily = sqlite.prepare(`
      INSERT INTO daily_activity_snapshots (
        guild_id, date, total_messages, total_vc_seconds, joins_count, leaves_count
      ) VALUES (?, ?, ?, ?, 0, 0)
      ON CONFLICT(guild_id, date) DO UPDATE SET
        total_messages = total_messages + excluded.total_messages,
        total_vc_seconds = total_vc_seconds + excluded.total_vc_seconds
    `);
    const upsertChannel = sqlite.prepare(`
      INSERT INTO channel_activities (
        guild_id, channel_id, date, message_count, vc_seconds_spent
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(guild_id, channel_id, date) DO UPDATE SET
        message_count = message_count + excluded.message_count,
        vc_seconds_spent = vc_seconds_spent + excluded.vc_seconds_spent
    `);
    const upsertHourly = sqlite.prepare(`
      INSERT INTO hourly_activities (
        guild_id, day_of_week, hour_of_day, message_count, vc_seconds
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(guild_id, day_of_week, hour_of_day) DO UPDATE SET
        message_count = message_count + excluded.message_count,
        vc_seconds = vc_seconds + excluded.vc_seconds
    `);

    const runTransaction = sqlite.transaction((items, today, nowIso, dayOfWeek, hourOfDay) => {
      for (const item of items) {
        const gId = String(item.guildId);
        const uId = String(item.userId);
        const cId = item.channelId ? String(item.channelId) : null;
        const msgs = Math.max(0, Number(item.messages || 0));
        const vcSecs = Math.max(0, Number(item.vcSeconds || 0));

        if (msgs === 0 && vcSecs === 0) continue;

        insertGuild.run(gId);
        insertUser.run(uId);
        upsertMember.run(gId, uId, msgs, msgs, vcSecs, vcSecs, nowIso, nowIso);
        upsertDaily.run(gId, today, msgs, vcSecs);

        if (cId) {
          upsertChannel.run(gId, cId, today, msgs, vcSecs);
        }

        upsertHourly.run(gId, dayOfWeek, hourOfDay, msgs, vcSecs);
      }
    });

    return { runTransaction };
  };

  try {
    cachedStatements = prepare();
    lastSqliteRef = sqlite;
    return cachedStatements;
  } catch (err) {
    if (err && String(err.message || "").includes("ON CONFLICT")) {
      ensureAnalyticsSchema(sqlite);
      cachedStatements = prepare();
      lastSqliteRef = sqlite;
      return cachedStatements;
    }
    throw err;
  }
}

/**
 * High-performance batch activity recording.
 * Executes in a single SQLite transaction with cached prepared upsert statements,
 * dropping 500+ individual queries down to a single sub-millisecond atomic disk sync.
 *
 * @param {Array<{guildId: string, userId: string, channelId?: string, messages?: number, vcSeconds?: number}>} entries
 */
export async function recordBatchActivity(entries = []) {
  if (!entries || entries.length === 0) return;

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const nowIso = now.toISOString();
  const jsDay = now.getUTCDay();
  const dayOfWeek = (jsDay + 6) % 7; // 0 = Mon, 6 = Sun
  const hourOfDay = now.getUTCHours();

  const sqlite = getRawSqlite();
  if (sqlite) {
    try {
      const stmts = getBatchStatements(sqlite);
      stmts.runTransaction(entries, today, nowIso, dayOfWeek, hourOfDay);
      return;
    } catch (err) {
      console.error("[ANALYTICS] Native SQLite batch execution failed, falling back to ORM:", err);
    }
  }
  // Fallback for non-SQLite ORM execution
  for (const item of entries) {
    const gId = String(item.guildId);
    const uId = String(item.userId);
    const cId = item.channelId ? String(item.channelId) : null;
    const msgs = Math.max(0, Number(item.messages || 0));
    const vcSecs = Math.max(0, Number(item.vcSeconds || 0));

    if (msgs === 0 && vcSecs === 0) continue;

    await ensureGuildAndUser(gId, uId);

    const memberRecord = await getMemberAnalytics(gId, uId);
    if (msgs > 0) {
      memberRecord.total_messages = Number(memberRecord.total_messages || 0) + msgs;
      memberRecord.weekly_messages = Number(memberRecord.weekly_messages || 0) + msgs;
    }
    if (vcSecs > 0) {
      memberRecord.total_vc_seconds = Number(memberRecord.total_vc_seconds || 0) + vcSecs;
      memberRecord.weekly_vc_seconds = Number(memberRecord.weekly_vc_seconds || 0) + vcSecs;
    }
    memberRecord.last_active_at = nowIso;
    await memberRecord.save();

    try {
      const [snapshot]: any = await DailyActivitySnapshot.findOrCreate({
        where: { guild_id: gId, date: today },
        defaults: { guild_id: gId, date: today, total_messages: 0, total_vc_seconds: 0, joins_count: 0, leaves_count: 0 },
      });
      if (snapshot) {
        if (msgs > 0) await snapshot.increment("total_messages", { by: msgs });
        if (vcSecs > 0) await snapshot.increment("total_vc_seconds", { by: vcSecs });
      }
    } catch {}

    if (cId) {
      try {
        const [channelRecord]: any = await ChannelActivity.findOrCreate({
          where: { guild_id: gId, channel_id: cId, date: today },
          defaults: { guild_id: gId, channel_id: cId, date: today, message_count: 0, vc_seconds_spent: 0 },
        });
        if (channelRecord) {
          if (msgs > 0) await channelRecord.increment("message_count", { by: msgs });
          if (vcSecs > 0) await channelRecord.increment("vc_seconds_spent", { by: vcSecs });
        }
      } catch {}
    }

    try {
      const [hourlyRecord]: any = await HourlyActivity.findOrCreate({
        where: { guild_id: gId, day_of_week: dayOfWeek, hour_of_day: hourOfDay },
        defaults: { guild_id: gId, day_of_week: dayOfWeek, hour_of_day: hourOfDay, message_count: 0, vc_seconds: 0 },
      });
      if (hourlyRecord) {
        if (msgs > 0) await hourlyRecord.increment("message_count", { by: msgs });
        if (vcSecs > 0) await hourlyRecord.increment("vc_seconds", { by: vcSecs });
      }
    } catch {}
  }
}

/**
 * Record message activity across member, daily snapshot, channel, and hourly matrices.
 */
export async function recordMessageActivity(guildId, userId, channelId = null, count = 1) {
  return await recordBatchActivity([
    { guildId, userId, channelId, messages: count, vcSeconds: 0 },
  ]);
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
  return await recordBatchActivity([
    { guildId, userId, channelId, messages: 0, vcSeconds: seconds },
  ]);
}

/**
 * Backward compatibility alias for voice time increment.
 */
export async function incrementVoiceTime(guildId, userId, seconds) {
  return await recordVoiceActivity(guildId, userId, null, seconds);
}

/**
 * Reset all weekly analytics server-wide.
 * Called automatically every Sunday at midnight UTC.
 */
export async function resetAllWeeklyAnalytics() {
  const sqlite = getRawSqlite();
  if (sqlite) {
    sqlite.run("UPDATE member_analytics SET weekly_messages = 0, weekly_vc_seconds = 0;");
  } else {
    await MemberAnalytics.update(
      { weekly_messages: 0, weekly_vc_seconds: 0 },
      { where: {} }
    );
  }
}

/**
 * Retrieve server retention and population statistics over a given timeframe (days),
 * including delta comparisons against the preceding period.
 */
export async function getServerRetentionStats(guildId, days = 7) {
  const gId = String(guildId);
  const numDays = Math.max(1, Number(days) || 7);
  const now = new Date();

  // Current window dates
  const sinceDateObj = new Date(now.getTime() - numDays * 24 * 60 * 60 * 1000);
  const sinceDate = sinceDateObj.toISOString().split("T")[0];

  // Previous window dates for delta comparisons
  const prevSinceDateObj = new Date(now.getTime() - 2 * numDays * 24 * 60 * 60 * 1000);
  const prevSinceDate = prevSinceDateObj.toISOString().split("T")[0];

  const totalActive = await MemberAnalytics.count({
    where: { guild_id: gId, is_active: true },
  });

  const [currentSnapshots, prevSnapshots] = await Promise.all([
    DailyActivitySnapshot.findAll({
      where: {
        guild_id: gId,
        date: { [Op.gte]: sinceDate },
      },
      order: [["date", "ASC"]],
    }),
    DailyActivitySnapshot.findAll({
      where: {
        guild_id: gId,
        date: { [Op.gte]: prevSinceDate, [Op.lt]: sinceDate },
      },
      order: [["date", "ASC"]],
    }),
  ]);

  let totalJoins = 0;
  let totalLeaves = 0;
  let totalMessages = 0;
  let totalVcSeconds = 0;

  for (const s of currentSnapshots) {
    totalJoins += Number(s.joins_count || 0);
    totalLeaves += Number(s.leaves_count || 0);
    totalMessages += Number(s.total_messages || 0);
    totalVcSeconds += Number(s.total_vc_seconds || 0);
  }

  // Previous window aggregations
  let prevJoins = 0;
  let prevLeaves = 0;
  let prevMessages = 0;
  let prevVcSeconds = 0;

  for (const s of prevSnapshots) {
    prevJoins += Number(s.joins_count || 0);
    prevLeaves += Number(s.leaves_count || 0);
    prevMessages += Number(s.total_messages || 0);
    prevVcSeconds += Number(s.total_vc_seconds || 0);
  }

  // If daily snapshots haven't accumulated yet, fallback to active members totals
  if (totalMessages === 0 && totalVcSeconds === 0) {
    try {
      const msgSum = await (MemberAnalytics as any).sum("total_messages", {
        where: { guild_id: gId, is_active: true },
      });
      const vcSum = await (MemberAnalytics as any).sum("total_vc_seconds", {
        where: { guild_id: gId, is_active: true },
      });
      totalMessages = Number(msgSum || 0);
      totalVcSeconds = Number(vcSum || 0);
    } catch {
      totalMessages = 0;
      totalVcSeconds = 0;
    }
  }

  const netGrowth = totalJoins - totalLeaves;
  const prevNetGrowth = prevJoins - prevLeaves;

  let retentionRate = 100;
  if (totalJoins > 0) {
    retentionRate = Math.max(0, Math.min(100, Math.round(((totalJoins - totalLeaves) / totalJoins) * 100)));
  } else if (totalLeaves > 0) {
    retentionRate = 0;
  }

  // Calculate percentage deltas (null if no previous baseline)
  const calcDelta = (curr, prev) => {
    if (!prev || prev <= 0) return null;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  };

  const deltas = {
    messagesDelta: calcDelta(totalMessages, prevMessages),
    voiceDelta: calcDelta(totalVcSeconds, prevVcSeconds),
    joinsDelta: calcDelta(totalJoins, prevJoins),
    netGrowthDelta: prevSnapshots.length > 0 ? netGrowth - prevNetGrowth : null,
  };

  return {
    totalActive,
    totalJoins,
    totalLeaves,
    totalMessages,
    totalVcSeconds,
    totalVcHours: Math.round((totalVcSeconds / 3600) * 10) / 10,
    netGrowth,
    retentionRate,
    deltas,
    snapshots: currentSnapshots,
    hasSnapshots: currentSnapshots.length > 0,
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

  const channelMap = new Map<string, any>();
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
  const hourMap = new Map<number, any>();
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
  const hasActivity = sortedByMessages.some((h) => h.messages > 0 || h.vcSeconds > 0);

  // Prime window: 3-hour block around peak (only if activity exists)
  const startWindow = (peakHour - 1 + 24) % 24;
  const endWindow = (peakHour + 2) % 24;
  const primeWindow = hasActivity
    ? `${String(startWindow).padStart(2, "0")}:00 – ${String(endWindow).padStart(2, "0")}:00 UTC`
    : null;

  // Busiest day
  let maxDayIdx = 0;
  let maxDayMsgs = 0;
  for (let i = 0; i < 7; i++) {
    if (dayMessageCounts[i] > maxDayMsgs) {
      maxDayMsgs = dayMessageCounts[i];
      maxDayIdx = i;
    }
  }
  const busiestDay = hasActivity && maxDayMsgs > 0 ? dayNames[maxDayIdx] : null;

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
    hasActivity,
  };
}

/**
 * Get leaderboard members.
 */
export async function getLeaderboard(guildId, type = "messages", timeframe = "total", limit = 25) {
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