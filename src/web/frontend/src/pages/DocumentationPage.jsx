import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { getPublicCommands } from "../api/client";
import {
  Terminal,
  Search,
  Shield,
  Sliders,
  Hash,
  Wrench,
  BarChart3,
  Volume2,
  Copy,
  Check,
  Sparkles,
  Layers,
  ChevronRight,
  BookOpen,
  ArrowRight,
} from "lucide-react";

const CATEGORY_META = {
  all: { name: "All Commands", icon: Layers },
  moderation: { name: "Moderation", icon: Shield, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" },
  admin: { name: "Administration", icon: Sliders, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  utility: { name: "Utility", icon: Wrench, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20" },
  channels: { name: "Channels", icon: Hash, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  voice: { name: "Voice Tools", icon: Volume2, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
  analytics: { name: "Analytics", icon: BarChart3, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
};

export default function DocumentationPage({ user, botInfo }) {
  const [commands, setCommands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [copiedCmd, setCopiedCmd] = useState(null);

  useEffect(() => {
    getPublicCommands()
      .then((data) => {
        setCommands(data.commands || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (text, name) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(name);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const categories = useMemo(() => {
    const set = new Set(commands.map((c) => c.category));
    return ["all", ...Array.from(set)];
  }, [commands]);

  const filteredCommands = useMemo(() => {
    return commands.filter((cmd) => {
      const matchCat = activeCategory === "all" || cmd.category === activeCategory;
      if (!matchCat) return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const matchName = cmd.name.toLowerCase().includes(q);
      const matchDesc = (cmd.description || "").toLowerCase().includes(q);
      const matchAlias = (cmd.aliases || []).some((a) => a.toLowerCase().includes(q));
      return matchName || matchDesc || matchAlias;
    });
  }, [commands, activeCategory, search]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased relative overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background glow orbs */}
      <div className="fixed top-[-140px] left-[-100px] w-[600px] h-[600px] rounded-full bg-indigo-600/15 blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-140px] right-[-100px] w-[600px] h-[600px] rounded-full bg-purple-600/15 blur-[160px] pointer-events-none -z-10" />

      {/* Top Navbar */}
      <Navbar user={user} botInfo={botInfo} />

      {/* Hero Header */}
      <div className="border-b border-white/5 bg-slate-950/40 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-4">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Bot Documentation & Commands Guide</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            Commands & Features
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Explore all slash <span className="font-mono text-indigo-300">(/)</span> and prefix <span className="font-mono text-indigo-300">(!)</span> commands available in Digital Vigital. Every command supports rich parameters, role hierarchy checks, and audit logging.
          </p>

          {/* Quick Search Bar */}
          <div className="mt-8 max-w-xl relative">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search commands by name, alias, or keyword (e.g. ban, avatar, afk)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-xl transition-all"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-10 flex-1 space-y-8">
        {/* Category Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-4">
          {categories.map((catKey) => {
            const meta = CATEGORY_META[catKey] || { name: catKey.charAt(0).toUpperCase() + catKey.slice(1), icon: Terminal };
            const Icon = meta.icon;
            const count = catKey === "all" ? commands.length : commands.filter((c) => c.category === catKey).length;
            const isActive = activeCategory === catKey;

            return (
              <button
                key={catKey}
                onClick={() => setActiveCategory(catKey)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                    : "bg-slate-900/60 hover:bg-slate-900 border border-white/5 text-slate-400 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{meta.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${isActive ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Commands Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400 font-medium">Loading command documentation...</p>
          </div>
        ) : filteredCommands.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-slate-900/30">
            <Terminal className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="font-bold text-sm text-slate-300">No commands found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No commands matched "{search}". Try searching with a different keyword or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCommands.map((cmd) => {
              const meta = CATEGORY_META[cmd.category] || CATEGORY_META.utility;
              const isCopied = copiedCmd === cmd.name;

              return (
                <div
                  key={cmd.name}
                  className="glass-card p-5 sm:p-6 rounded-3xl border border-white/5 hover:border-white/15 transition-all shadow-xl flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header: Title & Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-xs font-bold">
                          /{cmd.name}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">/{cmd.name}</span>
                            <span className="text-xs text-slate-400 font-mono">!{cmd.name}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
                            {cmd.category}
                          </span>
                        </div>
                      </div>

                      {/* Permission Badge */}
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-lg border font-mono ${
                        cmd.adminOnly
                          ? "bg-rose-500/10 text-rose-300 border-rose-500/20"
                          : cmd.modOnly
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                      }`}>
                        {cmd.permissionLevel}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {cmd.description}
                    </p>

                    {/* Aliases */}
                    {cmd.aliases && cmd.aliases.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-slate-500 font-mono">Aliases:</span>
                        {cmd.aliases.map((alias) => (
                          <span
                            key={alias}
                            className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] font-mono text-slate-300"
                          >
                            !{alias}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Options Breakdown */}
                    {cmd.options && cmd.options.length > 0 && (
                      <div className="pt-2 border-t border-white/5 space-y-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider font-mono block">
                          Parameters:
                        </span>
                        <div className="space-y-1">
                          {cmd.options.map((opt) => (
                            <div
                              key={opt.name}
                              className="text-[11px] flex items-baseline gap-2 bg-slate-900/60 p-2 rounded-xl border border-white/5"
                            >
                              <span className="font-mono text-indigo-300 font-semibold">
                                {opt.name}
                              </span>
                              {opt.required ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-300 font-mono">required</span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">optional</span>
                              )}
                              <span className="text-slate-400 text-[10px] truncate">
                                {opt.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Usage Codebox with Copy Action */}
                  <div className="pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-white/10 text-xs font-mono">
                      <span className="text-indigo-300 truncate mr-2">
                        {cmd.prefixUsage}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(cmd.prefixUsage, cmd.name)}
                        className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                        title="Copy command syntax"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Global Footer */}
      <Footer botInfo={botInfo} />
    </div>
  );
}
