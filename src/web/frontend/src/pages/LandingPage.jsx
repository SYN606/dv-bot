import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import {
  ShieldCheck,
  TrendingUp,
  Image as ImageIcon,
  Pin,
  Bot,
  Sliders,
  Disc,
  ArrowRight,
  BookOpen,
  Zap,
  Lock,
  Activity,
  CheckCircle2,
  Cpu,
  Users,
  BarChart3,
  Layers,
  Sparkles,
} from "lucide-react";

export default function LandingPage({ user, botInfo }) {
  const botAvatar = botInfo?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png";
  const botBanner = botInfo?.banner;
  const botName = botInfo?.username || "Digital Vigital";

  const metrics = [
    { label: "Response Latency", value: `${botInfo?.ping || 25}ms`, desc: "Live Gateway Ping", icon: Zap, color: "text-crimson" },
    { label: "Uptime SLA", value: "99.9%", desc: "Continuous 24/7 gateway", icon: Activity, color: "text-crimson" },
    { label: "Dashboard Driven", value: "100%", desc: "Zero command setup required", icon: Sliders, color: "text-crimson" },
    { label: "System Status", value: botInfo?.status || "Online", desc: "Core services operational", icon: CheckCircle2, color: "text-crimson" },
  ];

  const features = [
    {
      icon: Sparkles,
      title: "Supporter Rewards (Vanity)",
      desc: "Automatically grant roles to users who put your server's vanity URL or Clan Tag in their Discord Custom Status.",
      color: "text-crimson",
      bg: "bg-crimson/10 border-crimson/20",
    },
    {
      icon: TrendingUp,
      title: "Leaderboard Auto-Roles",
      desc: "Background workers run weekly to calculate the top Text and Voice chatters, automatically assigning exclusive medals and roles.",
      color: "text-crimson",
      bg: "bg-crimson/10 border-crimson/20",
    },
    {
      icon: ShieldCheck,
      title: "Automated Verification Gate",
      desc: "Instant 1-click button verification with automatic role assignment, minimum account age security, and audit logging.",
      color: "text-crimson",
      bg: "bg-crimson/10 border-crimson/20",
    },
    {
      icon: Bot,
      title: "Intelligent Autoresponder",
      desc: "Create dynamic trigger words or phrases that the bot instantly replies to with embedded messages or custom text.",
      color: "text-crimson",
      bg: "bg-crimson/10 border-crimson/20",
    },
    {
      icon: ImageIcon,
      title: "Media-Only Channels",
      desc: "Strictly enforce meme or art channels by automatically deleting messages that don't contain attachments or links.",
      color: "text-crimson",
      bg: "bg-crimson/10 border-crimson/20",
    },
    {
      icon: Pin,
      title: "Sticky Channel Notices",
      desc: "Pin an automatic message to the absolute bottom of a busy chat channel, automatically repinning itself as people talk.",
      color: "text-crimson",
      bg: "bg-crimson/10 border-crimson/20",
    },
  ];

  const architecturalPillars = [
    {
      icon: Layers,
      title: "Dashboard-First Philosophy",
      desc: "No more clunky command configuration in chat channels. Configure verification buttons, autoresponder rules, sticky messages, and staff roles directly from a responsive web dashboard.",
      highlight: "Zero In-Chat Setup",
    },
    {
      icon: ShieldCheck,
      title: "Intelligent 429 & Rate-Limit Shield",
      desc: "Engineered with webhook queuing, isolated rate limit buckets, mention aggregation, and in-flight mutex locks to completely eliminate Discord 429 rate limit choke points during chat spikes.",
      highlight: "Burst Protected",
    },
    {
      icon: Users,
      title: "Granular Staff & Owner Protections",
      desc: "Delegate bot administration safely using role or user-based staff permissions. Strict server owner immunity prevents accidental self-demotions, lockouts, or unauthorized modifications.",
      highlight: "Role Hierarchy Aware",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Connect Your Server",
      desc: "Log in with Discord OAuth2 and choose any community where you hold Administrator or Manage Server permissions.",
      icon: Disc,
    },
    {
      step: "02",
      title: "Configure Features",
      desc: "Set up verification gates, designate media-only channels, create autoresponders, or customize sticky notices with live previews.",
      icon: Sliders,
    },
    {
      step: "03",
      title: "Automate & Analyze",
      desc: "Relax as DV-BOT handles spam, verifies members, and records real-time chat and voice telemetry for your server.",
      icon: BarChart3,
    },
  ];

  return (
    <div className="min-h-screen bg-black text-neutral-200 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-white relative overflow-x-hidden">
      {/* Gentle ambient lighting orbs */}
      <div className="fixed top-[-120px] left-[-100px] w-[500px] h-[500px] rounded-full bg-crimson/5 blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-crimson/5 blur-[140px] pointer-events-none -z-10" />

      {/* Global Top Navbar */}
      <Navbar user={user} botInfo={botInfo} />

      {/* Hero Section */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 flex-1 flex flex-col justify-center">
        {/* Banner if available */}
        {botBanner && (
          <div className="w-full h-44 sm:h-64 rounded-3xl overflow-hidden mb-8 shadow-2xl border border-white/10 relative">
            <img src={botBanner} alt="Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          </div>
        )}

        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Bot Avatar Badge - Gracefully Rounded */}
          <div className="inline-flex p-1 rounded-full bg-white/10 p-1 shadow-xl shadow-[0_0_20px_rgba(255,255,255,0.05)]">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-900 ring-2 ring-white/10">
              <img src={botAvatar} alt={botName} className="w-full h-full object-cover rounded-full" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-crimson/5 border border-white/10 text-white text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Next-Gen Discord Bot Engine
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white bg-clip-text text-transparent leading-[1.1]">
              The Modern Discord Bot Dashboard
            </h1>
            <p className="text-sm sm:text-base text-neutral-400 max-w-xl mx-auto leading-relaxed">
              Empower your community with enterprise-grade moderation, automated verification gates, real-time analytics, and modular server automation.
            </p>
          </div>

          {/* Action CTA */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/40 transition-all hover:scale-[1.02]"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <a
                href="/auth/login"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm bg-[#5865F2] hover:bg-[#4752c4] text-white shadow-xl shadow-indigo-500/25 transition-all hover:scale-[1.02]"
              >
                <Disc className="w-5 h-5" />
                <span>Login with Discord</span>
              </a>
            )}
            <Link
              to="/docs"
              className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl font-semibold text-sm bg-crimson/5 hover:bg-white/10 text-neutral-300 border border-white/10 hover:border-white/20 transition-all shadow-md"
            >
              <BookOpen className="w-4 h-4 text-white" />
              <span>Explore Commands</span>
            </Link>
          </div>
        </div>

        {/* Live Metrics & Telemetry Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-12 sm:mt-16">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <div
                key={i}
                className="glass-card p-4 sm:p-5 rounded-2xl border border-white/5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono font-medium text-neutral-400 uppercase tracking-wider">
                    {m.label}
                  </span>
                  <Icon className={`w-4 h-4 ${m.color}`} />
                </div>
                <div>
                  <span className="text-xl sm:text-2xl font-extrabold text-white font-mono tracking-tight">
                    {m.value}
                  </span>
                  <p className="text-[11px] text-neutral-500 mt-0.5 truncate">{m.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Core Features Grid */}
        <div className="mt-16 sm:mt-24 space-y-4">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
              Core Modules
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Everything Your Community Needs
            </p>
            <p className="text-xs sm:text-sm text-neutral-400">
              Powerful automation tools designed to safeguard chat quality, verify authentic members, and deliver deep insights.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <div
                  key={i}
                  className="glass-card p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all group"
                >
                  <div
                    className={`w-10 h-10 rounded-xl ${feat.bg} flex items-center justify-center mb-4 ${feat.color} group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-base text-white mb-1.5">{feat.title}</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Architectural Pillars / Why Digital Vigital */}
        <div className="mt-20 sm:mt-28 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
              High Performance
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Engineered for High-Traffic Servers
            </p>
            <p className="text-xs sm:text-sm text-neutral-400">
              Built on the ultra-fast Bun JavaScript runtime with native concurrency controls and rate-limit safeguards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {architecturalPillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <div
                  key={i}
                  className="glass-card p-6 sm:p-7 rounded-2xl border border-white/5 hover:border-white/15 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-crimson/5 text-white flex items-center justify-center border border-white/10">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-crimson/5 text-white border border-white/10">
                        {p.highlight}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white tracking-tight">{p.title}</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* How It Works (3 Steps) */}
        <div className="mt-20 sm:mt-28 space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest font-mono">
              Seamless Workflow
            </h2>
            <p className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Up and Running in 3 Steps
            </p>
            <p className="text-xs sm:text-sm text-neutral-400">
              No complex command chains or confusing bot tokens. Zero barrier to entry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {steps.map((st, i) => {
              const Icon = st.icon;
              return (
                <div
                  key={i}
                  className="glass-card p-6 rounded-2xl border border-white/5 flex flex-col justify-between relative group hover:border-white/10 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-black font-mono text-white/40 group-hover:text-white/70 transition-colors">
                        {st.step}
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-crimson/5 text-neutral-400 flex items-center justify-center">
                        <Icon className="w-4 h-4" />
                      </div>
                    </div>
                    <h3 className="font-bold text-base text-white mb-2">{st.title}</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">{st.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-20 sm:mt-28 p-8 sm:p-12 rounded-3xl glass-panel border border-white/10 relative overflow-hidden text-center space-y-6">
          <div className="max-w-2xl mx-auto space-y-3 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-crimson/5 border border-white/10 text-white text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Instant Deployment</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to Upgrade Your Discord Server?
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-lg mx-auto">
              Equip your community with automated verification, rate-limit resilience, and deep analytics today.
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              {user ? (
                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02]"
                >
                  <span>Go to Server Selector</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <a
                  href="/auth/login"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-bold bg-[#5865F2] hover:bg-[#4752c4] text-white shadow-xl shadow-indigo-500/25 transition-all hover:scale-[1.02]"
                >
                  <Disc className="w-4 h-4" />
                  <span>Get Started with Discord</span>
                </a>
              )}
              <Link
                to="/docs"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-semibold bg-crimson/5 hover:bg-white/10 text-neutral-300 border border-white/10 transition-all"
              >
                <span>Read the Docs</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Global Branded Footer */}
      <Footer botInfo={botInfo} />
    </div>
  );
}
