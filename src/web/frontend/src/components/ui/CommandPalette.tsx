import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Command, ArrowRight, ShieldCheck, Pin, Terminal, Activity, Sliders, Server, History, ScrollText, UserPlus, PenTool, Bot, Trophy, Award, Image as ImageIcon, ShieldAlert, AlertTriangle } from "lucide-react";

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
    { label: "Dashboard Overview", path: `/dashboard/${currentGuild.id}`, icon: Server, keywords: "home main server stats overview" },
    { label: "Analytics & Activity Trends", path: `/dashboard/${currentGuild.id}/analytics`, icon: Activity, keywords: "analytics voice chat leaderboard top chatters metrics traffic trends" },
    { label: "Permissions & Risk Vulnerability Audit", path: `/dashboard/${currentGuild.id}/permissions`, icon: ShieldAlert, keywords: "permissions audit administrator who has admin elevated roles danger perms security" },
    { label: "Server Audit Logs & Live Stream", path: `/dashboard/${currentGuild.id}/audit-logs?tab=stream`, icon: ScrollText, keywords: "audit logs live stream history events tracking modlogs deleted messages kicks bans" },
    { label: "Log Channels Routing", path: `/dashboard/${currentGuild.id}/audit-logs?tab=channels`, icon: ScrollText, keywords: "log channels route destination channels voice logs role logs mod logs routing pipeline" },
    { label: "Warning Escalations & Punishments", path: `/dashboard/${currentGuild.id}/warning-punishments`, icon: AlertTriangle, keywords: "warnings strikes timeouts kicks bans escalation threshold moderation punishments" },
    { label: "Staff Dashboard Access Roles", path: `/dashboard/${currentGuild.id}/admin-roles`, icon: ShieldCheck, keywords: "admin roles staff access mod perms dashboard access bot admins" },
    { label: "Verification Gate", path: `/dashboard/${currentGuild.id}/verification`, icon: ShieldCheck, keywords: "verification captcha gatekeeper unverified role gate antiraid" },
    { label: "Welcome & Leave Gatekeeper", path: `/dashboard/${currentGuild.id}/welcome`, icon: UserPlus, keywords: "welcome leave autorole onboarding verification message card join leave" },
    { label: "Leaderboard Auto-Roles", path: `/dashboard/${currentGuild.id}/autorole`, icon: Award, keywords: "autorole auto roles leaderboard rewards active talkers voice rank" },
    { label: "Supporter Rewards", path: `/dashboard/${currentGuild.id}/supporter`, icon: Trophy, keywords: "supporter booster custom roles rewards perks patron" },
    { label: "Message Studio", path: `/dashboard/${currentGuild.id}/message-studio`, icon: PenTool, keywords: "message studio embed builder webhook announcements creator" },
    { label: "Autoresponder", path: `/dashboard/${currentGuild.id}/autoresponder`, icon: Bot, keywords: "autoresponder triggers keywords bot replies automation responses" },
    { label: "Sticky Messages", path: `/dashboard/${currentGuild.id}/sticky`, icon: Pin, keywords: "sticky pin messages auto stick channel notice recurring" },
    { label: "Media-Only Channels", path: `/dashboard/${currentGuild.id}/media-only`, icon: ImageIcon, keywords: "media only gallery attachments photos clips channels" },
    { label: "Command Permissions & Restrictions", path: `/dashboard/${currentGuild.id}/commands`, icon: Terminal, keywords: "commands disable allow channels roles restriction rules command permissions" },
    { label: "Bot Settings", path: `/dashboard/${currentGuild.id}/config`, icon: Sliders, keywords: "settings bot prefix voice role config setup general" },
  ] : [
    { label: "Return Home", path: "/", icon: Server, keywords: "home landing exit" }
  ];

  const q = query.toLowerCase().trim();
  const filtered = features.filter((f) =>
    f.label.toLowerCase().includes(q) || (f.keywords && f.keywords.toLowerCase().includes(q))
  );

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
