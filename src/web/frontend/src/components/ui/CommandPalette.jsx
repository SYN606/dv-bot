import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Command, ArrowRight, ShieldCheck, Pin, Terminal, Activity, Sliders, Server, History, ScrollText } from "lucide-react";

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
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden glass-panel animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder:text-slate-500 font-sans text-lg"
            placeholder="Type a command or search feature..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <kbd className="px-2 py-0.5 rounded text-xs bg-slate-800 border border-slate-700 text-slate-400 font-mono">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.length > 0 ? (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => handleSelect(item.path)}
                  className="w-full flex items-center justify-between p-3 rounded-lg text-left text-slate-200 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                </button>
              );
            })
          ) : (
            <div className="p-4 text-center text-sm text-slate-500">
              No matching features found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
