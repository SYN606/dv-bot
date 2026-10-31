import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, ShieldCheck, Pin, Image as ImageIcon,
  Bot, Terminal, Shield, ShieldAlert, Sliders, ArrowLeftRight, X, AlertTriangle, Trophy, Award, PenTool, LogOut, ScrollText, UserPlus
} from "lucide-react";
import SuperuserBadge from "../ui/SuperuserBadge";
import { getDiscordAvatarUrl } from "../../utils/discord";

export default function Sidebar({ currentGuild, botInfo, user, mobileOpen, setMobileOpen }) {
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
      group: "SECURITY & MODERATION",
      items: [
        { id: "permissions", label: "Permissions & Risk Audit", icon: ShieldAlert, path: `/dashboard/${currentGuild.id}/permissions` },
        { id: "audit_logs", label: "Logs & Audit Center", icon: ScrollText, path: `/dashboard/${currentGuild.id}/audit-logs` },
        { id: "warning_punishments", label: "Warning Escalations", icon: AlertTriangle, path: `/dashboard/${currentGuild.id}/warning-punishments` },
        { id: "admin_roles", label: "Staff Dashboard Access", icon: Shield, path: `/dashboard/${currentGuild.id}/admin-roles` },
      ]
    },
    {
      group: "COMMUNITY & ONBOARDING",
      items: [
        { id: "verification", label: "Verification Gate", icon: ShieldCheck, path: `/dashboard/${currentGuild.id}/verification` },
        { id: "welcome", label: "Welcome & Leave", icon: UserPlus, path: `/dashboard/${currentGuild.id}/welcome` },
        { id: "autorole", label: "Leaderboard Auto-Roles", icon: Award, path: `/dashboard/${currentGuild.id}/autorole` },
        { id: "supporter", label: "Supporter Rewards", icon: Trophy, path: `/dashboard/${currentGuild.id}/supporter` },
      ]
    },
    {
      group: "ENGAGEMENT & CONTENT",
      items: [
        { id: "message_studio", label: "Message Studio", icon: PenTool, path: `/dashboard/${currentGuild.id}/message-studio` },
        { id: "autoresponder", label: "Autoresponder", icon: Bot, path: `/dashboard/${currentGuild.id}/autoresponder` },
        { id: "sticky", label: "Sticky Messages", icon: Pin, path: `/dashboard/${currentGuild.id}/sticky` },
        { id: "media_only", label: "Media-Only Channels", icon: ImageIcon, path: `/dashboard/${currentGuild.id}/media-only` }
      ]
    },
    {
      group: "SYSTEM & CONTROLS",
      items: [
        { id: "commands", label: "Command Permissions", icon: Terminal, path: `/dashboard/${currentGuild.id}/commands` },
        { id: "config", label: "Bot Settings", icon: Sliders, path: `/dashboard/${currentGuild.id}/config` }
      ]
    }
  ];

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 w-72 bg-[#0a0d16] border-r border-white/[0.06] flex flex-col z-50 transform transition-transform duration-300 shrink-0 md:sticky md:top-0 md:left-0 md:h-screen select-none ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}`}>
        {/* Brand Header */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between shrink-0 relative overflow-hidden bg-[#0c0f1a]">
          <Link to="/" className="flex items-center gap-3 group relative z-10" onClick={() => setMobileOpen(false)}>
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-md shrink-0 group-hover:border-indigo-500/50 transition-all bg-slate-950">
              <img src={botAvatar} alt="DV" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-base tracking-tight text-white leading-tight">DV Command</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[11px] font-mono text-emerald-400 font-semibold tracking-wider uppercase">ONLINE</span>
              </div>
            </div>
          </Link>
          <div className="flex items-center relative z-10">
            <button className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white" onClick={() => setMobileOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Server Context Switcher Card */}
        <div className="p-3 mx-3 my-2.5 rounded-xl bg-[#111524] border border-white/[0.06] flex items-center gap-3 shrink-0 group relative overflow-hidden hover:border-white/15 transition-all">
          <div className="w-10 h-10 rounded-xl border border-white/10 p-0.5 shrink-0 bg-slate-950 shadow-inner">
            <div className="w-full h-full rounded-lg overflow-hidden flex items-center justify-center bg-slate-850">
              {currentGuild.icon ? (
                <img src={`https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png`} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-xs text-slate-300">{currentGuild.name.slice(0, 2).toUpperCase()}</span>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0 z-10">
            <p className="font-semibold text-sm text-slate-100 truncate leading-snug">{currentGuild.name}</p>
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium mt-0.5 transition-colors" title="Switch Server">
              <ArrowLeftRight className="w-3.5 h-3.5" /> Switch server
            </Link>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto min-h-0 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.group}>
              <div className="px-3 mb-1.5 text-[11px] font-bold tracking-wider text-slate-400 uppercase font-sans">{group.group}</div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
                  
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`group flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? "bg-indigo-600/15 text-white font-semibold border border-indigo-500/30 shadow-sm shadow-indigo-500/10"
                          : "text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent"
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                          : "bg-white/[0.05] text-slate-400 group-hover:bg-white/[0.1] group-hover:text-white group-hover:scale-110 border border-white/[0.06]"
                      }`}>
                        <Icon className="w-3.5 h-3.5 transition-transform duration-200 group-hover:scale-105" />
                      </div>
                      <span className="truncate">{item.label}</span>
                      {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Card */}
        {user && (
          <div className="p-3 mx-3 mb-2 rounded-xl bg-[#111524] border border-white/[0.06] flex items-center justify-between gap-3 shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl overflow-hidden border border-white/10 shrink-0 bg-slate-950 shadow-inner">
                <img
                  src={getDiscordAvatarUrl(user)}
                  alt={user.username || "User"}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold text-slate-200 truncate leading-snug">
                    {user.global_name || user.username}
                  </span>
                  {user.isSuperuser && <SuperuserBadge size="sm" />}
                </div>
                <span className="text-xs text-slate-400 font-mono block truncate">
                  @{user.username}
                </span>
              </div>
            </div>

            <a
              href="/auth/logout"
              title="Log out"
              className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
              aria-label="Logout"
            >
              <LogOut className="w-4 h-4" />
            </a>
          </div>
        )}

        {/* System Status Footer */}
        <div className="p-3.5 border-t border-white/[0.06] bg-slate-900/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-semibold text-slate-200">Digital Vigital</span>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-medium">Operational</span>
          </div>
          <div className="mt-2 text-xs text-slate-400 flex justify-between items-center px-0.5">
             <span>Press <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-[11px] text-slate-200 border border-white/10">Ctrl K</kbd> to search</span>
          </div>
        </div>
      </aside>
    </>
  );
}
