import React, { useState, useMemo } from "react";
import { Trophy, MessageSquare, Mic, Search } from "lucide-react";
import { getDiscordAvatarUrl } from "../../utils/discord";

export default function Leaderboard({ topChatters = [], topVoice = [], loading }) {
  const [tab, setTab] = useState("chat");
  const [scope, setScope] = useState("weekly");
  const [search, setSearch] = useState("");

  const filteredData = useMemo(() => {
    const rawData = tab === "chat" ? topChatters : topVoice;
    if (!search.trim()) return rawData;
    const lower = search.toLowerCase();
    return rawData.filter((u) => u.username?.toLowerCase().includes(lower));
  }, [tab, topChatters, topVoice, search]);

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-3xl border border-white/5 space-y-6 mt-8 animate-pulse">
        <div className="h-8 w-48 bg-white/5 rounded"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 w-full bg-white/5 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-4 sm:p-8 rounded-3xl border border-white/5 mt-8 space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-brand-crimson border border-white/10">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Community Leaderboard</h2>
            <p className="text-xs text-slate-400">Most active members by engagement</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tab Toggle */}
          <div className="flex items-center bg-slate-900 border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setTab("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                tab === "chat" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setTab("voice")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                tab === "voice" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice</span>
            </button>
          </div>

          {/* Scope Toggle */}
          <div className="flex items-center bg-slate-900 border border-white/10 rounded-lg p-1">
            <button
              onClick={() => setScope("weekly")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                scope === "weekly" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setScope("total")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                scope === "total" ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              All-Time
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-auto">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-48 pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {filteredData.length === 0 ? (
          <div className="text-center py-12 text-xs text-slate-500 border border-dashed border-white/5 rounded-2xl">
            No active members found matching your search.
          </div>
        ) : (
          filteredData.map((u, idx) => {
            let medalClass = "text-slate-500 bg-slate-900 border-white/5";
            let medalText = `#${idx + 1}`;
            
            if (idx === 0) {
              medalClass = "text-yellow-400 bg-yellow-400/10 border-yellow-400/30 shadow-lg shadow-yellow-400/10";
              medalText = "1st";
            } else if (idx === 1) {
              medalClass = "text-slate-300 bg-slate-300/10 border-slate-300/30";
              medalText = "2nd";
            } else if (idx === 2) {
              medalClass = "text-amber-600 bg-amber-600/10 border-amber-600/30";
              medalText = "3rd";
            }

            const isChat = tab === "chat";
            const val = isChat
              ? (scope === "weekly" ? (u.weeklyMessages ?? u.messages ?? 0) : (u.totalMessages ?? u.messages ?? 0))
              : (scope === "weekly" ? (u.weeklyMinutes ?? u.vcMinutes ?? 0) : (u.totalMinutes ?? u.vcMinutes ?? 0));

            return (
              <div key={u.userId || idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 rounded-2xl bg-slate-900/40 hover:bg-slate-900 border border-white/5 transition-colors gap-3">
                <div className="flex items-center gap-3.5">
                  <span className={`w-8 h-8 rounded-lg border flex items-center justify-center text-[10px] font-bold font-mono ${medalClass}`}>
                    {medalText}
                  </span>
                  <img
                    src={getDiscordAvatarUrl(u)}
                    alt={u.username}
                    className="w-8 h-8 rounded-full bg-slate-800"
                    loading="lazy"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{u.username || "Unknown"}</div>
                    <div className="text-[10px] text-slate-500 font-mono hidden sm:block">ID: {u.userId || "N/A"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:justify-end pl-11 sm:pl-0">
                  <span className="text-sm font-mono font-bold text-white">
                    {isChat ? val.toLocaleString() : `${Math.floor(val / 60)}h ${val % 60}m`}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                    {isChat ? "msgs" : "voice"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

