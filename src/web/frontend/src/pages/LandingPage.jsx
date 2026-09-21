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
} from "lucide-react";

export default function LandingPage({ user, botInfo }) {
  const botAvatar = botInfo?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png";
  const botBanner = botInfo?.banner;
  const botName = botInfo?.username || "Digital Vigital";

  const features = [
    {
      icon: ShieldCheck,
      title: "Automated Verification Gate",
      desc: "Instant 1-click button verification with automatic role assignment and logging.",
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      icon: TrendingUp,
      title: "Real-Time Activity Analytics",
      desc: "Interactive 7-day charts for message volume and voice minutes with leaderboards.",
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
    },
    {
      icon: ImageIcon,
      title: "Media-Only Channel Policies",
      desc: "Auto-purge non-media chat messages to maintain clean art and showcase channels.",
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      icon: Pin,
      title: "Self-Repinning Sticky Notices",
      desc: "Keep guidelines, schedules, or announcements perpetually pinned at channel bottom.",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      icon: Bot,
      title: "Dynamic Autoresponder",
      desc: "Trigger rich replies and auto-reactions on exact keywords, phrases, or regex patterns.",
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      icon: Sliders,
      title: "Granular Command Matrix",
      desc: "Restrict sensitive slash commands per-channel while safeguarding admin overrides.",
      color: "text-rose-400",
      bg: "bg-rose-500/10",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-x-hidden">
      {/* Background orbs */}
      <div className="fixed top-[-120px] left-[-100px] w-[600px] h-[600px] rounded-full bg-indigo-600/15 blur-[160px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-100px] right-[-100px] w-[600px] h-[600px] rounded-full bg-purple-600/15 blur-[160px] pointer-events-none -z-10" />

      {/* Global Top Navbar */}
      <Navbar user={user} botInfo={botInfo} />

      {/* Hero Section */}
      <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-20 flex-1 flex flex-col justify-center">
        {/* Banner if available */}
        {botBanner && (
          <div className="w-full h-44 sm:h-64 rounded-3xl overflow-hidden mb-8 shadow-2xl border border-white/10 relative">
            <img src={botBanner} alt="Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
          </div>
        )}

        <div className="text-center max-w-3xl mx-auto space-y-6">
          {/* Bot Avatar Badge */}
          <div className="inline-flex p-1 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-xl shadow-indigo-500/20">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-900">
              <img src={botAvatar} alt={botName} className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Next-Gen Discord Bot Engine
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent leading-[1.1]">
              The Modern Discord Bot Dashboard
            </h1>
            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
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
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-16 sm:mt-24">
          {features.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <div
                key={i}
                className="glass-card p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${feat.bg} flex items-center justify-center mb-4 ${feat.color} group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white mb-1.5">{feat.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </main>

      {/* Global Branded Footer */}
      <Footer />
    </div>
  );
}
