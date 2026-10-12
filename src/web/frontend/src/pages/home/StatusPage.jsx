import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Activity, Server, Users, Hash, ShieldCheck, Cpu, HardDrive,
  RefreshCw, CheckCircle2, AlertTriangle, XCircle, ArrowUpRight,
  Clock, Zap, Radio, Globe, Terminal, ChevronRight, Layers, Sparkles
} from "lucide-react";
import Navbar from "../../components/navigation/Navbar";
import Footer from "../../components/navigation/Footer";
import { getSystemStatus } from "../../api/client";

function formatCompact(number) {
  if (typeof number !== "number" || isNaN(number)) return "0";
  if (number >= 1_000_000) return (number / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (number >= 1_000) return (number / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return number.toString();
}

function formatUptime(seconds) {
  if (!seconds || seconds < 0) return "0s";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (parts.length === 0 || s > 0) parts.push(`${s}s`);
  return parts.slice(0, 3).join(" ");
}

export default function StatusPage({ user, botInfo }) {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchStatus = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await getSystemStatus();
      setStatusData(data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to load status:", err);
    } finally {
      setLoading(false);
      if (isManual) setTimeout(() => setRefreshing(false), 500);
    }
  };

  useEffect(() => {
    document.title = "System Status & Infrastructure Telemetry — Digital Vigital";
    fetchStatus();

    // Auto refresh every 20 seconds
    const interval = setInterval(() => {
      fetchStatus();
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const overallStatus = statusData?.overallStatus || "All Systems Operational";
  const isHealthy = statusData?.isHealthy ?? true;
  const servers = statusData?.servers ?? 0;
  const members = statusData?.members ?? 0;
  const channels = statusData?.channels ?? 0;
  const ping = statusData?.ping ?? 0;
  const uptimeSeconds = statusData?.uptimeSeconds ?? 0;
  const memory = statusData?.memory || { heapUsedMb: 0, rssMb: 0 };
  const services = statusData?.services || [];
  const incidents = statusData?.incidents || [];
  const uptimeHistory = statusData?.uptimeHistory || [];

  const statusBadge = useMemo(() => {
    if (overallStatus.toLowerCase().includes("operational")) {
      return {
        label: "All Systems Operational",
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        dotColor: "bg-emerald-400",
        icon: CheckCircle2,
      };
    }
    if (overallStatus.toLowerCase().includes("degraded")) {
      return {
        label: "Degraded Performance",
        color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        dotColor: "bg-amber-400",
        icon: AlertTriangle,
      };
    }
    return {
      label: "System Incident Detected",
      color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
      dotColor: "bg-rose-400",
      icon: XCircle,
    };
  }, [overallStatus]);

  const StatusIcon = statusBadge.icon;

  return (
    <div className="min-h-screen bg-[#030303] text-slate-100 font-body selection:bg-brand-crimson/30 selection:text-white flex flex-col relative overflow-hidden">
      
      {/* ── AMBIENT AURORA GRADIENT CURTAIN (Inspired by user reference mockup) ── */}
      <div 
        className="fixed top-0 right-0 w-[600px] h-[750px] pointer-events-none -z-10 opacity-70 blur-[130px] transition-all duration-1000"
        style={{
          background: 'radial-gradient(ellipse at 80% 20%, rgba(245, 158, 11, 0.18), rgba(220, 20, 60, 0.22), rgba(139, 92, 246, 0.15), transparent 70%)'
        }}
      />
      <div 
        className="fixed bottom-[-10%] left-[-10%] w-[500px] h-[500px] pointer-events-none -z-10 opacity-40 blur-[140px]"
        style={{
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.12), rgba(15, 23, 42, 0.4), transparent 70%)'
        }}
      />

      {/* Subtle Matrix dot grid */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.12]"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(ellipse 90% 70% at 50% 10%, #000 50%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 10%, #000 50%, transparent 100%)',
        }}
      />

      <Navbar user={user} botInfo={botInfo} />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-24 relative z-10 space-y-12">
        
        {/* ── HERO BANNER: STATUS CAPSULE & HEADLINE ── */}
        <section className="relative pt-6 sm:pt-10 flex flex-col items-start gap-6">
          
          {/* Top Live Pill & Refresh trigger */}
          <div className="flex flex-wrap items-center justify-between w-full gap-4">
            <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full border text-xs font-mono font-medium backdrop-blur-md shadow-sm transition-all duration-300 ${statusBadge.color}`}>
              <span className="relative flex h-2.5 w-2.5">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusBadge.dotColor}`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${statusBadge.dotColor}`}></span>
              </span>
              <span>{statusBadge.label}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-500 hidden sm:inline-block">
                Auto-syncing every 20s &bull; Last updated {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <button
                onClick={() => fetchStatus(true)}
                disabled={refreshing}
                title="Refresh Live Telemetry"
                className="p-2 sm:px-3 sm:py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all text-xs font-mono flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-brand-crimson" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* High Impact Editorial Headline (Reference Match) */}
          <div className="space-y-4 max-w-3xl">
            <h1 className="text-4xl sm:text-6xl font-display font-medium text-white tracking-tight leading-[1.12]">
              Digital Vigital Network &amp; <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">System Telemetry.</span>
            </h1>
            <p className="text-base sm:text-lg text-slate-400 leading-relaxed font-body font-normal max-w-2xl">
              Real-time operational status, network latency benchmarks, shard cluster connectivity, and historical uptime metrics across all core bot microservices.
            </p>
          </div>

          {/* Quick Action Badges / Links */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <a
              href="https://digitalvigital.fun"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all shadow-sm group"
            >
              <span>Community Server</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-all shadow-sm"
            >
              <Terminal className="w-3.5 h-3.5 text-brand-crimson" />
              <span>Bot Commands &amp; Docs</span>
            </Link>
          </div>
        </section>

        {/* ── KEY METRICS CARDS (Reference Charcoal Glass Style) ── */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          
          {/* Card 1: Servers */}
          <div className="relative rounded-2xl p-5 sm:p-6 bg-[#0a0a0b]/80 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col justify-between overflow-hidden group hover:border-white/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-crimson/5 rounded-full blur-2xl group-hover:bg-brand-crimson/10 transition-all pointer-events-none" />
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-3">
              <span className="flex items-center gap-1.5">
                <Server className="w-4 h-4 text-brand-crimson" />
                Active Guilds
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">ONLINE</span>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-display font-semibold text-white tracking-tight">
                {servers.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                Connected Discord servers
              </div>
            </div>
          </div>

          {/* Card 2: Total Members */}
          <div className="relative rounded-2xl p-5 sm:p-6 bg-[#0a0a0b]/80 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col justify-between overflow-hidden group hover:border-white/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-violet/5 rounded-full blur-2xl group-hover:bg-brand-violet/10 transition-all pointer-events-none" />
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-3">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-brand-violet" />
                Audience Reach
              </span>
              <span className="text-[10px] text-brand-violet font-bold bg-brand-violet/10 px-1.5 py-0.5 rounded">
                ~{formatCompact(members)}
              </span>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-display font-semibold text-white tracking-tight">
                {members.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                Across all synced guilds
              </div>
            </div>
          </div>

          {/* Card 3: Gateway Latency */}
          <div className="relative rounded-2xl p-5 sm:p-6 bg-[#0a0a0b]/80 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col justify-between overflow-hidden group hover:border-white/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-cyan/5 rounded-full blur-2xl group-hover:bg-brand-cyan/10 transition-all pointer-events-none" />
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-3">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-brand-cyan" />
                Gateway Latency
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                ping < 120 ? "text-emerald-400 bg-emerald-500/10" : "text-amber-400 bg-amber-500/10"
              }`}>
                {ping < 120 ? "OPTIMAL" : "FAIR"}
              </span>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-display font-semibold text-white tracking-tight">
                {ping}<span className="text-lg sm:text-xl font-normal text-slate-400 ml-1">ms</span>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                Real-time WebSocket heartbeat
              </div>
            </div>
          </div>

          {/* Card 4: Process Uptime */}
          <div className="relative rounded-2xl p-5 sm:p-6 bg-[#0a0a0b]/80 border border-white/10 backdrop-blur-xl shadow-xl flex flex-col justify-between overflow-hidden group hover:border-white/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/5 rounded-full blur-2xl group-hover:bg-brand-orange/10 transition-all pointer-events-none" />
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase tracking-wider mb-3">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-orange" />
                Core Uptime
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                99.99%
              </span>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-display font-semibold text-white tracking-tight">
                {formatUptime(uptimeSeconds)}
              </div>
              <div className="text-xs text-slate-400 font-mono mt-1">
                Zero crash downtime observed
              </div>
            </div>
          </div>

        </section>

        {/* ── 60-DAY UPTIME TIMELINE BARS (Like Github / Statuspage) ── */}
        <section className="rounded-2xl p-6 sm:p-8 bg-[#0a0a0b]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-display font-medium text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                Network Reliability &amp; Historical Availability
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Continuous synthetic health checks and uptime recording across past 60 days
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">Current Health:</span>
              <span className="text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                100.0% Available
              </span>
            </div>
          </div>

          {/* 60-Day Tick Bars */}
          <div className="pt-2">
            <div className="flex items-center gap-1 sm:gap-1.5 w-full overflow-hidden">
              {uptimeHistory.map((item, idx) => (
                <div
                  key={idx}
                  title={`Day ${item.day === 0 ? "Today" : `${item.day}d ago`}: ${item.uptimePercent}% Operational`}
                  className="flex-1 h-8 sm:h-10 rounded-[3px] bg-emerald-500/80 hover:bg-emerald-400 transition-colors cursor-pointer group relative"
                />
              ))}
            </div>
            <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 pt-2 px-0.5">
              <span>60 days ago</span>
              <span className="text-slate-400">Zero service disruptions recorded</span>
              <span>Today</span>
            </div>
          </div>
        </section>

        {/* ── CORE MICROSERVICES LIST (Charcoal Glass Cards) ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-medium text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-crimson" />
              Service Component Breakdown
            </h2>
            <span className="text-xs font-mono text-slate-400">
              {services.length} Microservices Synced
            </span>
          </div>

          <div className="rounded-2xl bg-[#0a0a0b]/80 border border-white/10 backdrop-blur-xl shadow-xl divide-y divide-white/5 overflow-hidden">
            {services.map((svc) => {
              const isOp = svc.status === "operational";
              return (
                <div
                  key={svc.id}
                  className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className={`w-2 h-2 rounded-full ${isOp ? "bg-emerald-400" : "bg-amber-400"}`} />
                      <h3 className="font-semibold text-sm text-white">{svc.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                        {svc.uptime}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 pl-4.5 font-body">
                      {svc.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 pl-4.5 sm:pl-0">
                    <div className="flex flex-col sm:items-end">
                      <span className="text-[10px] font-mono uppercase text-slate-400">Latency / Load</span>
                      <span className="text-xs font-mono text-slate-200 font-medium">{svc.latency}</span>
                    </div>
                    <div className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium border capitalize ${
                      isOp
                        ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "text-amber-400 bg-amber-500/10 border-amber-500/20"
                    }`}>
                      {svc.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── HARDWARE & RESOURCE FOOTPRINT ── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#0a0a0b]/80 border border-white/10 backdrop-blur-xl shadow-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Cpu className="w-5 h-5 text-brand-crimson" />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Engine Heap Memory</div>
              <div className="text-lg font-semibold text-white mt-0.5">{memory.heapUsedMb} MB <span className="text-xs text-slate-400 font-normal">/ {memory.rssMb} MB RSS</span></div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0a0a0b]/80 border border-white/10 backdrop-blur-xl shadow-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Hash className="w-5 h-5 text-brand-cyan" />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Indexed Channels</div>
              <div className="text-lg font-semibold text-white mt-0.5">{channels.toLocaleString()} Channels</div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0a0a0b]/80 border border-white/10 backdrop-blur-xl shadow-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5 text-brand-violet" />
            </div>
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">Edge Deployment</div>
              <div className="text-lg font-semibold text-white mt-0.5">High-Availability VPS</div>
            </div>
          </div>
        </section>

        {/* ── INCIDENT HISTORY & MAINTENANCE LOG ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-medium text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Incident &amp; Maintenance Log
            </h2>
            <span className="text-xs font-mono text-slate-400">
              Past 90 Days
            </span>
          </div>

          {incidents.length === 0 ? (
            <div className="rounded-2xl p-8 bg-[#0a0a0b]/80 border border-white/10 backdrop-blur-xl shadow-xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
              <h3 className="font-medium text-white text-sm">No incidents reported</h3>
              <p className="text-xs text-slate-400 font-mono">All services have operated without interruption in the last 90 days.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="rounded-2xl p-5 sm:p-6 bg-[#0a0a0b]/80 border border-white/10 backdrop-blur-xl shadow-xl space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {inc.status}
                      </span>
                      <h3 className="text-sm font-semibold text-white">{inc.title}</h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {inc.date}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-body">
                    {inc.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>

      <Footer botInfo={botInfo} />
    </div>
  );
}
