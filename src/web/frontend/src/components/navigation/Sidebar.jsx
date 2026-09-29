import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, ShieldCheck, Pin, Image as ImageIcon,
  Bot, Terminal, Shield, ShieldAlert, Sliders, ArrowLeftRight, X, AlertTriangle, Trophy, Award
} from "lucide-react";

export default function Sidebar({ currentGuild, botInfo, mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const botAvatar = botInfo?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png";

  const navGroups = [
    {
      group: "OVERVIEW",
      items: [
        { id: "overview", label: "Dashboard", icon: LayoutDashboard, path: `/dashboard/${currentGuild.id}`, exact: true },
        { id: "analytics", label: "Analytics & Trends", icon: TrendingUp, path: `/dashboard/${currentGuild.id}/analytics` }
      ]
    },
    {
      group: "COMMUNITY",
      items: [
        { id: "verification", label: "Verification Gate", icon: ShieldCheck, path: `/dashboard/${currentGuild.id}/verification` },
        { id: "sticky", label: "Sticky Messages", icon: Pin, path: `/dashboard/${currentGuild.id}/sticky` },
        { id: "media_only", label: "Media-Only Channels", icon: ImageIcon, path: `/dashboard/${currentGuild.id}/media-only` },
        { id: "supporter", label: "Supporter Rewards", icon: Trophy, path: `/dashboard/${currentGuild.id}/supporter` },
        { id: "autorole", label: "Leaderboard Auto-Roles", icon: Award, path: `/dashboard/${currentGuild.id}/autorole` }
      ]
    },
    {
      group: "AUTOMATION",
      items: [
        { id: "autoresponder", label: "Autoresponder", icon: Bot, path: `/dashboard/${currentGuild.id}/autoresponder` },
        { id: "commands", label: "Command Restrictions", icon: Terminal, path: `/dashboard/${currentGuild.id}/commands` }
      ]
    },
    {
      group: "MODERATION",
      items: [
        { id: "admin_roles", label: "Admin Roles", icon: Shield, path: `/dashboard/${currentGuild.id}/admin-roles` },
        { id: "permissions", label: "Permissions Audit", icon: ShieldAlert, path: `/dashboard/${currentGuild.id}/permissions` },
        { id: "warning_punishments", label: "Warning Punishments", icon: AlertTriangle, path: `/dashboard/${currentGuild.id}/warning-punishments` }
      ]
    },
    {
      group: "SYSTEM",
      items: [
        { id: "config", label: "Bot Settings", icon: Sliders, path: `/dashboard/${currentGuild.id}/config` }
      ]
    }
  ];

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 w-64 glass-panel border-r border-white/10 flex flex-col z-50 transform transition-transform duration-300 shrink-0 md:sticky md:top-0 md:left-0 md:h-screen select-none ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}`}>
        {/* Brand Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-[0.03] font-display text-6xl pointer-events-none text-brand-crimson select-none leading-none">डिजिटल</div>
          <Link to="/" className="flex items-center gap-3 group relative z-10" onClick={() => setMobileOpen(false)}>
            <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 shadow-lg shrink-0 group-hover:border-brand-crimson/50 transition-colors">
              <img src={botAvatar} alt="DV" className="w-full h-full object-cover rounded-full" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-sm tracking-tight text-slate-100 uppercase">DV Command</span>
              <span className="text-[10px] font-mono text-brand-crimson tracking-wider">SYSTEM ACTIVE</span>
            </div>
          </Link>
          <div className="flex items-center relative z-10">
            <button className="md:hidden p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white" onClick={() => setMobileOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Server Context Badge */}
        <div className="p-3 m-3 rounded-xl bg-slate-900/80 border border-white/5 flex items-center gap-3 shrink-0 group relative overflow-hidden">
          <div className="w-10 h-10 rounded-full border border-white/10 p-[2px] shrink-0 bg-slate-950">
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-slate-800">
              {currentGuild.icon ? (
                <img src={`https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png`} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-xs text-slate-300">{currentGuild.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0 z-10">
            <p className="font-semibold text-xs text-slate-200 truncate">{currentGuild.name}</p>
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-white font-mono mt-0.5 transition-colors" title="Switch Server">
              <ArrowLeftRight className="w-3 h-3" /> Change
            </Link>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-5 overflow-y-auto min-h-0 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.group}>
              <div className="px-3 mb-2 text-[10px] font-mono tracking-widest text-slate-500 uppercase">{group.group}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
                  
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                        isActive
                          ? "bg-white/10 text-white shadow-sm border border-white/10"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-brand-crimson" : "text-slate-500"}`} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* System Status Footer */}
        <div className="p-4 border-t border-white/5 bg-slate-900/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success"></span>
              </span>
              <span className="text-xs font-semibold text-slate-300">Digital Vigital</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">Operational</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 flex justify-between items-center px-1">
             <span>Press <kbd className="font-mono bg-slate-800 px-1 py-0.5 rounded text-slate-300">Ctrl K</kbd> to search</span>
          </div>
        </div>
      </aside>
    </>
  );
}
