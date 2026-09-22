import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { syncAuthSession } from "../api/client";
import {
  Search,
  ExternalLink,
  Settings,
  ShieldAlert,
  RotateCw,
  Crown,
  Shield,
  CheckCircle2,
} from "lucide-react";

export default function ServerSelectorPage({ user, botInfo, onUserUpdate }) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("manageable"); // "manageable" or "all"
  const [refreshing, setRefreshing] = useState(false);

  const guilds = user?.guilds || [];
  const botGuildIds = new Set((botInfo?.guildIds || []).map((id) => String(id)));

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await syncAuthSession();
      if (data?.guilds && onUserUpdate) {
        onUserUpdate(data);
      }
    } catch (err) {
      console.error("Failed to refresh guilds:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = guilds.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filterMode === "manageable") {
      const perms = BigInt(g.permissions || "0");
      const canManage =
        g.owner === true ||
        (perms & 8n) === 8n ||
        (perms & 32n) === 32n ||
        g.canManage === true;
      return canManage;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      {/* Glows */}
      <div className="fixed top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-100px] right-[-100px] w-[550px] h-[550px] rounded-full bg-purple-600/15 blur-[150px] pointer-events-none -z-10" />

      {/* Top Navbar */}
      <Navbar user={user} botInfo={botInfo} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1">
        {/* Header with Search & Refresh */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Select a Server
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Choose a Discord server to configure settings, automations, and view analytics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-50"
              title="Sync latest servers and permissions from Discord"
            >
              <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-400" : ""}`} />
              <span>{refreshing ? "Syncing..." : "Sync Servers"}</span>
            </button>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search servers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-3">
          <button
            onClick={() => setFilterMode("manageable")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === "manageable"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            Admin Servers
          </button>
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === "all"
                ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
            }`}
          >
            All Servers ({guilds.length})
          </button>
        </div>

        {/* Server Grid */}
        {filtered.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl text-center border border-white/5 max-w-md mx-auto space-y-4">
            <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-white mb-1">No Matching Servers</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {search
                  ? "No matching servers found for your search query."
                  : filterMode === "manageable"
                  ? "You don't have Administrator or Manage Server permissions in any server currently in your session. Try clicking 'Sync Servers' above or switch to 'All Servers'."
                  : "No servers found in your Discord account."}
              </p>
            </div>
            {filterMode === "manageable" && (
              <button
                onClick={() => setFilterMode("all")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-indigo-300 transition-all border border-white/5"
              >
                <span>View All Servers</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((guild) => {
              const perms = BigInt(guild.permissions || "0");
              const isOwner = guild.owner === true;
              const hasAdmin = (perms & 8n) === 8n;
              const hasManage = (perms & 32n) === 32n;
              const canManage = isOwner || hasAdmin || hasManage || guild.canManage === true;

              // Check bot presence reliably across both API sources and string IDs
              const isBotPresent =
                guild.botPresent === true ||
                botGuildIds.has(String(guild.id));

              const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${
                botInfo?.id || "1468995670797975614"
              }&scope=bot%20applications.commands&permissions=8&guild_id=${guild.id}`;

              return (
                <div
                  key={guild.id}
                  className="glass-card p-5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Top Identity Row */}
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shrink-0">
                        <div className="w-full h-full bg-zinc-900 rounded-full flex items-center justify-center overflow-hidden">
                          {guild.icon ? (
                            <img
                              src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                              alt=""
                              className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <span className="font-bold text-xs text-indigo-300 font-mono">
                              {guild.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-white truncate">{guild.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              <Crown className="w-2.5 h-2.5 text-amber-400" />
                              <span>Owner</span>
                            </span>
                          ) : hasAdmin ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                              <Shield className="w-2.5 h-2.5 text-indigo-400" />
                              <span>Admin</span>
                            </span>
                          ) : hasManage ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              <span>Manager</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-white/10">
                              <span>Member</span>
                            </span>
                          )}

                          <span className="text-[10px] font-mono text-slate-500">
                            {isBotPresent ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Active
                              </span>
                            ) : (
                              <span className="text-slate-400">Not Added</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="pt-2">
                    {isBotPresent ? (
                      canManage ? (
                        <Link
                          to={`/dashboard/${guild.id}`}
                          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.01]"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>Manage Server</span>
                        </Link>
                      ) : (
                        <div className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/5 text-slate-400 border border-white/10 select-none cursor-not-allowed">
                          <span>Active • Admin Required</span>
                        </div>
                      )
                    ) : canManage ? (
                      <a
                        href={inviteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all hover:scale-[1.01]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Invite Bot</span>
                      </a>
                    ) : (
                      <div className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-medium bg-slate-900/40 text-slate-500 border border-white/5 select-none">
                        <span>No Admin Permissions</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer botInfo={botInfo} />
    </div>
  );
}
