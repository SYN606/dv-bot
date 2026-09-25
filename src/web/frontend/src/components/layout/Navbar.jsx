import React from "react";
import { Link } from "react-router-dom";
import { LogOut, Disc, ChevronRight } from "lucide-react";

export default function Navbar({ user, botInfo, currentGuild, breadcrumbs = [] }) {
  const avatarUrl = user?.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
    : "https://cdn.discordapp.com/embed/avatars/0.png";

  const botAvatar = botInfo?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png";
  const botName = botInfo?.username || "Digital Vigital";

  // Guild Dashboard Header
  if (currentGuild) {
    return (
      <header className="p-4 sm:px-8 border-b border-white/5 flex items-center justify-between backdrop-blur-xl bg-slate-950/40">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Link to="/dashboard" className="hover:text-white transition-colors">
            Servers
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className="text-slate-200 font-medium truncate max-w-[150px] sm:max-w-none">
            {currentGuild.name}
          </span>
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-indigo-300 font-semibold">{crumb}</span>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 border border-white/10">
            <img
              src={avatarUrl}
              alt={user?.username || "User"}
              className="w-5 h-5 rounded-full ring-1 ring-indigo-500/50 object-cover"
            />
            <span className="text-xs font-semibold text-slate-200">
              {user?.username || "User"}
            </span>
          </div>
          <a
            href="/auth/logout"
            className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 text-slate-400 hover:text-rose-300 transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </a>
        </div>
      </header>
    );
  }

  // Global Header (Landing / Server Selector)
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-slate-950/75 border-b border-white/10 px-6 py-3.5 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-indigo-500/30 shadow-md shadow-indigo-500/10 shrink-0">
          <img
            src={botAvatar}
            alt={botName}
            className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform"
          />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            {botName}
          </span>
          <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase -mt-1">
            Dashboard
          </span>
        </div>
      </Link>

      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
        <Link to="/docs" className="hover:text-white transition-colors">
          Documentation
        </Link>
        <Link to="/terms" className="hover:text-white transition-colors">
          Terms of Service
        </Link>
        <Link to="/privacy" className="hover:text-white transition-colors">
          Privacy Policy
        </Link>
      </nav>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 border border-white/10 backdrop-blur-md text-xs font-semibold text-slate-200 transition-all shadow-md"
            >
              <img
                src={avatarUrl}
                alt={user.username}
                className="w-6 h-6 rounded-full ring-2 ring-indigo-400/50 object-cover"
              />
              <span>{user.username}</span>
              {user.isSuperuser && (
                <span className="px-1.5 py-0.5 ml-0.5 text-[9px] uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded shadow-sm shadow-orange-500/20">
                  Superuser
                </span>
              )}
            </Link>
            <a
              href="/auth/logout"
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/15 border border-white/10 text-slate-400 hover:text-rose-300 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <a
            href="/auth/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#5865F2] hover:bg-[#4752c4] text-white shadow-lg shadow-indigo-500/25 transition-all"
          >
            <Disc className="w-4 h-4" />
            <span>Login with Discord</span>
          </a>
        )}
      </div>
    </header>
  );
}
