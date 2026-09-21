import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    getAnalytics(guildId)
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [guildId]);

  const timeline = data?.timeline || [];
  const labels = timeline.map((d) => d.date);
  const messageCounts = timeline.map((d) => d.messages);
  const voiceMinutes = timeline.map((d) => d.voiceMinutes);

  const lineChartData = {
    labels: labels.length ? labels : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Messages",
        data: messageCounts.length ? messageCounts : [0, 0, 0, 0, 0, 0, 0],
        borderColor: "rgb(99, 102, 241)",
        backgroundColor: "rgba(99, 102, 241, 0.15)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "rgb(99, 102, 241)",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const barChartData = {
    labels: labels.length ? labels : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Voice Minutes",
        data: voiceMinutes.length ? voiceMinutes : [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: "rgba(168, 85, 247, 0.6)",
        borderRadius: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
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

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Analytics & Trends"]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <TrendingUp className="w-6 h-6 text-indigo-400" />
            <span>Activity Analytics & Trends</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time chat activity, voice channels engagement, and server member leaderboards.
          </p>
        </div>

        {/* Graphs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chat Messages Line Chart */}
          <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-white">7-Day Message Volume</h3>
              </div>
              <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
                Rolling 7 Days
              </span>
            </div>
            <div className="h-64">
              <Line data={lineChartData} options={chartOptions} />
            </div>
          </div>

          {/* Voice Activity Bar Chart */}
          <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Mic className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-white">7-Day Voice Channel Minutes</h3>
              </div>
              <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
                Total Minutes
              </span>
            </div>
            <div className="h-64">
              <Bar data={barChartData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* Leaderboards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
          {/* Top Chatters */}
          <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Top Active Chatters</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Messages</span>
            </div>

            <div className="space-y-2">
              {data?.topChatters && data.topChatters.length > 0 ? (
                data.topChatters.map((user, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 font-bold text-xs text-slate-500 font-mono">
                        #{idx + 1}
                      </span>
                      <img
                        src={
                          user.avatar
                            ? `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png`
                            : "https://cdn.discordapp.com/embed/avatars/0.png"
                        }
                        alt=""
                        className="w-8 h-8 rounded-full ring-1 ring-indigo-500/30 object-cover"
                      />
                      <span className="text-xs font-semibold text-white">
                        {user.username || user.userId}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-indigo-400 font-mono">
                      {user.count.toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  No chat activity recorded yet for this week.
                </div>
              )}
            </div>
          </div>

          {/* Top Voice Users */}
          <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Top Voice Users</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">Time</span>
            </div>

            <div className="space-y-2">
              {data?.topVoice && data.topVoice.length > 0 ? (
                data.topVoice.map((user, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 font-bold text-xs text-slate-500 font-mono">
                        #{idx + 1}
                      </span>
                      <img
                        src={
                          user.avatar
                            ? `https://cdn.discordapp.com/avatars/${user.userId}/${user.avatar}.png`
                            : "https://cdn.discordapp.com/embed/avatars/0.png"
                        }
                        alt=""
                        className="w-8 h-8 rounded-full ring-1 ring-purple-500/30 object-cover"
                      />
                      <span className="text-xs font-semibold text-white">
                        {user.username || user.userId}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-purple-400 font-mono">
                      {user.minutes} min
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-500">
                  No voice minutes recorded yet for this week.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
