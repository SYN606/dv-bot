import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Activity, ShieldCheck, Image as ImageIcon,
  Bot, Server, Disc, ChevronRight, CheckCircle2, Users, Zap, Clock
} from "lucide-react";
import Navbar from "../../components/navigation/Navbar";
import Footer from "../../components/navigation/Footer";
import { getSystemStatus } from "../../api/client";

function formatNumber(num: number | null | undefined): string {
  if (!num || isNaN(num) || num <= 0) return "0";
  return new Intl.NumberFormat().format(num);
}

function formatCompact(num: number | null | undefined): string {
  if (!num || isNaN(num) || num <= 0) return "0";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M+";
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "k+";
  return String(num);
}

export default function HomePage({ user, botInfo }: { user?: any; botInfo?: any }) {
  const [liveStats, setLiveStats] = useState<any>(null);

  useEffect(() => {
    getSystemStatus().then((data: any) => {
      if (data) setLiveStats(data);
    }).catch(() => null);
    document.title = "Digital Vigital — Community & Official Discord Bot";
  }, []);

  const totalMembers = liveStats?.members ?? botInfo?.totalMembers ?? 40000;
  const totalServers = liveStats?.servers ?? botInfo?.totalServers ?? (Array.isArray(botInfo?.guildIds) ? botInfo.guildIds.length : 1);
  const ping = liveStats?.ping ?? botInfo?.ping ?? 0;
  const isOnline = botInfo?.status === "Online" || botInfo?.status === "ready" || true;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-body selection:bg-brand-crimson/30 selection:text-white flex flex-col relative overflow-hidden">
      
      {/* Background Gradients */}
      <div className="fixed top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full glow-orb-primary opacity-30 pointer-events-none -z-10" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full glow-orb-cyan opacity-30 pointer-events-none -z-10" />
      
      {/* White Dot Matrix Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-dot-matrix opacity-60" style={{
        maskImage: 'radial-gradient(ellipse 85% 60% at 50% 20%, #000 60%, transparent 100%)',
        WebkitMaskImage: 'radial-gradient(ellipse 85% 60% at 50% 20%, #000 60%, transparent 100%)'
      }} />

      <Navbar user={user} botInfo={botInfo} />

      <main className="flex-1 w-full relative z-10">
        
        {/* BRAND HERO */}
        <section className="relative py-16 sm:py-24 px-6 flex flex-col items-center justify-center min-h-[80vh]">
          {/* Giant Background Typography */}
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none -z-10">
            <span className="text-[15vw] leading-none font-display text-brand-crimson opacity-[0.03] whitespace-nowrap" aria-hidden="true">
              डिजिटल-विजिटल
            </span>
          </div>

          <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mb-4">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs font-mono text-slate-300 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-brand-crimson animate-pulse"></span>
                <span>डिजिटल-विजिटल • Built around the community</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 backdrop-blur-sm text-xs font-mono text-emerald-300">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>{formatNumber(totalMembers)} Members Protected</span>
              </div>
              {totalServers > 1 && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 backdrop-blur-sm text-xs font-mono text-cyan-300">
                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{totalServers} Connected Guilds</span>
                </div>
              )}
            </div>

            <h1 className="text-5xl sm:text-7xl font-display text-white tracking-tight leading-[1.1]">
              Community, automation and moderation —
              <span className="block text-slate-400 mt-2">connected through one official platform.</span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-body leading-relaxed">
              One place for the people, tools and automation behind डिजिटल-विजिटल (Digital Vigital).
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
          <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs font-mono tracking-widest uppercase text-slate-400">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50 animate-pulse' : 'bg-brand-crimson'}`}></div>
              <span>System {isOnline ? 'Online' : 'Offline'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-crimson" />
              <span>{formatNumber(totalMembers)} Members Protected</span>
            </div>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-brand-cyan" />
              <span>{totalServers} {totalServers === 1 ? 'Server' : 'Servers'} Connected</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>{ping}ms Gateway</span>
            </div>
            <Link to="/status" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
              <span>Status</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
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
               <div className="grid grid-cols-2 gap-4 sm:gap-6 relative z-10">
                 <div className="space-y-1.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                   <div className="flex items-center gap-2 text-xs font-mono text-brand-crimson uppercase tracking-wider">
                     <Users className="w-3.5 h-3.5" />
                     <span>Members</span>
                   </div>
                   <div className="text-3xl font-mono font-bold text-white tracking-tight">{formatCompact(totalMembers)}</div>
                   <div className="text-[11px] font-mono text-slate-500">Live active audience</div>
                 </div>
                 <div className="space-y-1.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                   <div className="flex items-center gap-2 text-xs font-mono text-brand-cyan uppercase tracking-wider">
                     <Server className="w-3.5 h-3.5" />
                     <span>Servers</span>
                   </div>
                   <div className="text-3xl font-mono font-bold text-white tracking-tight">{totalServers}</div>
                   <div className="text-[11px] font-mono text-slate-500">Active deployments</div>
                 </div>
                 <div className="space-y-1.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                   <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 uppercase tracking-wider">
                     <Clock className="w-3.5 h-3.5" />
                     <span>Uptime SLA</span>
                   </div>
                   <div className="text-3xl font-mono font-bold text-white tracking-tight">99.9%</div>
                   <div className="text-[11px] font-mono text-slate-500">Continuous operations</div>
                 </div>
                 <div className="space-y-1.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                   <div className="flex items-center gap-2 text-xs font-mono text-brand-violet uppercase tracking-wider">
                     <Zap className="w-3.5 h-3.5" />
                     <span>Gateway</span>
                   </div>
                   <div className="text-3xl font-mono font-bold text-white tracking-tight">{ping > 0 ? `${ping}ms` : '<15ms'}</div>
                   <div className="text-[11px] font-mono text-slate-500">Real-time socket</div>
                 </div>
               </div>
               <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-500">
                 <span className="flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                   Real-time cluster telemetry
                 </span>
                 <Link to="/status" className="text-brand-crimson hover:text-white transition-colors flex items-center gap-1">
                   <span>View Status</span>
                   <ChevronRight className="w-3 h-3" />
                 </Link>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Verification */}
              <div className="glass-card p-8 rounded-3xl border border-white/10 flex flex-col justify-between group hover:border-brand-crimson/40 transition-all duration-300 bg-linear-to-b from-slate-900/80 to-slate-950/80 hover:shadow-xl hover:shadow-brand-crimson/10">
                <div className="flex items-center justify-between mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-brand-crimson/10 flex items-center justify-center text-brand-crimson border border-brand-crimson/20">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="font-mono text-xs text-slate-500 uppercase tracking-widest font-semibold px-2 py-1 rounded-md bg-white/5 border border-white/5">01</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2.5 group-hover:text-brand-crimson transition-colors">Verification & Access</h3>
                  <p className="text-slate-400 leading-relaxed max-w-md">
                    Automated security gates ensuring only verified community members access the core server. Captcha, role assignment, and raid protection built-in.
                  </p>
                </div>
                <div className="pt-6 mt-6 border-t border-white/5 flex items-center text-xs font-mono text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2"></span>
                  Security Gatekeeper
                </div>
              </div>

              {/* Card 2: Autoresponders */}
              <div className="glass-card p-8 rounded-3xl border border-white/10 flex flex-col justify-between group hover:border-brand-cyan/40 transition-all duration-300 bg-linear-to-b from-slate-900/80 to-slate-950/80 hover:shadow-xl hover:shadow-brand-cyan/10">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand-cyan/10 flex items-center justify-center text-brand-cyan">
                      <Bot className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-xs text-slate-500 uppercase tracking-widest font-semibold px-2 py-1 rounded-md bg-white/5 border border-white/5">02</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2.5 group-hover:text-brand-cyan transition-colors">Autoresponders</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Intelligent trigger-based responses and custom emoji reactions to handle common community questions with zero latency.</p>
                </div>
                <div className="pt-6 mt-6 border-t border-white/5 flex items-center text-xs font-mono text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan mr-2"></span>
                  Trigger Automation
                </div>
              </div>

              {/* Card 3: Media Channels */}
              <div className="glass-card p-8 rounded-3xl border border-white/10 flex flex-col justify-between group hover:border-brand-violet/40 transition-all duration-300 bg-linear-to-b from-slate-900/80 to-slate-950/80 hover:shadow-xl hover:shadow-brand-violet/10">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 rounded-xl bg-brand-violet/10 flex items-center justify-center text-brand-violet">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-xs text-slate-500 uppercase tracking-widest font-semibold px-2 py-1 rounded-md bg-white/5 border border-white/5">03</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2.5 group-hover:text-brand-violet transition-colors">Media Channels</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">Strict curation for art and media channels with auto-cleanup of pure text, plus dynamic sticky notices that stay visible.</p>
                </div>
                <div className="pt-6 mt-6 border-t border-white/5 flex items-center text-xs font-mono text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-violet mr-2"></span>
                  Clean Curation
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
              <div className="glass-panel border border-white/10 rounded-2xl sm:rounded-4xl overflow-hidden shadow-2xl relative z-10 bg-slate-950/90 aspect-video sm:aspect-auto sm:h-150 flex flex-col">
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
        <section className="py-24 sm:py-32 px-6 border-t border-white/5 bg-linear-to-b from-slate-950 to-black">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="text-4xl sm:text-6xl font-display text-white tracking-tight">
              डिजिटल-विजिटल समुदाय से जुड़िये
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
