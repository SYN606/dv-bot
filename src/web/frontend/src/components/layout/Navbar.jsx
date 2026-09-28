import React from "react";
import { Link } from "react-router-dom";
import { LogOut, ChevronRight, Settings2, Command } from "lucide-react";

export default function Navbar({ user, botInfo, currentGuild, breadcrumbs = [] }) {
  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : "https://cdn.discordapp.com/embed/avatars/0.png";

  const botAvatar = botInfo?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png";
  const botName = botInfo?.username || "Digital Vigital";

  // Guild Dashboard Header
  if (currentGuild) {
    return (
      <header className="p-4 sm:px-8 border-b border-white/[0.08] flex items-center justify-between backdrop-blur-2xl bg-black/20 sticky top-0 z-50">
        <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-medium">
          <Link to="/dashboard" className="px-2 py-1 rounded-md hover:bg-white/5 hover:text-white transition-all flex items-center gap-2">
            <Command className="w-3.5 h-3.5" />
            Servers
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
          <span className="text-neutral-200 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.05] truncate max-w-[150px] sm:max-w-none shadow-sm">
            {currentGuild.name}
          </span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-600" />
              <span className="text-white font-semibold">{crumb}</span>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] shadow-sm backdrop-blur-md">
            <img
              src={avatarUrl}
              alt={user?.username || "User"}
              className="w-5 h-5 rounded-full ring-1 ring-white/10 object-cover"
            />
            <span className="text-xs font-semibold text-neutral-200">
              {user?.username || "User"}
            </span>
          </div>
          <a
            href="/auth/logout"
            className="p-2 rounded-full bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.08] text-neutral-400 hover:text-rose-400 transition-all shadow-sm"
            title="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>
    );
  }

  // Global Header (Landing / Server Selector)
  return (
    <header className="sticky top-0 z-50 backdrop-blur-2xl bg-black/40 border-b border-white/[0.08] px-6 py-4 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3 group">
        <div className="w-9 h-9 rounded-xl overflow-hidden ring-1 ring-white/10 shadow-lg bg-neutral-900 shrink-0">
          <img
            src={botAvatar}
            alt={botName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        <div className="flex flex-col justify-center">
          <span className="font-bold text-sm tracking-tight text-white leading-tight">
            {botName}
          </span>
          <span className="text-[10px] font-medium tracking-wider text-neutral-500 uppercase leading-none mt-0.5">
            System Console
          </span>
        </div>
      </Link>

      <nav className="hidden md:flex items-center gap-8 text-[11px] font-semibold text-neutral-400 tracking-wide uppercase">
        <Link to="/docs" className="hover:text-white transition-colors">
          Documentation
        </Link>
        <Link to="/terms" className="hover:text-white transition-colors">
          Terms
        </Link>
        <Link to="/privacy" className="hover:text-white transition-colors">
          Privacy
        </Link>
      </nav>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-xl text-xs font-semibold text-white transition-all shadow-lg"
            >
              <img
                src={avatarUrl}
                alt={user.username}
                className="w-5 h-5 rounded-full ring-1 ring-white/20 object-cover"
              />
              <span>Dashboard</span>
            </Link>
            <a
              href="/auth/logout"
              className="p-2.5 rounded-full bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.08] text-neutral-400 hover:text-rose-400 transition-all shadow-sm"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <a
            href="/auth/login"
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Authenticate
          </a>
        )}
      </div>
    </header>
  );
}
