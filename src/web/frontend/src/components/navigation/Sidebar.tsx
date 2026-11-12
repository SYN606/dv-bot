import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, ShieldCheck, Pin, Image as ImageIcon,
  Bot, Terminal, Shield, ShieldAlert, Sliders, ArrowLeftRight, X, AlertTriangle, Trophy, Award, PenTool, LogOut, ScrollText, UserPlus, MessageSquareHeart, Ticket, Music, Flame
} from "lucide-react";
import SuperuserBadge from "../ui/SuperuserBadge";
import { getDiscordAvatarUrl } from "../../utils/discord";


const ICON_THEMES: Record<string, {
  iconColor: string;
  hoverIconColor: string;
  bg: string;
  border: string;
  hoverBg: string;
  hoverBorder: string;
  glow: string;
  activeBg: string;
  activeGlow: string;
  dotColor: string;
}> = {
  overview: {
    iconColor: "text-sky-400",
    hoverIconColor: "group-hover:text-sky-200",
    bg: "bg-sky-500/[0.08]",
    border: "border-sky-500/20",
    hoverBg: "group-hover:bg-sky-500/20",
    hoverBorder: "group-hover:border-sky-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(56,189,248,0.35)]",
    activeBg: "bg-gradient-to-br from-sky-500 to-blue-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(56,189,248,0.5)] border-sky-400/40",
    dotColor: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]",
  },
  analytics: {
    iconColor: "text-violet-400",
    hoverIconColor: "group-hover:text-violet-200",
    bg: "bg-violet-500/[0.08]",
    border: "border-violet-500/20",
    hoverBg: "group-hover:bg-violet-500/20",
    hoverBorder: "group-hover:border-violet-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(139,92,246,0.35)]",
    activeBg: "bg-gradient-to-br from-violet-500 to-purple-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(139,92,246,0.5)] border-violet-400/40",
    dotColor: "bg-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.8)]",
  },
  permissions: {
    iconColor: "text-rose-400",
    hoverIconColor: "group-hover:text-rose-200",
    bg: "bg-rose-500/[0.08]",
    border: "border-rose-500/20",
    hoverBg: "group-hover:bg-rose-500/20",
    hoverBorder: "group-hover:border-rose-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(244,63,94,0.35)]",
    activeBg: "bg-gradient-to-br from-rose-500 to-red-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(244,63,94,0.5)] border-rose-400/40",
    dotColor: "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]",
  },
  audit_logs: {
    iconColor: "text-indigo-400",
    hoverIconColor: "group-hover:text-indigo-200",
    bg: "bg-indigo-500/[0.08]",
    border: "border-indigo-500/20",
    hoverBg: "group-hover:bg-indigo-500/20",
    hoverBorder: "group-hover:border-indigo-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(99,102,241,0.35)]",
    activeBg: "bg-gradient-to-br from-indigo-500 to-blue-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(99,102,241,0.5)] border-indigo-400/40",
    dotColor: "bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]",
  },
  warning_punishments: {
    iconColor: "text-amber-400",
    hoverIconColor: "group-hover:text-amber-200",
    bg: "bg-amber-500/[0.08]",
    border: "border-amber-500/20",
    hoverBg: "group-hover:bg-amber-500/20",
    hoverBorder: "group-hover:border-amber-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(245,158,11,0.35)]",
    activeBg: "bg-gradient-to-br from-amber-500 to-orange-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(245,158,11,0.5)] border-amber-400/40",
    dotColor: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]",
  },
  admin_roles: {
    iconColor: "text-purple-400",
    hoverIconColor: "group-hover:text-purple-200",
    bg: "bg-purple-500/[0.08]",
    border: "border-purple-500/20",
    hoverBg: "group-hover:bg-purple-500/20",
    hoverBorder: "group-hover:border-purple-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(168,85,247,0.35)]",
    activeBg: "bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(168,85,247,0.5)] border-purple-400/40",
    dotColor: "bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]",
  },
  verification: {
    iconColor: "text-emerald-400",
    hoverIconColor: "group-hover:text-emerald-200",
    bg: "bg-emerald-500/[0.08]",
    border: "border-emerald-500/20",
    hoverBg: "group-hover:bg-emerald-500/20",
    hoverBorder: "group-hover:border-emerald-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(16,185,129,0.35)]",
    activeBg: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(16,185,129,0.5)] border-emerald-400/40",
    dotColor: "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
  },
  tickets: {
    iconColor: "text-cyan-400",
    hoverIconColor: "group-hover:text-cyan-200",
    bg: "bg-cyan-500/[0.08]",
    border: "border-cyan-500/20",
    hoverBg: "group-hover:bg-cyan-500/20",
    hoverBorder: "group-hover:border-cyan-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(6,182,212,0.35)]",
    activeBg: "bg-gradient-to-br from-cyan-500 to-blue-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(6,182,212,0.5)] border-cyan-400/40",
    dotColor: "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]",
  },
  welcome: {
    iconColor: "text-pink-400",
    hoverIconColor: "group-hover:text-pink-200",
    bg: "bg-pink-500/[0.08]",
    border: "border-pink-500/20",
    hoverBg: "group-hover:bg-pink-500/20",
    hoverBorder: "group-hover:border-pink-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(236,72,153,0.35)]",
    activeBg: "bg-gradient-to-br from-pink-500 to-rose-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(236,72,153,0.5)] border-pink-400/40",
    dotColor: "bg-pink-400 shadow-[0_0_8px_rgba(236,72,153,0.8)]",
  },
  autorole: {
    iconColor: "text-yellow-400",
    hoverIconColor: "group-hover:text-yellow-200",
    bg: "bg-yellow-500/[0.08]",
    border: "border-yellow-500/20",
    hoverBg: "group-hover:bg-yellow-500/20",
    hoverBorder: "group-hover:border-yellow-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(234,179,8,0.35)]",
    activeBg: "bg-gradient-to-br from-yellow-500 to-amber-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(234,179,8,0.5)] border-yellow-400/40",
    dotColor: "bg-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.8)]",
  },
  supporter: {
    iconColor: "text-amber-300",
    hoverIconColor: "group-hover:text-amber-100",
    bg: "bg-amber-400/[0.08]",
    border: "border-amber-400/20",
    hoverBg: "group-hover:bg-amber-400/20",
    hoverBorder: "group-hover:border-amber-300/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(251,191,36,0.35)]",
    activeBg: "bg-gradient-to-br from-amber-400 to-orange-500 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(251,191,36,0.5)] border-amber-300/40",
    dotColor: "bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.8)]",
  },
  message_studio: {
    iconColor: "text-blue-400",
    hoverIconColor: "group-hover:text-blue-200",
    bg: "bg-blue-500/[0.08]",
    border: "border-blue-500/20",
    hoverBg: "group-hover:bg-blue-500/20",
    hoverBorder: "group-hover:border-blue-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(59,130,246,0.35)]",
    activeBg: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(59,130,246,0.5)] border-blue-400/40",
    dotColor: "bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]",
  },
  confessions: {
    iconColor: "text-fuchsia-400",
    hoverIconColor: "group-hover:text-fuchsia-200",
    bg: "bg-fuchsia-500/[0.08]",
    border: "border-fuchsia-500/20",
    hoverBg: "group-hover:bg-fuchsia-500/20",
    hoverBorder: "group-hover:border-fuchsia-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(217,70,239,0.35)]",
    activeBg: "bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(217,70,239,0.5)] border-fuchsia-400/40",
    dotColor: "bg-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,0.8)]",
  },
  music: {
    iconColor: "text-emerald-400",
    hoverIconColor: "group-hover:text-emerald-200",
    bg: "bg-emerald-500/[0.08]",
    border: "border-emerald-500/20",
    hoverBg: "group-hover:bg-emerald-500/20",
    hoverBorder: "group-hover:border-emerald-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(16,185,129,0.35)]",
    activeBg: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(16,185,129,0.5)] border-emerald-400/40",
    dotColor: "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
  },
  autoresponder: {
    iconColor: "text-teal-400",
    hoverIconColor: "group-hover:text-teal-200",
    bg: "bg-teal-500/[0.08]",
    border: "border-teal-500/20",
    hoverBg: "group-hover:bg-teal-500/20",
    hoverBorder: "group-hover:border-teal-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(20,184,166,0.35)]",
    activeBg: "bg-gradient-to-br from-teal-500 to-cyan-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(20,184,166,0.5)] border-teal-400/40",
    dotColor: "bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.8)]",
  },
  sticky: {
    iconColor: "text-orange-400",
    hoverIconColor: "group-hover:text-orange-200",
    bg: "bg-orange-500/[0.08]",
    border: "border-orange-500/20",
    hoverBg: "group-hover:bg-orange-500/20",
    hoverBorder: "group-hover:border-orange-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(249,115,22,0.35)]",
    activeBg: "bg-gradient-to-br from-orange-500 to-red-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(249,115,22,0.5)] border-orange-400/40",
    dotColor: "bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.8)]",
  },
  media_only: {
    iconColor: "text-emerald-400",
    hoverIconColor: "group-hover:text-emerald-200",
    bg: "bg-emerald-500/[0.08]",
    border: "border-emerald-500/20",
    hoverBg: "group-hover:bg-emerald-500/20",
    hoverBorder: "group-hover:border-emerald-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(16,185,129,0.35)]",
    activeBg: "bg-gradient-to-br from-emerald-500 to-cyan-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(16,185,129,0.5)] border-emerald-400/40",
    dotColor: "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]",
  },
  commands: {
    iconColor: "text-blue-400",
    hoverIconColor: "group-hover:text-blue-200",
    bg: "bg-blue-500/[0.08]",
    border: "border-blue-500/20",
    hoverBg: "group-hover:bg-blue-500/20",
    hoverBorder: "group-hover:border-blue-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(59,130,246,0.35)]",
    activeBg: "bg-gradient-to-br from-blue-600 to-indigo-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(59,130,246,0.5)] border-blue-400/40",
    dotColor: "bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]",
  },
  config: {
    iconColor: "text-purple-400",
    hoverIconColor: "group-hover:text-purple-200",
    bg: "bg-purple-500/[0.08]",
    border: "border-purple-500/20",
    hoverBg: "group-hover:bg-purple-500/20",
    hoverBorder: "group-hover:border-purple-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(168,85,247,0.35)]",
    activeBg: "bg-gradient-to-br from-purple-500 to-indigo-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(168,85,247,0.5)] border-purple-400/40",
    dotColor: "bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]",
  },
  antinuke: {
    iconColor: "text-rose-400",
    hoverIconColor: "group-hover:text-rose-200",
    bg: "bg-rose-500/[0.08]",
    border: "border-rose-500/20",
    hoverBg: "group-hover:bg-rose-500/20",
    hoverBorder: "group-hover:border-rose-400/40",
    glow: "group-hover:shadow-[0_0_15px_rgba(244,63,94,0.35)]",
    activeBg: "bg-gradient-to-br from-rose-500 to-red-600 text-white",
    activeGlow: "shadow-[0_0_18px_rgba(244,63,94,0.5)] border-rose-400/40",
    dotColor: "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]",
  },
};

const DEFAULT_THEME = {
  iconColor: "text-indigo-400",
  hoverIconColor: "group-hover:text-indigo-200",
  bg: "bg-indigo-500/[0.08]",
  border: "border-indigo-500/20",
  hoverBg: "group-hover:bg-indigo-500/20",
  hoverBorder: "group-hover:border-indigo-400/40",
  glow: "group-hover:shadow-[0_0_15px_rgba(99,102,241,0.35)]",
  activeBg: "bg-gradient-to-br from-indigo-500 to-blue-600 text-white",
  activeGlow: "shadow-[0_0_18px_rgba(99,102,241,0.5)] border-indigo-400/40",
  dotColor: "bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]",
};

export default function Sidebar({ currentGuild, botInfo, user, mobileOpen, setMobileOpen }) {
  const location = useLocation();
  const botAvatar = botInfo?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png";

  const canAccessAntinuke = Boolean(user?.isSuperuser || currentGuild?.owner || currentGuild?.canManageAntinuke);

  const navGroups = [
    {
      group: "OVERVIEW",
      items: [
        { id: "overview", label: "Server Overview", icon: LayoutDashboard, path: `/dashboard/${currentGuild.id}`, exact: true },
        { id: "analytics", label: "Server Analytics", icon: TrendingUp, path: `/dashboard/${currentGuild.id}/analytics` }
      ]
    },
    {
      group: "SECURITY & DEFENSE",
      items: [
        ...(canAccessAntinuke ? [{ id: "antinuke", label: "Anti-Nuke Protection", icon: ShieldAlert, path: `/dashboard/${currentGuild.id}/antinuke` }] : []),
        { id: "permissions", label: "Permissions Audit", icon: ShieldAlert, path: `/dashboard/${currentGuild.id}/permissions` },
        { id: "audit_logs", label: "Audit Logs", icon: ScrollText, path: `/dashboard/${currentGuild.id}/audit-logs` },
        { id: "warning_punishments", label: "Warning Punishments", icon: AlertTriangle, path: `/dashboard/${currentGuild.id}/warning-punishments` },
        { id: "admin_roles", label: "Admin Roles", icon: Shield, path: `/dashboard/${currentGuild.id}/admin-roles` },
      ]
    },
    {
      group: "MEMBERS & COMMUNITY",
      items: [
        { id: "verification", label: "Member Verification", icon: ShieldCheck, path: `/dashboard/${currentGuild.id}/verification` },
        { id: "tickets", label: "Support Tickets", icon: Ticket, path: `/dashboard/${currentGuild.id}/tickets` },
        { id: "welcome", label: "Welcome & Leave", icon: UserPlus, path: `/dashboard/${currentGuild.id}/welcome` },
        { id: "autorole", label: "Auto Roles", icon: Award, path: `/dashboard/${currentGuild.id}/autorole` },
        { id: "supporter", label: "Supporter Rewards", icon: Trophy, path: `/dashboard/${currentGuild.id}/supporter` },
      ]
    },
    {
      group: "CHAT & MEDIA TOOLS",
      items: [
        { id: "message_studio", label: "Message Studio", icon: PenTool, path: `/dashboard/${currentGuild.id}/message-studio` },
        { id: "autoresponder", label: "Autoresponder", icon: Bot, path: `/dashboard/${currentGuild.id}/autoresponder` },
        { id: "sticky", label: "Sticky Messages", icon: Pin, path: `/dashboard/${currentGuild.id}/sticky` },
        { id: "media_only", label: "Media-Only Channels", icon: ImageIcon, path: `/dashboard/${currentGuild.id}/media-only` }
      ]
    },
    {
      group: "BOT CONFIGURATION",
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

      <aside className={`fixed inset-y-0 left-0 w-72 md:w-[18.5rem] bg-[#0a0d16] border-r border-white/[0.06] flex flex-col z-50 transform transition-transform duration-300 shrink-0 md:sticky md:top-0 md:left-0 md:h-screen select-none ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}`}>
        {/* Brand Header */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between shrink-0 relative overflow-hidden bg-[#0c0f1a]">
          <Link to="/" className="flex items-center gap-3 group relative z-10" onClick={() => setMobileOpen(false)}>
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shadow-md shrink-0 group-hover:border-indigo-500/50 transition-all bg-slate-950">
              <img src={botAvatar} alt="DV" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-[17px] tracking-tight text-white leading-tight">DV Command</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-xs font-mono text-emerald-400 font-semibold tracking-wider uppercase">ONLINE</span>
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
            <p className="font-bold text-[15px] text-slate-100 truncate leading-snug">{currentGuild.name}</p>
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-[13px] text-indigo-400 hover:text-indigo-300 font-semibold mt-0.5 transition-colors" title="Switch Server">
              <ArrowLeftRight className="w-3.5 h-3.5" /> Switch server
            </Link>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto min-h-0 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.group}>
              <div className="px-3 mb-2 text-[12px] font-extrabold tracking-wider text-slate-400/90 uppercase font-sans">{group.group}</div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
                  const theme = ICON_THEMES[item.id] || DEFAULT_THEME;
                  
                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`group flex items-center gap-3 px-3 py-2 rounded-xl text-[14.5px] font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-white/[0.07] text-white border border-white/10 shadow-sm backdrop-blur-sm"
                          : "text-slate-300 hover:text-white hover:bg-white/[0.035] border border-transparent"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300 ${
                        isActive
                          ? `${theme.activeBg} ${theme.activeGlow}`
                          : `${theme.bg} ${theme.border} ${theme.iconColor} ${theme.hoverBg} ${theme.hoverBorder} ${theme.hoverIconColor} ${theme.glow} group-hover:scale-105`
                      }`}>
                        <Icon className="w-4.5 h-4.5 transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-3" />
                      </div>
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <div className={`ml-auto w-2 h-2 rounded-full ${theme.dotColor} animate-pulse`} />
                      )}
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
                  <span className="text-[15px] font-semibold text-slate-200 truncate leading-snug">
                    {user.global_name || user.username}
                  </span>
                  {user.isSuperuser && <SuperuserBadge size="sm" />}
                </div>
                <span className="text-[13px] text-slate-400 font-mono block truncate">
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
              <span className="text-[13px] font-semibold text-slate-200">Digital Vigital</span>
            </div>
            <span className="text-[13px] font-mono text-emerald-400 font-medium">Operational</span>
          </div>
          <div className="mt-2 text-[13px] text-slate-400 flex justify-between items-center px-0.5">
             <span>Press <kbd className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-xs text-slate-200 border border-white/10">Ctrl K</kbd> to search</span>
          </div>
        </div>
      </aside>
    </>
  );
}
