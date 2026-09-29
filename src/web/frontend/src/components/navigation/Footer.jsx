import React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function Footer({ botInfo }) {
  const botAvatar = botInfo?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png";

  return (
    <footer className="border-t border-white/5 pt-16 pb-8 mt-24 relative z-10 bg-slate-950/40">
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
        
        {/* Brand Section */}
        <div className="md:col-span-5 space-y-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shadow-lg group-hover:border-brand-crimson/50 transition-colors">
              <img src={botAvatar} alt="DV" className="w-full h-full object-cover rounded-full" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white uppercase font-sans">
              Digital Vigital
            </span>
          </Link>
          <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
            Built for the Digital Vigital community. Official community bot and management platform.
          </p>
        </div>

        {/* Links Grid */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
          <div className="space-y-4">
            <h4 className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Product</h4>
            <ul className="space-y-3">
              <li><Link to="/dashboard" className="text-slate-300 hover:text-white transition-colors">Dashboard</Link></li>
              <li><Link to="/docs" className="text-slate-300 hover:text-white transition-colors">Documentation</Link></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Community</h4>
            <ul className="space-y-3">
              <li>
                <a href="https://digitalvigital.fun" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors inline-flex items-center gap-1">
                  digitalvigital.fun <ArrowUpRight className="w-3 h-3 opacity-50" />
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-mono text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Legal</h4>
            <ul className="space-y-3">
              <li><Link to="/terms" className="text-slate-300 hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-slate-300 hover:text-white transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

      </div>

      <div className="max-w-6xl mx-auto px-6 mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs text-slate-500 font-mono tracking-widest uppercase">
          &copy; {new Date().getFullYear()} Digital Vigital
        </span>
        <span className="text-xs text-slate-600 font-sans">
          All rights reserved.
        </span>
      </div>
    </footer>
  );
}
