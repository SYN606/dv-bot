import React from "react";
import { Link } from "react-router-dom";

export default function Footer({ className = "", botInfo }) {
  const currentYear = new Date().getFullYear();
  const botAvatar = botInfo?.avatar || null;

  return (
    <footer
      className={`border-t border-white/[0.06] bg-[#0b0c10]/90 backdrop-blur-md text-zinc-400 font-sans mt-auto relative z-20 ${className}`}
    >
      {/* Subtle top hairline accent */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-10 sm:py-12 space-y-8">
        {/* Top Row: Brand & Status on Left, Navigation on Right */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          {/* Brand & Status */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3.5">
            <Link
              to="/"
              className="flex items-center gap-2.5 text-zinc-200 hover:text-white transition-colors group"
            >
              {botAvatar ? (
                <img
                  src={botAvatar}
                  alt="Logo"
                  className="w-7 h-7 rounded-full object-cover ring-1 ring-indigo-500/40 group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] font-bold text-white shadow-sm font-mono">
                  DV
                </div>
              )}
              <span className="font-bold text-sm sm:text-base tracking-tight text-zinc-100">
                Digital Vigital
              </span>
            </Link>

            <span className="text-zinc-700 hidden sm:inline">•</span>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>All Systems Operational</span>
            </div>
          </div>

          {/* Navigation Links with Generous Spacing */}
          <nav className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs sm:text-sm font-medium">
            <Link
              to="/docs"
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Documentation
            </Link>
            <Link
              to="/terms"
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/privacy"
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              Privacy Policy
            </Link>
          </nav>
        </div>

        {/* Roomy Divider */}
        <div className="border-t border-white/[0.05]" />

        {/* Bottom Row: Attribution & Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span>Powered by</span>
            <a
              href="https://digitalvigital.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Digital vigital Network
            </a>
            <span className="text-zinc-700 mx-1">•</span>
            <span>Developed by</span>
            <a
              href="https://syn606.wtf"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-zinc-300 hover:text-indigo-300 transition-colors"
            >
              SYN 606 | cybermind Networks
            </a>
          </div>

          <div className="flex items-center gap-3 text-zinc-500 font-mono text-[11px]">
            <span>Bun Runtime</span>
            <span className="text-zinc-700">•</span>
            <span>© {currentYear} DV-BOT. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
