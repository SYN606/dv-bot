import { SlashCommandBuilder } from "discord.js";
import { createCommand } from "../../core/command.js";
import { makeEmbed } from "../../core/embeds.js";
import {
  getServerRetentionStats,
  getChannelBreakdown,
  getHourlyDistribution,
} from "../../db/helpers/analytics.js";

const slashBuilder = new SlashCommandBuilder()
  .setName("serverstats")
  .setDescription("View comprehensive server activity, member trends, and voice statistics")
  .addIntegerOption((opt) =>
    opt
      .setName("days")
      .setDescription("Timeframe in days (default: 7)")
      .setRequired(false)
      .addChoices(
        { name: "7 Days", value: 7 },
        { name: "14 Days", value: 14 },
        { name: "30 Days", value: 30 }
      )
  );

export default createCommand({
  name: "serverstats",
  category: "Analytics",
  aliases: ["stats", "serverinsights"],
  description: "View comprehensive server activity, member trends, and voice statistics",
  usage: "[7|14|30]",
  examples: ["/serverstats", "/serverstats days:14", "dv serverstats", "dv stats"],
  slashBuilder,

  async execute(ctx) {
    const { guild } = ctx;
    if (!guild) return;

    const days = Number(ctx.options.days || ctx.options._args?.[0]) || 7;
    const numDays = [7, 14, 30].includes(days) ? days : 7;

    const [stats, channels, hourly] = await Promise.all([
      getServerRetentionStats(guild.id, numDays),
      getChannelBreakdown(guild.id, numDays, 3),
      getHourlyDistribution(guild.id),
    ]);

    const topChannel = channels[0];
    const topChannelName = topChannel
      ? `<#${topChannel.channelId}> (${topChannel.percentage}% of chat)`
      : "*No channel activity yet*";

    const primeWindowStr = hourly.primeWindow || "*Accumulating data...*";
    const busiestDayStr = hourly.busiestDay || "*Accumulating data...*";

    const deltas = stats.deltas || {};
    const formatDelta = (val) => {
      if (val === null || val === undefined) return "";
      const sign = val > 0 ? "+" : "";
      return ` (${sign}${val}% vs prev ${numDays}d)`;
    };

    const totalMembers = guild.memberCount || stats.totalActive || 0;
    const netGrowthStr = `${stats.netGrowth >= 0 ? "+" : ""}${stats.netGrowth}`;

    const embed = makeEmbed({
      title: `📊 Server Analytics & Insights • ${guild.name}`,
      description: `Detailed engagement metrics over the past **${numDays} days**.`,
      level: "PREMIUM",
      fields: [
        {
          name: "💬 Chat Activity",
          value: `**Total Messages:** ${stats.totalMessages.toLocaleString()}${formatDelta(deltas.messagesDelta)}\n**Daily Average:** ~${Math.round(stats.totalMessages / numDays).toLocaleString()} / day`,
          inline: true,
        },
        {
          name: "🎙️ Voice Activity",
          value: `**Total Hours:** ${stats.totalVcHours.toLocaleString()}h${formatDelta(deltas.voiceDelta)}\n**Daily Average:** ~${(Math.round((stats.totalVcHours / numDays) * 10) / 10).toLocaleString()}h / day`,
          inline: true,
        },
        {
          name: "👥 Member Growth",
          value: `**Net Change:** ${netGrowthStr}\n**Joins / Leaves:** +${stats.totalJoins} / -${stats.totalLeaves}\n**Retention Rate:** ${stats.retentionRate}%`,
          inline: true,
        },
        {
          name: "⏰ Peak Traffic Window",
          value: `${primeWindowStr}\n*Peak Day:* **${busiestDayStr}**`,
          inline: true,
        },
        {
          name: "🏆 Most Active Channel",
          value: topChannelName,
          inline: true,
        },
        {
          name: "🌐 Server Population",
          value: `**Total Members:** ${totalMembers.toLocaleString()}\n**Active Tracked:** ${stats.totalActive.toLocaleString()}`,
          inline: true,
        },
      ],
      footer: `Tip: View interactive charts & leaderboards on the web dashboard.`,
    });

    if (guild.iconURL()) {
      embed.setThumbnail(guild.iconURL({ dynamic: true }));
    }

    return await ctx.reply({ embeds: [embed] });
  },
});
