import { describe, expect, it, beforeAll } from "bun:test";
import { initDb } from "../src/db/index.js";
import {
  recordMessageActivity,
  recordVoiceActivity,
  getServerRetentionStats,
  getChannelBreakdown,
  getHourlyDistribution,
  getLeaderboard,
  getMemberAnalytics,
} from "../src/db/helpers/analytics.js";
import {
  MemberAnalytics,
  DailyActivitySnapshot,
  ChannelActivity,
  HourlyActivity,
} from "../src/db/models/index.js";

describe("Analytics Engine & Multi-Dimension Tracking Tests", () => {
  const testGuildId = "889900";
  const user1 = "u_101";
  const user2 = "u_102";
  const channelText = "c_201";
  const channelVoice = "c_202";

  beforeAll(async () => {
    await initDb();
    // Clean test guild records
    await MemberAnalytics.destroy({ where: { guild_id: testGuildId } });
    await DailyActivitySnapshot.destroy({ where: { guild_id: testGuildId } });
    await ChannelActivity.destroy({ where: { guild_id: testGuildId } });
    await HourlyActivity.destroy({ where: { guild_id: testGuildId } });
  });

  it("recordMessageActivity should update member, daily, channel, and hourly metrics", async () => {
    await recordMessageActivity(testGuildId, user1, channelText, 5);
    await recordMessageActivity(testGuildId, user1, channelText, 3);
    await recordMessageActivity(testGuildId, user2, channelText, 2);

    // 1. Check member analytics
    const member1 = await getMemberAnalytics(testGuildId, user1);
    expect(member1.total_messages).toBe(8);
    expect(member1.weekly_messages).toBe(8);

    const member2 = await getMemberAnalytics(testGuildId, user2);
    expect(member2.total_messages).toBe(2);

    // 2. Check channel activity
    const today = new Date().toISOString().split("T")[0];
    const channelRecord = await ChannelActivity.findOne({
      where: { guild_id: testGuildId, channel_id: channelText, date: today },
    });
    expect(channelRecord).toBeDefined();
    expect(channelRecord.message_count).toBe(10); // 8 + 2

    // 3. Check daily snapshot
    const snapshot = await DailyActivitySnapshot.findOne({
      where: { guild_id: testGuildId, date: today },
    });
    expect(snapshot).toBeDefined();
    expect(snapshot.total_messages).toBe(10);
  });

  it("recordVoiceActivity should update member, daily, channel, and hourly voice duration", async () => {
    await recordVoiceActivity(testGuildId, user1, channelVoice, 120); // 2 minutes
    await recordVoiceActivity(testGuildId, user2, channelVoice, 300); // 5 minutes

    const member1 = await getMemberAnalytics(testGuildId, user1);
    expect(member1.total_vc_seconds).toBe(120);

    const member2 = await getMemberAnalytics(testGuildId, user2);
    expect(member2.total_vc_seconds).toBe(300);

    const today = new Date().toISOString().split("T")[0];
    const channelRecord = await ChannelActivity.findOne({
      where: { guild_id: testGuildId, channel_id: channelVoice, date: today },
    });
    expect(channelRecord).toBeDefined();
    expect(channelRecord.vc_seconds_spent).toBe(420);
  });

  it("getServerRetentionStats should aggregate metrics and calculate retention rate", async () => {
    const stats = await getServerRetentionStats(testGuildId, 7);
    expect(stats.totalActive).toBeGreaterThanOrEqual(2);
    expect(stats.totalMessages).toBe(10);
    expect(stats.totalVcSeconds).toBe(420);
    expect(stats.totalVcHours).toBe(0.1);
    expect(stats.retentionRate).toBeGreaterThanOrEqual(0);
  });

  it("getChannelBreakdown should calculate channel percentage of server chat", async () => {
    const channels = await getChannelBreakdown(testGuildId, 7);
    expect(channels.length).toBeGreaterThanOrEqual(1);

    const textCh = channels.find((c) => c.channelId === channelText);
    expect(textCh).toBeDefined();
    expect(textCh.messages).toBe(10);
    expect(textCh.percentage).toBe(100);
  });

  it("getHourlyDistribution should return 24 slots with prime window and peak hours", async () => {
    const hourly = await getHourlyDistribution(testGuildId);
    expect(hourly.hours.length).toBe(24);
    expect(hourly.primeWindow).toBeDefined();
    expect(hourly.primeWindow).toContain(":");
    expect(hourly.busiestDay).toBeDefined();
    expect(hourly.hasActivity).toBe(true);
  });

  it("getLeaderboard should rank members accurately by messages and voice time", async () => {
    const chatLeaderboard = await getLeaderboard(testGuildId, "messages", "total", 5);
    expect(chatLeaderboard.length).toBe(2);
    expect(chatLeaderboard[0].user_id).toBe(user1); // 8 msgs > 2 msgs

    const voiceLeaderboard = await getLeaderboard(testGuildId, "vc", "total", 5);
    expect(voiceLeaderboard.length).toBe(2);
    expect(voiceLeaderboard[0].user_id).toBe(user2); // 300s > 120s
  });
});
