import React, { useEffect, useState } from "react";
import { useParams, Link, useOutletContext } from "react-router-dom";
import {
  ShieldCheck, Pin, Image as ImageIcon,
  Bot, Terminal, Shield, ShieldAlert, Key, ScrollText, Sliders, AlertTriangle,
  Users, Hash, Server, ArrowRight, CheckCircle2, XCircle, UserPlus, Award, Trophy, PenTool
} from "lucide-react";
import {
  getGuildMeta, getVerification, getMediaOnly,
  getSticky, getAutoresponders, getAdminRoles
} from "../../api/client";
import { SuperuserBadge } from "../../components/ui";

export default function OverviewPage({ showToast }) {
  const { user, botInfo, currentGuild } = useOutletContext() || {};
  const { guildId } = useParams();
  
  const [meta, setMeta] = useState(null);
  const [modules, setModules] = useState({
    verification: null,
    media: [],
    sticky: [],
    autoresponder: [],
    adminRoles: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

      Promise.all([
        getGuildMeta(guildId).catch(() => null),
        getVerification(guildId).catch(() => null),
        getMediaOnly(guildId).catch(() => []),
        getSticky(guildId).catch(() => null),
        getAutoresponders(guildId).catch(() => []),
        getAdminRoles(guildId).catch(() => null)
      ]).then(([metaData, verData, medData, stiData, autData, admData]) => {
        if (isMounted) {
          const stickyArray = Array.isArray(stiData) ? stiData : (stiData?.stickyList || []);
          const adminRolesArray = Array.isArray(admData) ? admData : (admData?.adminRoles || []);

          setMeta(metaData);
          setModules({
            verification: verData?.enabled ? verData : null,
            media: Array.isArray(medData) ? medData : [],
            sticky: stickyArray,
            autoresponder: Array.isArray(autData) ? autData : [],
            adminRoles: adminRolesArray
          });
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [guildId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-mono text-sm tracking-widest">LOADING COMMAND CENTER...</p>
        </div>
      </div>
    );
  }

  const { guild } = meta || {};

  const StatusIndicator = ({ active, text }) => (
    <div className={`flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase ${active ? 'text-emerald-400' : 'text-slate-500'}`}>
      {active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {text || (active ? "Active" : "Disabled")}
    </div>
  );

  const ModuleCard = ({ title, path, icon: Icon, active, statusText, accent }) => (
    <Link to={path} className={`glass-card p-5 rounded-2xl group flex flex-col justify-between min-h-35 hover:border-indigo-500/40 transition-all duration-200`}>
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110 group-hover:shadow-md group-hover:shadow-indigo-600/30 transition-all duration-200">
          <Icon className="w-5 h-5 transition-transform duration-200 group-hover:scale-105" />
        </div>
        <StatusIndicator active={active} text={statusText} />
      </div>
      <div>
        <h3 className="font-semibold text-slate-200 group-hover:text-white transition-colors font-sans">{title}</h3>
        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          CONFIGURE <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-16">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden p-6 sm:p-8 rounded-2xl border border-white/[0.08] shrink-0 bg-[#0e111d] shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 font-bold text-indigo-400 text-[11px] font-mono tracking-wider uppercase">DV Command</div>
              <span className="text-xs font-mono text-slate-400 tracking-wider uppercase">Mission Control</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-white tracking-tight">Welcome back, {user?.username}.</h1>
              {user?.isSuperuser && <SuperuserBadge size="sm" />}
            </div>
            <p className="text-slate-400 text-sm">Community command center for <span className="text-slate-100 font-semibold">{currentGuild?.name}</span>.</p>
          </div>
          
          {/* Server Badge */}
          {guild && (
            <div className="p-3.5 rounded-xl flex items-center gap-3.5 shrink-0 bg-[#121524] border border-white/[0.08]">
              <div className="w-12 h-12 rounded-xl border border-white/15 p-0.5 overflow-hidden bg-slate-900 shadow-inner">
                {guild.icon ? (
                  <img src={guild.icon} alt={guild.name} className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-xs text-slate-300">{guild.name.slice(0,2).toUpperCase()}</div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white leading-tight mb-1">{guild.name}</h3>
                <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-indigo-400" /> {guild.memberCount.toLocaleString()}</span>
                  <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5 text-slate-400" /> {meta.channels?.length || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security & Audit Quick Hub */}
      <div className="p-5 sm:p-6 rounded-2xl border border-white/[0.08] bg-[#0e111d] shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Security & Governance Hub</h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-semibold">
                  GUARD ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized audit tracking, real-time Discord stream events, and administrator privilege exposure monitoring.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/dashboard/${guildId}/permissions`}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 hover:border-white/20 transition-all flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Permissions Audit</span>
            </Link>
            <Link
              to={`/dashboard/${guildId}/audit-logs?tab=stream`}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm shadow-indigo-600/30 transition-all flex items-center gap-1.5"
            >
              <ScrollText className="w-3.5 h-3.5" />
              <span>Live Audit Stream</span>
            </Link>
          </div>
        </div>

        {/* Tactical 3-Way Quick Jump Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
          <Link
            to={`/dashboard/${guildId}/permissions`}
            className="p-3.5 rounded-xl bg-[#121524] border border-white/[0.06] hover:border-white/15 transition-all group flex items-center justify-between"
          >
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Access Exposure</div>
              <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5 mt-0.5">
                <span>Inspect Admins & Roles</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Key className="w-4 h-4" />
            </div>
          </Link>

          <Link
            to={`/dashboard/${guildId}/audit-logs?tab=channels`}
            className="p-3.5 rounded-xl bg-[#121524] border border-white/[0.06] hover:border-white/15 transition-all group flex items-center justify-between"
          >
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Event Dispatch</div>
              <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5 mt-0.5">
                <span>Log Channels Routing</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <Sliders className="w-4 h-4" />
            </div>
          </Link>

          <Link
            to={`/dashboard/${guildId}/admin-roles`}
            className="p-3.5 rounded-xl bg-[#121524] border border-white/[0.06] hover:border-white/15 transition-all group flex items-center justify-between"
          >
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Dashboard Security</div>
              <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center gap-1.5 mt-0.5">
                <span>Staff Access Roles</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Modules */}
        <div className="lg:col-span-2 space-y-8">
          
          <section>
            <h2 className="text-xs font-bold text-slate-400 tracking-wider mb-4 flex items-center gap-2.5 uppercase font-sans">
              <span className="font-mono text-xs text-indigo-400 font-semibold">01 /</span> Security & Moderation
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ModuleCard 
                title="Permissions Audit" path={`/dashboard/${guildId}/permissions`} icon={ShieldAlert} accent="var(--color-brand-indigo)"
                active={true} statusText="Protected"
              />
              <ModuleCard 
                title="Audit Logs Center" path={`/dashboard/${guildId}/audit-logs`} icon={ScrollText} accent="var(--color-brand-indigo)"
                active={true} statusText="Active"
              />
              <ModuleCard 
                title="Warning Escalations" path={`/dashboard/${guildId}/warning-punishments`} icon={AlertTriangle} accent="var(--color-brand-indigo)"
                active={true} statusText="Configured"
              />
              <ModuleCard 
                title="Staff Access Roles" path={`/dashboard/${guildId}/admin-roles`} icon={Shield} accent="var(--color-brand-indigo)"
                active={modules.adminRoles.length > 0} statusText={modules.adminRoles.length > 0 ? `${modules.adminRoles.length} Roles` : "Disabled"}
              />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold text-slate-400 tracking-wider mb-4 flex items-center gap-2.5 uppercase font-sans">
              <span className="font-mono text-xs text-indigo-400 font-semibold">02 /</span> Community & Onboarding
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ModuleCard 
                title="Verification Gate" path={`/dashboard/${guildId}/verification`} icon={ShieldCheck} accent="var(--color-brand-indigo)"
                active={!!modules.verification} statusText={modules.verification ? "Active" : "Disabled"}
              />
              <ModuleCard 
                title="Welcome & Leave" path={`/dashboard/${guildId}/welcome`} icon={UserPlus} accent="var(--color-brand-indigo)"
                active={true} statusText="Configured"
              />
              <ModuleCard 
                title="Auto-Roles" path={`/dashboard/${guildId}/autorole`} icon={Award} accent="var(--color-brand-indigo)"
                active={true} statusText="Active"
              />
              <ModuleCard 
                title="Supporter Perks" path={`/dashboard/${guildId}/supporter`} icon={Trophy} accent="var(--color-brand-indigo)"
                active={true} statusText="Configured"
              />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold text-slate-400 tracking-wider mb-4 flex items-center gap-2.5 uppercase font-sans">
              <span className="font-mono text-xs text-indigo-400 font-semibold">03 /</span> Engagement & Content
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ModuleCard 
                title="Message Studio" path={`/dashboard/${guildId}/message-studio`} icon={PenTool} accent="var(--color-brand-indigo)"
                active={true} statusText="Ready"
              />
              <ModuleCard 
                title="Autoresponder" path={`/dashboard/${guildId}/autoresponder`} icon={Bot} accent="var(--color-brand-indigo)"
                active={modules.autoresponder.length > 0} statusText={modules.autoresponder.length > 0 ? `${modules.autoresponder.length} Rules` : "Disabled"}
              />
              <ModuleCard 
                title="Sticky Messages" path={`/dashboard/${guildId}/sticky`} icon={Pin} accent="var(--color-brand-indigo)"
                active={modules.sticky.length > 0} statusText={modules.sticky.length > 0 ? `${modules.sticky.length} Pins` : "Disabled"}
              />
              <ModuleCard 
                title="Media-Only" path={`/dashboard/${guildId}/media-only`} icon={ImageIcon} accent="var(--color-brand-indigo)"
                active={modules.media.length > 0} statusText={modules.media.length > 0 ? `${modules.media.length} Channels` : "Disabled"}
              />
            </div>
          </section>

          <section>
            <h2 className="text-xs font-bold text-slate-400 tracking-wider mb-4 flex items-center gap-2.5 uppercase font-sans">
              <span className="font-mono text-xs text-indigo-400 font-semibold">04 /</span> System & Controls
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ModuleCard 
                title="Command Permissions" path={`/dashboard/${guildId}/commands`} icon={Terminal} accent="var(--color-brand-indigo)"
                active={true} statusText="Configured"
              />
              <ModuleCard 
                title="Bot Settings" path={`/dashboard/${guildId}/config`} icon={Sliders} accent="var(--color-brand-indigo)"
                active={true} statusText="Configured"
              />
            </div>
          </section>
        </div>

        {/* Right Column: Health & Info */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h2 className="text-xs font-bold text-slate-400 tracking-wider mb-5 flex items-center gap-2 uppercase font-sans">
              System Health
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-slate-300 text-sm font-medium flex items-center gap-2.5"><Server className="w-4 h-4 text-indigo-400"/> Digital Vigital</span>
                <StatusIndicator active={true} text="Online" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Gateway Ping</span>
                <span className="text-emerald-400 font-mono text-sm font-semibold">{botInfo?.ping || 0}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Database</span>
                <span className="text-emerald-400 font-mono text-sm font-semibold">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Version</span>
                <span className="text-slate-300 font-mono text-sm">v2.5.0</span>
              </div>
            </div>
          </div>

          {guild && (
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <h2 className="text-xs font-bold text-slate-400 tracking-wider mb-5 flex items-center gap-2 uppercase font-sans">
                Server Info
              </h2>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Server ID</span>
                  <span className="text-slate-300 select-all">{guild.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Created</span>
                  <span className="text-slate-300">{new Date(guild.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Members</span>
                  <span className="text-slate-300">{guild.memberCount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Humans</span>
                  <span className="text-slate-300">{guild.humanCount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bots</span>
                  <span className="text-slate-300">{guild.botCount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Channels</span>
                  <span className="text-slate-300">{meta.channels?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Boosts</span>
                  <span className="text-brand-crimson">{guild.premiumSubscriptionCount || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
