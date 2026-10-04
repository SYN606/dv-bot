import React, { useEffect, useState } from "react";
import { useParams, Link, useOutletContext } from "react-router-dom";
import {
  ShieldCheck, Pin, Image as ImageIcon,
  Bot, Terminal, Shield, ShieldAlert, Sliders,
  Users, Hash, Server, Activity, ArrowRight, CheckCircle2, XCircle
} from "lucide-react";
import {
  getGuildMeta, getVerification, getMediaOnly,
  getSticky, getAutoresponders, getAdminRoles
} from "../../api/client";
import SuperuserBadge from "../../components/ui/SuperuserBadge";

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
      getSticky(guildId).catch(() => []),
      getAutoresponders(guildId).catch(() => []),
      getAdminRoles(guildId).catch(() => [])
    ]).then(([metaData, verData, medData, stiData, autData, admData]) => {
      if (isMounted) {
        setMeta(metaData);
        setModules({
          verification: verData?.enabled ? verData : null,
          media: Array.isArray(medData) ? medData : [],
          sticky: Array.isArray(stiData) ? stiData : [],
          autoresponder: Array.isArray(autData) ? autData : [],
          adminRoles: Array.isArray(admData) ? admData : []
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
          <div className="w-10 h-10 border-4 border-slate-700 border-t-brand-crimson rounded-full animate-spin"></div>
          <p className="text-slate-400 font-mono text-sm tracking-widest">LOADING COMMAND CENTER...</p>
        </div>
      </div>
    );
  }

  const { guild } = meta || {};

  const StatusIndicator = ({ active, text }) => (
    <div className={`flex items-center gap-1.5 text-[10px] font-mono tracking-widest uppercase ${active ? 'text-brand-green' : 'text-slate-500'}`}>
      {active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
      {text || (active ? "Active" : "Disabled")}
    </div>
  );

  const ModuleCard = ({ title, path, icon: Icon, active, statusText, accent }) => (
    <Link to={path} className={`glass-card p-5 rounded-2xl group flex flex-col justify-between min-h-35 hover:border-[${accent}] transition-colors`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-300 group-hover:text-white transition-colors`}>
          <Icon className="w-5 h-5" />
        </div>
        <StatusIndicator active={active} text={statusText} />
      </div>
      <div>
        <h3 className="font-semibold text-slate-200 group-hover:text-white transition-colors font-sans">{title}</h3>
        <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          CONFIGURE <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </Link>
  );

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 font-body">
      
      {/* Hero Section */}
      <div className="relative overflow-hidden glass-panel p-8 sm:p-10 rounded-3xl border border-white/10 shrink-0 bg-slate-900/60">
        <div className="absolute -bottom-10 -right-4 text-9xl font-display text-brand-crimson opacity-[0.03] select-none pointer-events-none leading-none">नियंत्रण</div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded bg-brand-crimson flex items-center justify-center font-bold text-white text-[10px] font-mono shadow-lg">DV</div>
              <span className="text-xs font-mono text-slate-400 tracking-widest uppercase">Command Center</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h1 className="text-4xl sm:text-5xl font-display font-bold text-white tracking-tight">नमस्ते, {user?.username}.</h1>
              {user?.isSuperuser && <SuperuserBadge size="md" />}
            </div>
            <p className="text-slate-400 text-lg">Your community command center for <span className="text-slate-200 font-semibold">{currentGuild?.name}</span>.</p>
          </div>
          
          {/* Server Badge */}
          {guild && (
            <div className="glass-card p-4 rounded-2xl flex items-center gap-4 shrink-0 shadow-2xl bg-black/40 backdrop-blur-xl border border-white/5">
              <div className="w-14 h-14 rounded-full border-2 border-white/10 p-0.5 overflow-hidden bg-slate-900">
                {guild.icon ? (
                  <img src={guild.icon} alt={guild.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">{guild.name.slice(0,2).toUpperCase()}</div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-white leading-tight mb-1">{guild.name}</h3>
                <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-brand-crimson" /> {guild.memberCount.toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Hash className="w-3.5 h-3.5 text-slate-500" /> {meta.channels?.length || 0}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Modules */}
        <div className="lg:col-span-2 space-y-10">
          
          <section>
            <h2 className="text-sm font-display text-brand-crimson tracking-wider mb-5 flex items-center gap-3">
              <span className="font-mono text-xs opacity-50">01 /</span> समुदाय <span className="text-slate-500 font-sans font-normal text-[10px] uppercase tracking-widest">Community</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <ModuleCard 
                title="Verification Gate" path={`/dashboard/${guildId}/verification`} icon={ShieldCheck} accent="var(--color-brand-crimson)"
                active={!!modules.verification} statusText={modules.verification ? "Active" : "Disabled"}
              />
              <ModuleCard 
                title="Sticky Messages" path={`/dashboard/${guildId}/sticky`} icon={Pin} accent="var(--color-brand-crimson)"
                active={modules.sticky.length > 0} statusText={modules.sticky.length > 0 ? `${modules.sticky.length} Pins` : "Disabled"}
              />
              <ModuleCard 
                title="Media-Only Channels" path={`/dashboard/${guildId}/media-only`} icon={ImageIcon} accent="var(--color-brand-crimson)"
                active={modules.media.length > 0} statusText={modules.media.length > 0 ? `${modules.media.length} Channels` : "Disabled"}
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-display text-brand-crimson tracking-wider mb-5 flex items-center gap-3">
              <span className="font-mono text-xs opacity-50">02 /</span> स्वचालन <span className="text-slate-500 font-sans font-normal text-[10px] uppercase tracking-widest">Automation</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <ModuleCard 
                title="Autoresponder" path={`/dashboard/${guildId}/autoresponder`} icon={Bot} accent="var(--color-brand-crimson)"
                active={modules.autoresponder.length > 0} statusText={modules.autoresponder.length > 0 ? `${modules.autoresponder.length} Rules` : "Disabled"}
              />
              <ModuleCard 
                title="Command Restrictions" path={`/dashboard/${guildId}/commands`} icon={Terminal} accent="var(--color-brand-crimson)"
                active={true} statusText="Configured"
              />
            </div>
          </section>

          <section>
            <h2 className="text-sm font-display text-brand-crimson tracking-wider mb-5 flex items-center gap-3">
              <span className="font-mono text-xs opacity-50">03 /</span> सुरक्षा <span className="text-slate-500 font-sans font-normal text-[10px] uppercase tracking-widest">Moderation</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <ModuleCard 
                title="Admin Roles" path={`/dashboard/${guildId}/admin-roles`} icon={Shield} accent="var(--color-brand-crimson)"
                active={modules.adminRoles.length > 0} statusText={modules.adminRoles.length > 0 ? `${modules.adminRoles.length} Roles` : "Disabled"}
              />
              <ModuleCard 
                title="Permissions Audit" path={`/dashboard/${guildId}/permissions`} icon={ShieldAlert} accent="var(--color-brand-crimson)"
                active={true} statusText="Monitoring"
              />
            </div>
          </section>
        </div>

        {/* Right Column: Health & Info */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/5">
            <h2 className="text-sm font-display text-slate-300 font-semibold tracking-wider mb-5 flex items-center gap-2">
              प्रणाली <span className="text-slate-500 font-sans font-normal text-[10px] uppercase tracking-widest">System Health</span>
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-slate-400 text-sm flex items-center gap-2"><Server className="w-4 h-4 text-slate-500"/> Digital Vigital</span>
                <StatusIndicator active={true} text="Online" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Gateway Ping</span>
                <span className="text-brand-crimson font-mono text-sm">{botInfo?.ping || 0}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Database</span>
                <span className="text-brand-green font-mono text-sm">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Version</span>
                <span className="text-slate-300 font-mono text-sm">v2.5.0</span>
              </div>
            </div>
          </div>

          {guild && (
            <div className="glass-panel p-6 rounded-2xl border border-white/5">
              <h2 className="text-sm font-display text-slate-300 tracking-wider mb-5 flex items-center gap-2">
                जानकारी <span className="text-slate-500 font-sans font-normal text-[10px] uppercase tracking-widest">Server Info</span>
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
