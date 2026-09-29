import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Activity, ShieldCheck, Pin, Image as ImageIcon,
  Bot, Terminal, Shield, Users, Server, Disc, ChevronRight, Hash, CheckCircle2
} from "lucide-react";
import Navbar from "../../components/navigation/Navbar";
import Footer from "../../components/navigation/Footer";

export default function HomePage({ user, botInfo }) {
  useEffect(() => {
    document.title = "Digital Vigital — Community & Official Discord Bot";
  }, []);

  const ping = botInfo?.ping || 0;
  const isOnline = botInfo?.status === "Online" || botInfo?.status === "ready" || true;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-body selection:bg-brand-crimson/30 selection:text-white flex flex-col relative overflow-hidden">
      
      {/* Background Gradients */}
      <div className="fixed top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full glow-orb-primary opacity-30 pointer-events-none -z-10" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full glow-orb-cyan opacity-30 pointer-events-none -z-10" />
      
      {/* Grid Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.15]" style={{
        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)',
        WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, #000 70%, transparent 110%)'
      }} />

      <Navbar user={user} botInfo={botInfo} />

      <main className="flex-1 w-full relative z-10">
        
        {/* BRAND HERO */}
        <section className="relative py-16 sm:py-24 px-6 flex flex-col items-center justify-center min-h-[80vh]">
          {/* Giant Background Typography */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none -z-10">
            <span className="text-[15vw] leading-none font-display text-brand-crimson opacity-[0.03] whitespace-nowrap" aria-hidden="true">
              डिजिटल विगिटल
            </span>
          </div>

          <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs font-mono text-slate-300 uppercase tracking-widest mb-4">
              <span className="w-2 h-2 rounded-full bg-brand-crimson animate-pulse"></span>
              Built around the community
            </div>

            <h1 className="text-5xl sm:text-7xl font-display text-white tracking-tight leading-[1.1]">
              Community, automation and moderation —
              <span className="block text-slate-400 mt-2">connected through one official platform.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-body leading-relaxed">
              One place for the people, tools and automation behind Digital Vigital.
            </p>

            <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold bg-brand-crimson hover:bg-brand-crimson-dark text-white transition-all w-full sm:w-auto">
                  <span>Open Control Center</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <a href="/auth/login" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold bg-[#5865F2] hover:bg-[#4752c4] text-white transition-all w-full sm:w-auto">
                  <Disc className="w-5 h-5" />
                  <span>Login with Discord</span>
                </a>
              )}
              <a href="https://digitalvigital.fun" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all w-full sm:w-auto">
                <span>Explore Community</span>
              </a>
            </div>
          </div>
        </section>

        {/* LIVE SYSTEM STRIP */}
        <section className="border-y border-white/5 bg-slate-950/80 backdrop-blur-md relative z-20">
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-center gap-8 sm:gap-16 text-xs font-mono tracking-widest uppercase text-slate-400">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-brand-green' : 'bg-brand-crimson'}`}></div>
              <span>System {isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-cyan" />
              <span>{ping}ms Gateway</span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-brand-violet" />
              <span>Dashboard Connected</span>
            </div>
          </div>
        </section>

        {/* COMMUNITY SECTION */}
        <section className="py-24 sm:py-32 px-6 relative">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <div className="text-sm font-display text-brand-crimson tracking-wider flex items-center gap-3">
                <span className="font-mono text-xs opacity-50">01 /</span> समुदाय
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
                Community First.
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed">
                The bot exists because the community does. Digital Vigital brings moderation, automation, verification, and community tools into one connected experience, tailored explicitly for our scale.
              </p>
              <ul className="space-y-4 pt-4">
                {['Direct integration with community roles', 'Transparent public audit logs', 'Custom engagement rewards'].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-brand-crimson shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-panel p-8 rounded-3xl border border-white/10 relative overflow-hidden bg-slate-900/50">
               <div className="absolute -bottom-8 -right-8 text-9xl font-display text-brand-crimson opacity-[0.03] select-none">स</div>
               <div className="grid grid-cols-2 gap-6 relative z-10">
                 <div className="space-y-1">
                   <div className="text-3xl font-mono text-white">40k+</div>
                   <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">Members</div>
                 </div>
                 <div className="space-y-1">
                   <div className="text-3xl font-mono text-white">99%</div>
                   <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">Uptime</div>
                 </div>
                 <div className="space-y-1">
                   <div className="text-3xl font-mono text-white">24/7</div>
                   <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">Moderation</div>
                 </div>
                 <div className="space-y-1">
                   <div className="text-3xl font-mono text-white">1</div>
                   <div className="text-xs font-mono text-slate-500 uppercase tracking-widest">Community</div>
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* BOT CAPABILITIES */}
        <section className="py-24 sm:py-32 px-6 bg-slate-900/30 border-y border-white/5 relative">
          <div className="absolute top-0 right-0 p-8 text-[10vw] font-display text-white opacity-[0.02] select-none pointer-events-none leading-none">प्रणाली</div>
          <div className="max-w-6xl mx-auto space-y-16 relative z-10">
            <div className="max-w-2xl">
              <div className="text-sm font-display text-brand-cyan tracking-wider flex items-center gap-3 mb-4">
                <span className="font-mono text-xs opacity-50">02 /</span> स्वचालन
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
                Official Community Bot
              </h2>
              <p className="text-slate-400 mt-4 text-lg">
                Handling the complex infrastructure of a massive community quietly and efficiently.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Featured Large Card */}
              <div className="md:col-span-7 glass-card p-8 sm:p-10 rounded-4xl border border-white/5 flex flex-col justify-between group hover:border-brand-crimson/30 transition-colors bg-gradient-to-br from-slate-900 to-slate-950">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-brand-crimson/10 flex items-center justify-center text-brand-crimson border border-brand-crimson/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="font-mono text-xl text-slate-700">01</span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white mb-3">Verification & Access</h3>
                  <p className="text-slate-400 leading-relaxed max-w-md">
                    Automated security gates ensuring only verified community members access the core server. Captcha, role assignment, and raid protection built-in.
                  </p>
                </div>
              </div>

              {/* Smaller Cards */}
              <div className="md:col-span-5 flex flex-col gap-6">
                <div className="glass-card p-8 rounded-[2rem] border border-white/5 flex-1 group hover:border-brand-cyan/30 transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                      <Bot className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-lg text-slate-700">02</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Autoresponders</h3>
                  <p className="text-sm text-slate-400">Intelligent trigger-based responses to handle common community questions.</p>
                </div>

                <div className="glass-card p-8 rounded-[2rem] border border-white/5 flex-1 group hover:border-brand-violet/30 transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand-violet/10 flex items-center justify-center text-brand-violet">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-lg text-slate-700">03</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Media Channels</h3>
                  <p className="text-sm text-slate-400">Strict curation for art and media channels. Auto-deletes pure text messages.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DASHBOARD PREVIEW */}
        <section className="py-24 sm:py-32 px-6 overflow-hidden relative">
          <div className="max-w-6xl mx-auto">
            <div className="text-center max-w-2xl mx-auto space-y-6 mb-16 relative z-10">
              <div className="text-sm font-display text-brand-crimson tracking-wider flex items-center justify-center gap-3">
                <span className="font-mono text-xs opacity-50">03 /</span> नियंत्रण
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight font-sans">
                One dashboard. Full control.
              </h2>
              <p className="text-slate-400 text-lg">
                Everything your community needs, without managing the bot through endless chat commands.
              </p>
            </div>

            {/* Dashboard Mock */}
            <div className="relative mx-auto max-w-5xl">
              <div className="absolute inset-0 glow-orb-primary opacity-50 rounded-full"></div>
              <div className="glass-panel border border-white/10 rounded-2xl sm:rounded-[2rem] overflow-hidden shadow-2xl relative z-10 bg-slate-950/90 aspect-[16/9] sm:aspect-auto sm:h-[600px] flex flex-col">
                {/* Mock Header */}
                <div className="h-12 border-b border-white/5 flex items-center px-4 gap-2 bg-slate-900/50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                  </div>
                  <div className="mx-auto px-24 py-1.5 rounded-md bg-slate-950 border border-white/5 text-[10px] font-mono text-slate-500">
                    dashboard.digitalvigital.com
                  </div>
                </div>
                {/* Mock Content */}
                <div className="flex-1 flex">
                  {/* Mock Sidebar */}
                  <div className="w-48 sm:w-64 border-r border-white/5 p-4 space-y-6 hidden sm:block">
                    <div className="flex items-center gap-2 mb-8">
                      <div className="w-8 h-8 rounded bg-brand-crimson flex items-center justify-center text-[10px] font-mono font-bold text-white">DV</div>
                      <div className="h-2 w-24 bg-slate-800 rounded"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-2 w-12 bg-slate-800 rounded mb-4"></div>
                      <div className="h-8 rounded-lg bg-white/5 border border-white/5"></div>
                      <div className="h-8 rounded-lg bg-transparent hover:bg-white/5"></div>
                      <div className="h-8 rounded-lg bg-transparent hover:bg-white/5"></div>
                    </div>
                    <div className="space-y-3 pt-4">
                      <div className="h-2 w-16 bg-slate-800 rounded mb-4"></div>
                      <div className="h-8 rounded-lg bg-transparent hover:bg-white/5"></div>
                      <div className="h-8 rounded-lg bg-transparent hover:bg-white/5"></div>
                    </div>
                  </div>
                  {/* Mock Main */}
                  <div className="flex-1 p-6 sm:p-10">
                    <div className="h-6 w-48 bg-slate-800 rounded mb-8"></div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                      <div className="h-32 rounded-2xl border border-white/5 bg-white/5"></div>
                      <div className="h-32 rounded-2xl border border-white/5 bg-white/5"></div>
                      <div className="h-32 rounded-2xl border border-white/5 bg-white/5"></div>
                    </div>
                    <div className="h-64 rounded-2xl border border-white/5 bg-slate-900/30"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 sm:py-32 px-6 border-t border-white/5 bg-gradient-to-b from-slate-950 to-black">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl sm:text-6xl font-display text-white tracking-tight">
              समुदाय से जुड़िये
            </h2>
            <p className="text-xl text-slate-400 font-sans">
              Be part of Digital Vigital.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="https://digitalvigital.fun" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold bg-brand-crimson hover:bg-brand-crimson-dark text-white transition-all w-full sm:w-auto shadow-xl shadow-brand-crimson/20">
                <span>Join Community</span>
                <ChevronRight className="w-4 h-4" />
              </a>
              {user && (
                <Link to="/dashboard" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all w-full sm:w-auto">
                  <span>Open Dashboard</span>
                </Link>
              )}
            </div>
          </div>
        </section>

      </main>

      <Footer botInfo={botInfo} />
    </div>
  );
}
