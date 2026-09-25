import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { getAnalytics } from "../api/client";
import {
  TrendingUp,
  MessageSquare,
  Mic,
  Trophy,
  Users,
  Clock,
  UserPlus,
  UserMinus,
  ShieldCheck,
  Zap,
  Calendar,
  Hash,
  Sparkles,
  Search,
  RefreshCw,
  Award,
  Download,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsPage({ user, botInfo }) {
  const { guildId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(7); // 7, 14, 30
  const [leaderboardTab, setLeaderboardTab] = useState("chat"); // "chat" | "voice"
  const [leaderboardScope, setLeaderboardScope] = useState("weekly"); // "weekly" | "total"
  const [leaderboardSearch, setLeaderboardSearch] = useState("");

  const loadAnalytics = (days) => {
    setLoading(true);
    getAnalytics(guildId, days)
      .then((res) => setData(res))
      .catch((err) => console.error("Failed to load analytics:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAnalytics(timeframe);
  }, [guildId, timeframe]);

  const handleExportCSV = () => {
    if (!data) return;

    const chatters = data.topChatters || [];
    const voice = data.topVoice || [];
    const timeline = data.timeline || [];
    const summary = data.summary || {};
    const insights = data.insights || {};

    let csv = "=== SERVER ANALYTICS REPORT ===\n\n";
    
    csv += "--- SUMMARY ---\n";
    csv += `Total Messages,${summary.totalMessages}\n`;
    csv += `Total Voice Hours,${summary.totalVoiceHours}\n`;
    csv += `Net Growth,${summary.netGrowth >= 0 ? "+" : ""}${summary.netGrowth}\n`;
    csv += `Retention Rate,${summary.retentionRate}%\n`;
    csv += `Active Members Tracked,${summary.activeTracked}\n\n`;

    csv += "--- INSIGHTS ---\n";
    csv += `Prime Activity Window,${insights.primeWindow}\n`;
    csv += `Peak Traffic Day,${insights.busiestDay}\n`;
    csv += `Most Active Channel,${(insights.topChannel || "").replace(/,/g, " ")}\n`;
    csv += `Growth Momentum,${(insights.growthSummary || "").replace(/,/g, " ")}\n\n`;

    csv += `--- LEADERBOARD (${leaderboardTab.toUpperCase()}) ---\n`;
    if (leaderboardTab === "chat") {
      csv += "Rank,Username,User ID,Total Messages,Weekly Messages\n";
      chatters.forEach((u, i) => {
        csv += `${i + 1},"${u.username}",${u.userId},${u.totalMessages},${u.weeklyMessages}\n`;
      });
    } else {
      csv += "Rank,Username,User ID,Total Voice (Mins),Weekly Voice (Mins)\n";
      voice.forEach((u, i) => {
        csv += `${i + 1},"${u.username}",${u.userId},${u.totalMinutes},${u.weeklyMinutes}\n`;
      });
    }

    csv += "\n--- TIMELINE ---\n";
    csv += "Date,Messages,Voice Minutes,Joins,Leaves,Net Growth\n";
    timeline.forEach((t) => {
      csv += `${t.date},${t.messages},${t.voiceMinutes ?? t.vc_minutes ?? 0},${t.joins},${t.leaves},${t.netGrowth}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `guild_${guildId}_analytics_${leaderboardTab}_${timeframe}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = data?.summary || {
    totalMessages: 0,
    dailyAvgMessages: 0,
    totalVoiceMinutes: 0,
    totalVoiceHours: 0,
    dailyAvgVoiceMinutes: 0,
    totalJoins: 0,
    totalLeaves: 0,
    netGrowth: 0,
    retentionRate: 100,
    activeTracked: 0,
    totalGuildMembers: 0,
  };

  const insights = data?.insights || {
    primeWindow: "19:00 – 23:00 UTC",
    busiestDay: "Friday",
    topChannel: "No channel activity yet",
    growthSummary: "Stable community engagement",
  };

  const timeline = data?.timeline || [];
  const timelineLabels = timeline.map((d) => d.date.slice(5)); // MM-DD
  const messageCounts = timeline.map((d) => d.messages ?? 0);
  const voiceMinutes = timeline.map((d) => d.voiceMinutes ?? d.vc_minutes ?? 0);
  const joinsData = timeline.map((d) => d.joins ?? 0);

  // 1. Message Volume Line Chart
  const lineChartData = {
    labels: timelineLabels.length ? timelineLabels : ["Day 1", "Day 2", "Day 3"],
    datasets: [
      {
        label: "Messages Sent",
        data: messageCounts.length ? messageCounts : [0, 0, 0],
        borderColor: "rgb(99, 102, 241)",
        backgroundColor: "rgba(99, 102, 241, 0.15)",
        fill: true,
        tension: 0.35,
        pointBackgroundColor: "rgb(99, 102, 241)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  // 2. Voice Minutes & Joins Chart
  const voiceChartData = {
    labels: timelineLabels.length ? timelineLabels : ["Day 1", "Day 2", "Day 3"],
    datasets: [
      {
        type: "bar",
        label: "Voice Minutes",
        data: voiceMinutes.length ? voiceMinutes : [0, 0, 0],
        backgroundColor: "rgba(168, 85, 247, 0.65)",
        borderRadius: 8,
        yAxisID: "y",
      },
      {
        type: "line",
        label: "New Joins",
        data: joinsData.length ? joinsData : [0, 0, 0],
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        tension: 0.3,
        pointRadius: 3,
        yAxisID: "y1",
      },
    ],
  };

  // 3. 24-Hour Peak Activity Distribution
  const hourlyList = data?.hourlyDistribution || [];
  const hourlyLabels = hourlyList.map((h) => h.label);
  const hourlyMessages = hourlyList.map((h) => h.messages);

  const hourlyChartData = {
    labels: hourlyLabels.length ? hourlyLabels : Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`),
    datasets: [
      {
        label: "Messages Density",
        data: hourlyMessages.length ? hourlyMessages : new Array(24).fill(0),
        backgroundColor: hourlyMessages.map((val) => {
          const max = Math.max(...hourlyMessages, 1);
          const ratio = val / max;
          if (ratio > 0.75) return "rgba(244, 63, 94, 0.85)"; // Peak highlight
          if (ratio > 0.4) return "rgba(99, 102, 241, 0.75)";
          return "rgba(99, 102, 241, 0.35)";
        }),
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        titleColor: "#fff",
        bodyColor: "#cbd5e1",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8", font: { size: 10 } },
      },
      y: {
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#94a3b8", font: { size: 10 } },
        beginAtZero: true,
      },
    },
  };

  const dualAxisOptions = {
    ...chartOptions,
    scales: {
      x: chartOptions.scales.x,
      y: {
        type: "linear",
        position: "left",
        grid: { color: "rgba(255, 255, 255, 0.05)" },
        ticks: { color: "#c084fc", font: { size: 10 } },
        beginAtZero: true,
      },
      y1: {
        type: "linear",
        position: "right",
        grid: { drawOnChartArea: false },
        ticks: { color: "#34d399", font: { size: 10 }, precision: 0 },
        beginAtZero: true,
      },
    },
  };

  // Filtered Leaderboard Items
  const filteredChatters = useMemo(() => {
    const list = data?.topChatters || [];
    if (!leaderboardSearch.trim()) return list;
    return list.filter((u) => u.username.toLowerCase().includes(leaderboardSearch.toLowerCase()));
  }, [data?.topChatters, leaderboardSearch]);

  const filteredVoice = useMemo(() => {
    const list = data?.topVoice || [];
    if (!leaderboardSearch.trim()) return list;
    return list.filter((u) => u.username.toLowerCase().includes(leaderboardSearch.toLowerCase()));
  }, [data?.topVoice, leaderboardSearch]);

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Analytics & Insights"]}
    >
      <div className="space-y-6">
        {/* Header & Timeframe Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <TrendingUp className="w-6 h-6 text-indigo-400" />
              <span>Server Insights & Analytics</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Multi-dimensional community telemetry, retention rates, channel traffic, and prime engagement hours.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900/90 p-1 rounded-2xl border border-white/10 self-start sm:self-auto shadow-lg">
            {[
              { label: "7 Days", val: 7 },
              { label: "14 Days", val: 14 },
              { label: "30 Days", val: 30 },
            ].map((t) => (
              <button
                key={t.val}
                type="button"
                onClick={() => setTimeframe(t.val)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  timeframe === t.val
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {t.label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={loading || !data}
              className="p-2 rounded-xl text-slate-400 hover:text-indigo-400 hover:bg-white/5 transition-colors cursor-pointer"
              title="Export Analytics Data to CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => loadAnalytics(timeframe)}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Refresh Analytics Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* 4 Summary KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Messages */}
          <div className="glass-card p-5 rounded-3xl border border-white/5 shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Total Messages</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {summary.totalMessages.toLocaleString()}
              </p>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                <span className="text-indigo-300 font-semibold font-mono">
                  ~{summary.dailyAvgMessages.toLocaleString()}
                </span>
                <span>msgs/day avg</span>
              </div>
            </div>
          </div>

          {/* 2. Total Voice Hours */}
          <div className="glass-card p-5 rounded-3xl border border-white/5 shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Voice Activity</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Mic className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight">
                {summary.totalVoiceHours} <span className="text-sm font-normal text-slate-400">hrs</span>
              </p>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                <span className="text-purple-300 font-semibold font-mono">
                  {summary.totalVoiceMinutes.toLocaleString()} min
                </span>
                <span>logged</span>
              </div>
            </div>
          </div>

          {/* 3. Server Net Growth */}
          <div className="glass-card p-5 rounded-3xl border border-white/5 shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Net Member Growth</span>
              <div className={`p-2 rounded-xl border ${summary.netGrowth >= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"}`}>
                {summary.netGrowth >= 0 ? <UserPlus className="w-4 h-4" /> : <UserMinus className="w-4 h-4" />}
              </div>
            </div>
            <div>
              <p className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${summary.netGrowth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {summary.netGrowth >= 0 ? `+${summary.netGrowth}` : summary.netGrowth}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                <span className="text-emerald-300">+{summary.totalJoins} joins</span>
                <span>•</span>
                <span className="text-rose-300">-{summary.totalLeaves} leaves</span>
              </div>
            </div>
          </div>

          {/* 4. Retention Rate */}
          <div className="glass-card p-5 rounded-3xl border border-white/5 shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400">Retention Rate</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <p className="text-2xl sm:text-3xl font-black text-amber-300 font-mono tracking-tight">
                  {summary.retentionRate}%
                </p>
                <span className="text-[10px] font-mono text-slate-400">
                  {summary.activeTracked} active members
                </span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, summary.retentionRate))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Algorithmic Server Insights Banner */}
        <div className="glass-card p-5 sm:p-6 rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/30 via-slate-900/60 to-purple-950/30 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Zap className="w-4 h-4" />
            <span>Community Intelligence & Prime Hours</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Prime Activity Window</span>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>{insights.primeWindow}</span>
              </p>
              <span className="text-[10px] text-slate-500 block">Ideal time for events and announcements</span>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Peak Traffic Day</span>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>{insights.busiestDay}</span>
              </p>
              <span className="text-[10px] text-slate-500 block">Highest conversation volume day</span>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Most Active Channel</span>
              <p className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                <Hash className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{insights.topChannel}</span>
              </p>
              <span className="text-[10px] text-slate-500 block">Primary community discussion hub</span>
            </div>

            <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 font-mono uppercase">Growth Momentum</span>
              <p className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{insights.growthSummary}</span>
              </p>
              <span className="text-[10px] text-slate-500 block">Rolling timeframe trend</span>
            </div>
          </div>
        </div>

        {/* Charts Grid Row 1: Message Volume & Voice Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat Messages Line Chart */}
          <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Daily Message Volume</h3>
                  <span className="text-[10px] text-slate-400">Total conversation messages per day</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                {timeframe} Days Rolling
              </span>
            </div>
            <div className="h-64">
              <Line data={lineChartData} options={chartOptions} />
            </div>
          </div>

          {/* Voice Channel Engagement & Joins */}
          <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Voice Engagement & Joins</h3>
                  <span className="text-[10px] text-slate-400">Voice minutes (bars) vs new members (line)</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-purple-400">■ Voice Mins</span>
                <span className="text-emerald-400">● Joins</span>
              </div>
            </div>
            <div className="h-64">
              <Bar data={voiceChartData} options={dualAxisOptions} />
            </div>
          </div>
        </div>

        {/* Charts Grid Row 2: 24-Hour Peak Heatmap & Channel Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 24-Hour Peak Activity Distribution */}
          <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">24-Hour Peak Activity Matrix</h3>
                  <span className="text-[10px] text-slate-400">Aggregated message density by UTC hour (00:00–23:00)</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                Peak: {String(data?.hourlyDistribution?.find((_, i) => i === data?.hourlyDistribution?.length)?.hour || "Evening")}
              </span>
            </div>
            <div className="h-64">
              <Bar data={hourlyChartData} options={chartOptions} />
            </div>
          </div>

          {/* Top Channel Activity Breakdown */}
          <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Hash className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Channel Activity Share</h3>
                  <span className="text-[10px] text-slate-400">Top active discussion channels</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Share of Chat</span>
            </div>

            <div className="space-y-3 flex-1 flex flex-col justify-center">
              {data?.channelBreakdown && data.channelBreakdown.length > 0 ? (
                data.channelBreakdown.map((ch, idx) => (
                  <div key={ch.channelId} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5 truncate max-w-[200px]">
                        <span className="text-slate-500 font-mono">#{idx + 1}</span>
                        <Hash className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="truncate">{ch.name}</span>
                      </span>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <span className="text-slate-400">{ch.messages.toLocaleString()} msgs</span>
                        <span className="text-indigo-300 font-bold w-10 text-right">{ch.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(ch.percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-xs text-slate-500 border border-dashed border-white/5 rounded-2xl">
                  No channel chat records accumulated yet in this timeframe.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabbed Member Leaderboard Section */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/5 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Community Leaderboards</h2>
                <p className="text-xs text-slate-400">Top contributors ranked by engagement metrics.</p>
              </div>
            </div>

            {/* Sub-Filters: Chat vs Voice & Search */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Chat vs Voice Tab */}
              <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setLeaderboardTab("chat")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    leaderboardTab === "chat"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat Activity</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardTab("voice")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    leaderboardTab === "voice"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>Voice Activity</span>
                </button>
              </div>

              {/* Weekly vs All-Time Toggle */}
              <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setLeaderboardScope("weekly")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    leaderboardScope === "weekly" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setLeaderboardScope("total")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    leaderboardScope === "total" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  All-Time
                </button>
              </div>

              {/* Search Member & Export */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search user..."
                    value={leaderboardSearch}
                    onChange={(e) => setLeaderboardSearch(e.target.value)}
                    className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36 sm:w-44"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={loading || !data}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  title="Export Data to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Leaderboard Table / Grid */}
          <div className="space-y-2">
            {leaderboardTab === "chat" ? (
              filteredChatters.length > 0 ? (
                filteredChatters.map((u, idx) => {
                  const medalColor =
                    idx === 0
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                      : idx === 1
                      ? "text-slate-300 bg-slate-400/10 border-slate-400/30"
                      : idx === 2
                      ? "text-amber-600 bg-amber-700/10 border-amber-700/30"
                      : "text-slate-500 bg-slate-800/40 border-white/5";

                  const countValue =
                    leaderboardScope === "weekly"
                      ? (u.weeklyMessages ?? u.messages ?? 0)
                      : (u.totalMessages ?? u.messages ?? 0);

                  return (
                    <div
                      key={u.userId || idx}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3.5">
                        <span
                          className={`w-7 h-7 rounded-xl border flex items-center justify-center text-xs font-bold font-mono ${medalColor}`}
                        >
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </span>

                        <img
                          src={
                            u.avatar
                              ? u.avatar.startsWith("http")
                                ? u.avatar
                                : `https://cdn.discordapp.com/avatars/${u.userId}/${u.avatar}.png`
                              : "https://cdn.discordapp.com/embed/avatars/0.png"
                          }
                          alt=""
                          className="w-9 h-9 rounded-full ring-2 ring-indigo-500/30 object-cover"
                        />

                        <div>
                          <p className="text-xs font-bold text-white">{u.username || `User ${u.userId}`}</p>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {u.userId}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-indigo-400 font-mono">
                          {countValue.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-mono">
                          {leaderboardScope === "weekly" ? "weekly msgs" : "total msgs"}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-xs text-slate-500 border border-dashed border-white/5 rounded-2xl">
                  No active chat members found matching your search.
                </div>
              )
            ) : (
              filteredVoice.length > 0 ? (
                filteredVoice.map((u, idx) => {
                  const medalColor =
                    idx === 0
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
                      : idx === 1
                      ? "text-slate-300 bg-slate-400/10 border-slate-400/30"
                      : idx === 2
                      ? "text-amber-600 bg-amber-700/10 border-amber-700/30"
                      : "text-slate-500 bg-slate-800/40 border-white/5";

                  const minutesValue =
                    leaderboardScope === "weekly"
                      ? (u.weeklyMinutes ?? u.vcMinutes ?? 0)
                      : (u.totalMinutes ?? u.vcMinutes ?? 0);

                  const hoursValue = Math.floor(minutesValue / 60);
                  const remMins = minutesValue % 60;

                  return (
                    <div
                      key={u.userId || idx}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-white/5 transition-all"
                    >
                      <div className="flex items-center gap-3.5">
                        <span
                          className={`w-7 h-7 rounded-xl border flex items-center justify-center text-xs font-bold font-mono ${medalColor}`}
                        >
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </span>

                        <img
                          src={
                            u.avatar
                              ? u.avatar.startsWith("http")
                                ? u.avatar
                                : `https://cdn.discordapp.com/avatars/${u.userId}/${u.avatar}.png`
                              : "https://cdn.discordapp.com/embed/avatars/0.png"
                          }
                          alt=""
                          className="w-9 h-9 rounded-full ring-2 ring-purple-500/30 object-cover"
                        />

                        <div>
                          <p className="text-xs font-bold text-white">{u.username || `User ${u.userId}`}</p>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {u.userId}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-purple-400 font-mono">
                          {hoursValue > 0 ? `${hoursValue}h ${remMins}m` : `${remMins}m`}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-mono">
                          {leaderboardScope === "weekly" ? "weekly voice" : "total voice"}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-xs text-slate-500 border border-dashed border-white/5 rounded-2xl">
                  No active voice members found matching your search.
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
