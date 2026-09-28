import React from "react";
import { Link } from "react-router-dom";
import { Command, ExternalLink } from "lucide-react";

export default function Footer({ className = "", botInfo }) {
  const currentYear = new Date().getFullYear();
  const botAvatar = botInfo?.avatar || null;

  return (
    <footer
      className={`border-t border-white/[0.08] bg-black/40 backdrop-blur-3xl text-neutral-400 font-sans mt-auto relative z-20 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          
          <div className="flex flex-col md:flex-row items-center gap-6">
            <Link
              to="/"
              className="flex items-center gap-3 text-white transition-opacity hover:opacity-80 group"
            >
              {botAvatar ? (
                <img
                  src={botAvatar}
                  alt="Logo"
                  className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-neutral-900 border border-white/10 flex items-center justify-center text-white">
                  <Command className="w-4 h-4" />
                </div>
              )}
              <span className="font-semibold text-base tracking-tight text-white">
                Digital Vigital
              </span>
            </Link>

            <div className="hidden md:block w-px h-6 bg-white/10" />

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs font-medium text-neutral-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              <span>All Systems Operational</span>
            </div>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-8 text-xs font-medium uppercase tracking-widest text-neutral-500">
            <Link
              to="/docs"
              className="hover:text-white transition-colors"
            >
              Documentation
            </Link>
            <Link
              to="/terms"
              className="hover:text-white transition-colors"
            >
              Terms
            </Link>
            <Link
              to="/privacy"
              className="hover:text-white transition-colors"
            >
              Privacy
            </Link>
          </nav>
        </div>

        <div className="border-t border-white/[0.06]" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-neutral-600">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span>Powered by</span>
            <a
              href="https://digitalvigital.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-neutral-300 hover:text-white transition-colors flex items-center gap-1"
            >
              Digital Vigital <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-neutral-800">|</span>
            <span>Developed by</span>
            <a
              href="https://syn606.wtf"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-neutral-300 hover:text-white transition-colors"
            >
              SYN 606
            </a>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span> {currentYear} DV-BOT. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
