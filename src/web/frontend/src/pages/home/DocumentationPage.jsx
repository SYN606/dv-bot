import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../components/navigation/Navbar";
import Footer from "../../components/navigation/Footer";
import { getPublicCommands } from "../../api/client";
import {
  Terminal,
  Search,
  Shield,
  Sliders,
  Hash,
  Wrench,
  BarChart3,
  Volume2,
  Check,
  Layers,
  BookOpen,
} from "lucide-react";

const CATEGORY_META = {
  all: { name: "All Commands", icon: Layers },
  moderation: { name: "Moderation", icon: Shield },
  admin: { name: "Administration", icon: Sliders },
  utility: { name: "Utility", icon: Wrench },
  channels: { name: "Channels", icon: Hash },
  voice: { name: "Voice Tools", icon: Volume2 },
  analytics: { name: "Analytics", icon: BarChart3 },
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
    return ["all", ...Array.from(set).sort()];
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
    <div className="min-h-screen bg-transparent text-neutral-200 flex flex-col antialiased selection:bg-crimson/30 selection:text-white relative overflow-x-hidden">
      
      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none z-0 transform-gpu" style={{
        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)'
      }} />

      {/* Gentle ambient lighting orbs */}
      <div className="fixed top-[-120px] left-[-100px] w-[500px] h-[500px] rounded-full bg-crimson/5 blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-crimson/5 blur-[140px] pointer-events-none -z-10" />

      {/* Top Navbar */}
      <Navbar user={user} botInfo={botInfo} />

      {/* Hero Header */}
      <div className="border-b border-white/5 bg-black/40 backdrop-blur-xl relative z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white text-xs font-semibold mb-4 shadow-lg">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Bot Documentation & Commands Guide</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-crimson/80 bg-clip-text text-transparent">
            Commands & Features
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-2 max-w-2xl leading-relaxed">
            Explore all slash <span className="font-mono text-white">(/)</span> and prefix <span className="font-mono text-white">(!)</span> commands available in Digital Vigital. Every command supports rich parameters, role hierarchy checks, and audit logging.
          </p>

          {/* Quick Search Bar */}
          <div className="mt-8 max-w-xl relative group">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-neutral-500 group-focus-within:text-crimson transition-colors" />
            <input
              type="text"
              placeholder="Search commands by name, alias, or keyword (e.g. ban, avatar, afk)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl glass-card border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-crimson/50 focus:ring-1 focus:ring-crimson/50 shadow-xl transition-all"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-10 flex-1 space-y-8 relative z-10">
        {/* Category Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-4">
          {categories.map((catKey) => {
            const meta = CATEGORY_META[catKey.toLowerCase()] || { name: catKey.charAt(0).toUpperCase() + catKey.slice(1), icon: Terminal };
            const Icon = meta.icon;
            const count = catKey === "all" ? commands.length : commands.filter((c) => c.category === catKey).length;
            const isActive = activeCategory === catKey;

            return (
              <button
                key={catKey}
                onClick={() => setActiveCategory(catKey)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-crimson/10 border border-crimson/20 text-white shadow-lg shadow-crimson/10"
                    : "glass-card border border-white/5 text-neutral-400 hover:text-white hover:border-white/10 hover:bg-white/5"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-crimson' : ''}`} />
                <span>{meta.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${isActive ? "bg-crimson/20 text-white" : "bg-white/5 text-neutral-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Commands Grid */}
        {loading ? (
          <div className="text-center py-20 glass-card rounded-3xl border border-white/5">
            <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-crimson animate-spin mx-auto mb-3" />
            <p className="text-xs text-neutral-400 font-medium">Loading command documentation...</p>
          </div>
        ) : filteredCommands.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl glass-card">
            <Terminal className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="font-bold text-sm text-neutral-400">No commands found</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              No commands matched "{search}". Try searching with a different keyword or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommands.map((cmd) => {
              const meta = CATEGORY_META[cmd.category?.toLowerCase()] || CATEGORY_META.utility;
              const isCopied = copiedCmd === cmd.name;

              return (
                <div
                  key={cmd.name}
                  className="glass-card p-5 sm:p-6 rounded-3xl border border-white/5 hover:border-crimson/30 transition-all hover:shadow-[0_0_20px_rgba(220,20,60,0.05)] flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3">
                    {/* Header: Title & Badges */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-crimson/5 text-crimson border border-white/10 font-mono text-xs font-bold shadow-inner transition-colors group-hover:bg-crimson/10 group-hover:border-crimson/20">
                          <meta.icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white">/{cmd.name}</span>
                          </div>
                          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider font-mono mt-1 block">
                            {cmd.category}
                          </span>
                        </div>
                      </div>

                      {/* Permission Badge */}
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border font-mono ${ cmd.adminOnly ? "bg-red-500/10 text-red-400 border-red-500/20" : cmd.modOnly ? "bg-orange-500/10 text-orange-400 border-orange-500/20" : cmd.requiredPermissionName ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }`}>
                        {cmd.adminOnly ? "Bot Admin" : cmd.modOnly ? "Moderator" : cmd.requiredPermissionName ? cmd.requiredPermissionName : "Everyone"}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {cmd.description}
                    </p>

                    {/* Invocation syntax badges */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                       {(!cmd.prefixOnly && cmd.slashBuilder) && (
                          <span className="text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                            [Slash]
                          </span>
                       )}
                       {(!cmd.slashOnly) && (
                          <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded">
                            [Prefix]
                          </span>
                       )}
                       {(cmd.aliases && cmd.aliases.length > 0) && (
                         <span className="text-[10px] font-mono text-neutral-500 flex items-center pt-0.5">
                           Aliases: {cmd.aliases.join(", ")}
                         </span>
                       )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
