import React from "react";
import { Link } from "react-router-dom";
import { Disc, Menu } from "lucide-react";
import SuperuserBadge from "../ui/SuperuserBadge";
import { getDiscordAvatarUrl } from "../../utils/discord";

export default function Navbar({ user, botInfo }) {
  const botAvatar = botInfo?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png";

  return (
    <header className="w-full relative z-50 border-b border-white/5 bg-slate-950/60 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shadow-lg shrink-0 group-hover:border-brand-crimson/50 transition-colors">
            <img src={botAvatar} alt="DV" className="w-full h-full object-cover rounded-full" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm tracking-tight text-slate-100 uppercase hidden sm:block">Digital Vigital</span>
            <span className="text-[10px] font-mono text-brand-crimson tracking-wider hidden sm:block">COMMUNITY</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="https://digitalvigital.fun" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Community</a>
          <Link to="/docs" className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Docs</Link>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 shadow-sm">
                <img
                  src={getDiscordAvatarUrl(user)}
                  alt={user.username || "User"}
                  className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0"
                />
                <span className="text-xs font-semibold text-slate-200 hidden sm:inline-block max-w-[120px] truncate">
                  {user.global_name || user.username}
                </span>
                {user.isSuperuser && <SuperuserBadge size="sm" />}
              </div>

              <Link to="/dashboard" className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/5 transition-colors">
                Control Center
              </Link>
            </div>
          ) : (
            <a href="/auth/login" className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#5865F2] hover:bg-[#4752c4] text-white transition-colors">
              <Disc className="w-4 h-4" />
              <span>Login</span>
            </a>
          )}

          {/* Mobile Menu Toggle (Visual Only for now) */}
          <button className="md:hidden p-2 text-slate-400 hover:text-white">
            <Menu className="w-6 h-6" />
          </button>
        </div>

      </div>
    </header>
  );
}
