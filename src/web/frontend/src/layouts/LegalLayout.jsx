import React from "react";
import { Link, Outlet } from "react-router-dom";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

export default function LegalLayout({ botInfo }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-brand-violet/30 selection:text-white flex flex-col relative overflow-hidden">
      
      {/* Background Gradients */}
      <div className="fixed -top-50 -left-50 w-200 h-200 rounded-full glow-orb-primary pointer-events-none -z-10 opacity-50" />
      <div className="fixed -bottom-50 -right-50 w-200 h-200 rounded-full glow-orb-cyan pointer-events-none -z-10 opacity-30" />

      {/* Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40" style={{
        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)'
      }} />

      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 bg-slate-950/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 group-hover:border-brand-violet/50 transition-colors">
              <img src={botInfo?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} alt="DV" className="w-full h-full object-cover rounded-full" />
            </div>
            <span className="font-bold text-sm tracking-widest text-slate-100 uppercase font-mono group-hover:text-white transition-colors">
              Digital Vigital
            </span>
          </Link>

          <Link to="/" className="text-xs font-mono text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5">
            <ArrowLeft className="w-3.5 h-3.5" /> Return Home
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 w-full relative z-10 py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Minimal Legal Footer */}
      <footer className="border-t border-white/5 py-8 mt-auto relative z-10 bg-slate-950/40">
        <div className="max-w-4xl mx-auto px-6 text-center text-xs text-slate-500 font-mono tracking-widest uppercase flex flex-col items-center gap-2">
          <span>&copy; {new Date().getFullYear()} Digital Vigital</span>
          <span className="opacity-50">Community Command Center</span>
        </div>
      </footer>
    </div>
  );
}
