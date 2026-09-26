import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { getGuildMeta } from "../api/client";
import {
  ShieldCheck,
  TrendingUp,
  Image as ImageIcon,
  Terminal,
  Pin,
  Bot,
  Sliders,
  Shield,
  Activity,
  Users,
  Hash,
  ArrowRight,
} from "lucide-react";

export default function OverviewPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGuildMeta(guildId)
      .then((data) => setMeta(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [guildId]);

  const quickLinks = [
    {
      title: "Verification Gate",
      desc: "Configure automated member verification and verified roles.",
      icon: ShieldCheck,
      path: `/dashboard/${guildId}/verification`,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      title: "Activity Analytics",
      desc: "View 7-day chat and voice graphs and member leaderboards.",
      icon: TrendingUp,
      path: `/dashboard/${guildId}/analytics`,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10",
    },
    {
      title: "Staff Admin Roles",
      desc: "Delegate bot configuration rights to specific custom roles.",
      icon: Shield,
      path: `/dashboard/${guildId}/admin-roles`,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
    {
      title: "Media-Only Channels",
      desc: "Enforce media attachments and filter non-media chat messages.",
      icon: ImageIcon,
      path: `/dashboard/${guildId}/media-only`,
      color: "text-pink-400",
      bg: "bg-pink-500/10",
    },
    {
      title: "Command Restrictions",
      desc: "Disable or enable slash commands on a per-channel basis.",
      icon: Terminal,
      path: `/dashboard/${guildId}/commands`,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      title: "Sticky Notices",
      desc: "Auto-repin important messages at the bottom of channel history.",
      icon: Pin,
      path: `/dashboard/${guildId}/sticky`,
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
    {
      title: "Autoresponder",
      desc: "Configure automated trigger keywords, replies, and reactions.",
      icon: Bot,
      path: `/dashboard/${guildId}/autoresponder`,
      color: "text-rose-400",
      bg: "bg-rose-500/10",
    },
    {
      title: "Audit & Roles",
      desc: "Configure moderation audit logs and dynamic VC roles.",
      icon: Sliders,
      path: `/dashboard/${guildId}/config`,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
  ];

  return (
    <DashboardLayout user={user} botInfo={botInfo} breadcrumbs={["Overview"]}>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 relative overflow-hidden">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Bot Online & Connected
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Server Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-1.5 leading-relaxed">
              Manage your community features from one unified dashboard. Select a module below to configure rules, automate moderation, or inspect server engagement.
            </p>
          </div>
        </div>

        {/* Server Metrics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center gap-4 relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Members</p>
              <p className="text-xl font-bold text-white font-mono">
                {loading ? "..." : (meta?.guild?.memberCount || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Human Members</p>
              <p className="text-xl font-bold text-white font-mono">
                {loading ? "..." : (meta?.guild?.humanCount || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Bot Accounts</p>
              <p className="text-xl font-bold text-white font-mono">
                {loading ? "..." : (meta?.guild?.botCount || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
              <Hash className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Text Channels</p>
              <p className="text-xl font-bold text-white font-mono">
                {loading ? "..." : meta?.channels?.length || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Server Basic Details & Analytics Prompt */}
        <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {meta?.guild?.icon ? (
              <img src={meta.guild.icon} alt="Server Icon" className="w-14 h-14 rounded-xl border border-white/10" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                <span className="text-lg font-bold text-white/50">{meta?.guild?.name?.charAt(0) || "?"}</span>
              </div>
            )}
            <div>
              <h3 className="text-lg font-bold text-white">{meta?.guild?.name || "Server Details"}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                <span className="font-mono bg-white/5 px-2 py-0.5 rounded">ID: {meta?.guild?.id || "..."}</span>
                {meta?.guild?.createdAt && (
                  <span>Created: {new Date(meta.guild.createdAt).toLocaleDateString()}</span>
                )}
                {meta?.guild?.premiumSubscriptionCount > 0 && (
                  <span className="text-pink-400 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> {meta.guild.premiumSubscriptionCount} Boosts
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <Link 
            to={`/dashboard/${guildId}/analytics`}
            className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 font-medium transition-all text-sm shrink-0 whitespace-nowrap"
          >
            <TrendingUp className="w-4 h-4" />
            <span>View Full Analytics</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Quick Module Navigation Grid */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono">
            Configuration Modules
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((mod, idx) => {
              const Icon = mod.icon;
              return (
                <Link
                  key={idx}
                  to={mod.path}
                  className="glass-card glass-card-hover p-5 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div
                      className={`w-10 h-10 rounded-xl ${mod.bg} ${mod.color} flex items-center justify-center mb-3.5 group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-sm text-white mb-1">{mod.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{mod.desc}</p>
                  </div>
                  <div className="pt-4 flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">
                    <span>Configure</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
