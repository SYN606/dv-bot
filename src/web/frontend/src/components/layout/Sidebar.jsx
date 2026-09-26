import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  ShieldCheck,
  Shield,
  ShieldAlert,
  Image as ImageIcon,
  Terminal,
  Pin,
  Bot,
  Sliders,
  ArrowLeftRight,
  X,
} from "lucide-react";

export default function Sidebar({
  currentGuild,
  botInfo,
  user,
  mobileOpen,
  setMobileOpen,
}) {
  const location = useLocation();
  const botAvatar = botInfo?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png";
  const botName = botInfo?.username || "Digital Vigital";

  const navGroups = [
    {
      group: "GENERAL",
      items: [
        {
          id: "overview",
          label: "Overview",
          icon: LayoutDashboard,
          path: `/dashboard/${currentGuild.id}`,
          exact: true,
        },
        {
          id: "analytics",
          label: "Analytics & Trends",
          icon: TrendingUp,
          path: `/dashboard/${currentGuild.id}/analytics`,
        },
      ],
    },
    {
      group: "SECURITY & ACCESS",
      items: [
        {
          id: "verification",
          label: "Verification Gate",
          icon: ShieldCheck,
          path: `/dashboard/${currentGuild.id}/verification`,
        },
        {
          id: "admin_roles",
          label: "Staff & Admin Access",
          icon: Shield,
          path: `/dashboard/${currentGuild.id}/admin-roles`,
        },
        {
          id: "permissions",
          label: "Permissions Audit",
          icon: ShieldAlert,
          path: `/dashboard/${currentGuild.id}/permissions`,
        },
      ],
    },
    {
      group: "CHANNELS & MODERATION",
      items: [
        {
          id: "media_only",
          label: "Media-Only Channels",
          icon: ImageIcon,
          path: `/dashboard/${currentGuild.id}/media-only`,
        },
        {
          id: "commands",
          label: "Command Restrictions",
          icon: Terminal,
          path: `/dashboard/${currentGuild.id}/commands`,
        },
        {
          id: "sticky",
          label: "Sticky Channel Notice",
          icon: Pin,
          path: `/dashboard/${currentGuild.id}/sticky`,
        },
      ],
    },
    {
      group: "AUTOMATION",
      items: [
        {
          id: "autoresponder",
          label: "Autoresponder",
          icon: Bot,
          path: `/dashboard/${currentGuild.id}/autoresponder`,
        },
        {
          id: "config",
          label: "Roles & Audit Logs",
          icon: Sliders,
          path: `/dashboard/${currentGuild.id}/config`,
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 glass-panel border-r border-white/10 flex flex-col z-50 transform transition-transform duration-300 shrink-0 md:sticky md:top-0 md:left-0 md:h-screen md:translate-x-0 select-none ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Brand Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <Link
            to="/"
            className="flex items-center gap-2.5 group"
            onClick={() => setMobileOpen(false)}
          >
            <div className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-indigo-500/25 shadow-md shadow-indigo-500/10 shrink-0">
              <img
                src={botAvatar}
                alt={botName}
                className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm tracking-tight text-white leading-tight truncate max-w-[130px]">
                {botName}
              </span>
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
                Control Panel
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-1">
            <Link
              to="/dashboard"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all text-xs"
              title="Switch Server"
              onClick={() => setMobileOpen(false)}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </Link>
            <button
              className="md:hidden p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
              onClick={() => setMobileOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Server Badge */}
        <div className="p-3 m-3 rounded-xl bg-slate-900/60 border border-white/5 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shrink-0">
            <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center overflow-hidden">
              {currentGuild.icon ? (
                <img
                  src={`https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png`}
                  alt=""
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="font-bold text-xs text-indigo-300 font-mono">
                  {currentGuild.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs text-white truncate">
              {currentGuild.name}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Connected
            </span>
          </div>
        </div>

        {/* Navigation Modules */}
        <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto min-h-0">
          {navGroups.map((group) => (
            <div key={group.group}>
              <div className="px-3 mb-1.5 text-[9px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
                {group.group}
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.exact
                    ? location.pathname === item.path
                    : location.pathname.startsWith(item.path);

                  return (
                    <Link
                      key={item.id}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm"
                          : "text-slate-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? "text-indigo-400" : "text-slate-400"
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
