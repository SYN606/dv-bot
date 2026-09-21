import React, { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { Search, ExternalLink, Settings, ShieldAlert } from "lucide-react";

export default function ServerSelectorPage({ user, botInfo }) {
  const [search, setSearch] = useState("");

  const guilds = user?.guilds || [];
  const botGuildIds = new Set(botInfo?.guildIds || []);

  const filtered = guilds.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      {/* Glows */}
      <div className="fixed top-[-100px] left-[-100px] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-100px] right-[-100px] w-[550px] h-[550px] rounded-full bg-purple-600/15 blur-[150px] pointer-events-none -z-10" />

      {/* Top Navbar */}
      <Navbar user={user} botInfo={botInfo} />

      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-1">
        {/* Header with Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Select a Server
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Choose a Discord server to configure settings, automations, and view analytics.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
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

        {/* Server Grid */}
        {filtered.length === 0 ? (
          <div className="glass-panel p-12 rounded-3xl text-center border border-white/5 max-w-md mx-auto">
            <ShieldAlert className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Servers Found</h3>
            <p className="text-xs text-slate-400">
              {search
                ? "No matching servers found for your search query."
                : "You don't have Administrator permissions in any Discord servers."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((guild) => {
              const isBotPresent = botGuildIds.has(guild.id) || guild.botPresent;
              const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${
                botInfo?.id || ""
              }&scope=bot%20applications.commands&permissions=8&guild_id=${guild.id}`;

              return (
                <div
                  key={guild.id}
                  className="glass-card p-5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center gap-3.5 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shrink-0">
                      <div className="w-full h-full bg-slate-900 rounded-[11px] flex items-center justify-center overflow-hidden">
                        {guild.icon ? (
                          <img
                            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
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
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isBotPresent ? "bg-emerald-400" : "bg-slate-500"
                          }`}
                        />
                        <span className="text-[10px] font-mono text-slate-400">
                          {isBotPresent ? "Active" : "Not Joined"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isBotPresent ? (
                      <Link
                        to={`/dashboard/${guild.id}`}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Manage Server</span>
                      </Link>
                    ) : (
                      <a
                        href={inviteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Invite Bot</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
