import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Command, ArrowRight, ShieldCheck, Pin, Terminal, Activity, Sliders, Server, History, ScrollText, UserPlus } from "lucide-react";

export default function CommandPalette({ isOpen, setIsOpen, currentGuild }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  const features = currentGuild ? [
    { label: "Dashboard Overview", path: `/dashboard/${currentGuild.id}`, icon: Server },
    { label: "Welcome & Leave Gatekeeper", path: `/dashboard/${currentGuild.id}/welcome`, icon: UserPlus },
    { label: "Server Audit Logs", path: `/dashboard/${currentGuild.id}/audit-logs`, icon: ScrollText },
    { label: "Analytics & Metrics", path: `/dashboard/${currentGuild.id}/analytics`, icon: Activity },
    { label: "Verification Settings", path: `/dashboard/${currentGuild.id}/verification`, icon: ShieldCheck },
    { label: "Command Restrictions", path: `/dashboard/${currentGuild.id}/commands`, icon: Terminal },
    { label: "Sticky Messages", path: `/dashboard/${currentGuild.id}/sticky`, icon: Pin },
    { label: "Bot Settings", path: `/dashboard/${currentGuild.id}/config`, icon: Sliders },
    { label: "Permissions Vulnerability Audit", path: `/dashboard/${currentGuild.id}/permissions`, icon: History },
  ] : [
    { label: "Return Home", path: "/", icon: Server }
  ];

  const filtered = features.filter((f) => f.label.toLowerCase().includes(query.toLowerCase()));

  const handleSelect = (path) => {
    setIsOpen(false);
    navigate(path);
    setQuery("");
  };

  return (
    <div className="fixed inset-0 z-100 flex items-start justify-center pt-32 sm:pt-48">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity" 
        onClick={() => setIsOpen(false)}
      />

      {/* Palette Modal */}
      <div className="relative w-full max-w-xl mx-4 glass-panel border border-white/10 rounded-2xl shadow-2xl overflow-hidden bg-slate-900/90 z-10 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center px-4 border-b border-white/10">
          <Search className="w-5 h-5 text-slate-400 mr-3" />
          <input
            type="text"
            className="w-full bg-transparent py-4 text-sm text-white placeholder-slate-400 focus:outline-none"
            placeholder="Type a feature name or destination... (Esc to exit)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded">ESC</kbd>
        </div>

        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              No matching modules found for "{query}".
            </div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => handleSelect(item.path)}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-slate-300 hover:text-white transition-all text-left text-xs font-medium group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5 text-slate-400 group-hover:text-indigo-400 group-hover:bg-indigo-500/10 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{item.label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 text-slate-400 transition-all" />
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
