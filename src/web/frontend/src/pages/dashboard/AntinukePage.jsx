import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useAntinuke } from "../../hooks/useAntinuke";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { PageError, PageSkeleton } from "../../components/ui";
import RoleSelector from "../../components/discord/RoleSelector";
import ChannelSelector from "../../components/discord/ChannelSelector";
import UserSelector from "../../components/discord/UserSelector";
import Switch from "../../components/ui/Switch";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Badge from "../../components/ui/Badge";
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
  Sliders,
  Users,
  History,
  RotateCcw,
  Bot,
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  Zap,
} from "lucide-react";

const formatThreatLabel = (threat) => {
  switch (threat) {
    case "ROGUE_BOT_ADD":
      return "Unauthorized Bot Added";
    case "CHANNEL_DELETE_NUKE":
      return "Mass Channel Deletion";
    case "CHANNEL_CREATE_NUKE":
      return "Mass Channel Creation";
    case "ROLE_DELETE_NUKE":
      return "Mass Role Deletion";
    case "ROLE_CREATE_NUKE":
      return "Mass Role Creation";
    case "MEMBER_BAN_NUKE":
      return "Mass Member Ban";
    case "MEMBER_KICK_NUKE":
      return "Mass Member Kick";
    case "WEBHOOK_NUKE":
      return "Mass Webhook Spam";
    case "DANGEROUS_PERMS_ESCALATION":
      return "Dangerous Permission Grant";
    case "SERVER_TAMPER":
    case "VANITY_CHANGE":
      return "Server Identity Modification";
    default:
      return String(threat || "Security Alert")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

const formatPunishmentLabel = (punishment, threatType) => {
  const p = String(punishment || "").toLowerCase();
  const isBot = threatType === "ROGUE_BOT_ADD";
  if (p === "banned") return isBot ? "Bot & Member Banned" : "Banned from Server";
  if (p === "kicked") return isBot ? "Bot Banned & Member Kicked" : "Kicked from Server";
  if (p === "quarantined") return isBot ? "Bot Banned & Member Quarantined" : "Quarantined (Roles Revoked)";
  if (p === "roles_stripped") return isBot ? "Bot Banned & Admin Roles Revoked" : "Admin Roles Revoked";
  if (p === "server_owner") return "Server Owner (Exempt)";
  if (p === "role_above_bot") return isBot ? "Bot Banned (Staff Above Bot)" : "Staff Role Above Bot";
  if (p === "bot_banned" || isBot) return "Bot Banned & Removed";
  if (p === "none") return "Action Blocked & Logged";
  return punishment || "Logged";
};

export default function AntinukePage({ showToast }) {
  const { guildId } = useParams();
  const [activeTab, setActiveTab] = useState("controls"); // "controls", "enforcements", "trustees", "incidents"
  const [lockdownConfirmOpen, setLockdownConfirmOpen] = useState(false);
  const [addTrusteeOpen, setAddTrusteeOpen] = useState(false);

  // New Trusted Entry Form State
  const [newTrustee, setNewTrustee] = useState({
    target_id: "",
    target_type: "user",
    trust_tier: 2,
    bypass_channels: true,
    bypass_roles: true,
    bypass_members: true,
    bypass_bots: false,
    bypass_webhooks: false,
  });

  const {
    data,
    settings,
    hasChanges,
    loading,
    actionLoading,
    error,
    updateLocal,
    save,
    reset,
    toggleLockdown,
    toggleMasterEnabled,
    addTrustee,
    removeTrustee,
    rollbackIncident,
    refresh,
  } = useAntinuke(guildId, showToast);

  useUnsavedChanges({
    isDirty: hasChanges,
    onSave: save,
    onReset: reset,
    pageTitle: "Server Security & Protection",
  });

  const isAccessDenied = error && (
    String(error).includes("Access denied") ||
    String(error).includes("ANTINUKE_ACCESS_RESTRICTED") ||
    String(error).includes("403")
  );

  if (isAccessDenied) {
    return (
      <div className="w-full max-w-2xl mx-auto py-16 px-4 text-center animate-in fade-in duration-300">
        <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-rose-500/20 bg-slate-900/60 shadow-2xl relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-rose-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mb-3">
            Anti-Nuke Access Restricted
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto mb-6">
            Anti-Nuke protection settings and logs are strictly confidential. Only the <strong className="text-white">Server Owner</strong>, bot <strong className="text-white">Superusers</strong>, or whitelisted <strong className="text-white">Anti-Nuke Trustees</strong> are authorized to view or configure this module.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => window.location.href = `/dashboard/${guildId}`}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-all border border-white/10"
            >
              Return to Server Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <PageError
        title="Unable to load Security Settings"
        description="Could not connect to the bot gateway to load your server protection settings."
        onRetry={refresh}
      />
    );
  }

  if (loading || !settings) {
    return <PageSkeleton cards={2} rows={2} />;
  }

  const isEnabled = Boolean(settings.enabled);
  const isLockdown = Boolean(data.lockdownActive || settings.emergency_lockdown_active);
  const topology = data.topologyStats || {};

  const handleLockdownToggle = async () => {
    const action = isLockdown ? "lift" : "engage";
    await toggleLockdown(action, "Triggered via Web Dashboard Security Panel");
    setLockdownConfirmOpen(false);
  };

  const openAddBotModal = () => {
    setNewTrustee({
      target_id: "",
      target_type: "bot",
      trust_tier: 2,
      bypass_channels: true,
      bypass_roles: false,
      bypass_members: false,
      bypass_bots: false,
      bypass_webhooks: false,
    });
    setAddTrusteeOpen(true);
  };

  const openAddStaffModal = () => {
    setNewTrustee({
      target_id: "",
      target_type: "user",
      trust_tier: 2,
      bypass_channels: true,
      bypass_roles: true,
      bypass_members: true,
      bypass_bots: false,
      bypass_webhooks: false,
    });
    setAddTrusteeOpen(true);
  };

  const handleCreateTrustee = async (e) => {
    e.preventDefault();
    if (!newTrustee.target_id) {
      if (showToast) showToast(newTrustee.target_type === "bot" ? "Please select or enter a bot ID" : "Please select a member or role to trust", "error");
      return;
    }
    const success = await addTrustee(newTrustee);
    if (success) {
      setAddTrusteeOpen(false);
      setNewTrustee({
        target_id: "",
        target_type: "user",
        trust_tier: 2,
        bypass_channels: true,
        bypass_roles: true,
        bypass_members: true,
        bypass_bots: false,
        bypass_webhooks: false,
      });
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300 pb-32">
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 1. Header Banner & Current Status */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 glass-panel p-6 sm:p-7 rounded-2xl border border-white/10 bg-slate-900/50 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
              isLockdown
                ? "bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse shadow-lg shadow-rose-500/30"
                : isEnabled
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/20"
                : "bg-slate-800/80 border-white/10 text-slate-400"
            }`}
          >
            {isLockdown ? <AlertTriangle className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Server Protection & Anti-Nuke
              </h1>
              <Badge
                variant={isLockdown ? "danger" : isEnabled ? "success" : "neutral"}
                size="md"
                dot={true}
              >
                {isLockdown
                  ? "Emergency Lockdown Active"
                  : isEnabled
                  ? "Protection Active"
                  : "Protection Disabled"}
              </Badge>
            </div>
            <p className="text-sm text-slate-300 mt-1.5 max-w-2xl leading-relaxed">
              Safeguards your server from unauthorized mass deletions, dangerous administrator permission changes, and rogue bot invites with instant automatic recovery.
            </p>
          </div>
        </div>

        {/* Right Controls: Master Switch & Live Backup Stats */}
        <div className="flex items-center gap-3 shrink-0 self-start md:self-auto flex-wrap">
          {/* Central Module Master Switch */}
          <div className="flex items-center gap-4 px-4 py-2.5 rounded-2xl bg-slate-950/80 border border-white/10 shrink-0 shadow-lg shadow-black/20">
            <div>
              <div className="text-sm font-bold text-white leading-tight">
                {isEnabled ? "Module Active" : "Module Disabled"}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">Master Switch</div>
            </div>
            <Switch
              checked={isEnabled}
              onChange={toggleMasterEnabled}
              disabled={actionLoading}
            />
          </div>

          <div className="px-4 py-2.5 rounded-xl bg-slate-950/70 border border-white/10 flex items-center gap-3">
            <Layers className="w-5 h-5 text-indigo-400" />
            <div>
              <div className="text-xs text-slate-400 font-medium">Protected Assets</div>
              <div className="text-sm font-semibold text-white">
                {topology.channelsCount ?? 0} Channels • {topology.rolesCount ?? 0} Roles
              </div>
            </div>
          </div>
          <button
            onClick={() => refresh()}
            className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition-all shadow-sm"
            title="Refresh State"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Module Disabled Alert Banner */}
      {!isEnabled && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-amber-950/20 animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="w-6 h-6 shrink-0 text-amber-400 mt-0.5 sm:mt-0" />
            <div>
              <div className="text-sm font-bold text-amber-300">
                Server Protection (Anti-Nuke) is Currently Disabled
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                Autonomous threat mitigation is paused and all <code>/antinuke</code> slash commands are deactivated server-wide. You can re-activate defense systems anytime using the master switch above.
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleMasterEnabled(true)}
            disabled={actionLoading}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shrink-0 transition-colors shadow-md"
          >
            Enable Module Now
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 2. Emergency Server Lockdown Alert Box */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div
        className={`p-6 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-xl ${
          isLockdown
            ? "bg-rose-950/40 border-rose-500/40 shadow-rose-500/10"
            : "bg-slate-900/60 border-white/10 hover:border-white/20"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${
              isLockdown
                ? "bg-rose-600 text-white border-rose-400 animate-pulse"
                : "bg-rose-500/10 text-rose-400 border-rose-500/20"
            }`}
          >
            {isLockdown ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              <span>Emergency Server Lockdown</span>
              {isLockdown && <Badge variant="danger" size="sm">Active</Badge>}
            </div>
            <p className="text-sm text-slate-300 mt-1 leading-relaxed max-w-2xl">
              {isLockdown
                ? "All channels are currently locked. Regular members cannot send messages, create threads, or join voice channels."
                : "Immediately restricts public permissions across all channels in under a second if an active attack or raid occurs."}
            </p>
          </div>
        </div>

        <button
          onClick={() => setLockdownConfirmOpen(true)}
          disabled={actionLoading}
          className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shrink-0 flex items-center gap-2 ${
            isLockdown
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
              : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30"
          }`}
        >
          {isLockdown ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          <span>{isLockdown ? "Lift Server Lockdown" : "Enable Emergency Lockdown"}</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 3. Navigation Tabs */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("controls")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
            activeTab === "controls"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Protection Limits</span>
        </button>
        <button
          onClick={() => setActiveTab("enforcements")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
            activeTab === "enforcements"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Advanced Protections</span>
        </button>
        <button
          onClick={() => setActiveTab("trustees")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
            activeTab === "trustees"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Trusted List ({data.trustees?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab("incidents")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shrink-0 ${
            activeTab === "incidents"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Protection Logs ({data.incidents?.length || 0})</span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 4. Tab 1: Protection Limits & Core Settings */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "controls" && (
        <div className="space-y-6">
          {/* Top Config Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Master Toggle & Punishment Mode */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-900/40 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-base font-bold text-white">Enable Protection</div>
                  <div className="text-sm text-slate-300 mt-1">Activate real-time server monitors</div>
                </div>
                <Switch
                  checked={isEnabled}
                  onChange={toggleMasterEnabled}
                  disabled={actionLoading}
                  color="emerald"
                />
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <label className="text-sm font-semibold text-slate-200 block">Action Taken on Violation</label>
                <select
                  value={settings.punishment_type || "quarantine"}
                  onChange={(e) => updateLocal({ punishment_type: e.target.value })}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="quarantine">Quarantine (Strip dangerous roles) — Recommended</option>
                  <option value="ban">Ban User from Server</option>
                  <option value="kick">Kick User from Server</option>
                  <option value="strip_roles">Remove Admin Roles Only</option>
                </select>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Quarantine immediately revokes dangerous admin permissions from the user before damage can spread.
                </p>
              </div>
            </div>

            {/* Quarantine Role & Alert Channel Selectors */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-900/40 space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-200 block mb-2">Quarantine Role</label>
                <RoleSelector
                  guildId={guildId}
                  roles={data.roles || []}
                  value={settings.quarantine_role_id || ""}
                  onChange={(roleId) => updateLocal({ quarantine_role_id: roleId || null })}
                  placeholder="Select a quarantine role..."
                  specialOptions={[{ value: "", label: "None (Just remove existing roles)" }]}
                />
                <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                  Optional role assigned to quarantined users to restrict access while you investigate.
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-200 block mb-2">Security Alert Channel</label>
                <ChannelSelector
                  guildId={guildId}
                  channels={data.channels || []}
                  value={settings.log_channel_id || ""}
                  onChange={(channelId) => updateLocal({ log_channel_id: channelId || null })}
                  placeholder="Select a log channel..."
                  specialOptions={[{ value: "", label: "Disabled / None" }]}
                />
                <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">
                  Security notifications and restore details will be sent here and direct messaged to the server owner.
                </p>
              </div>
            </div>

            {/* Auto-Restore & Time Window */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-900/40 space-y-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-base font-bold text-white">Auto-Restore Assets</div>
                  <div className="text-sm text-slate-300 mt-1">Recreate deleted channels & roles</div>
                </div>
                <Switch
                  checked={Boolean(settings.auto_recreate_assets)}
                  onChange={(checked) => updateLocal({ auto_recreate_assets: checked ? 1 : 0 })}
                  color="indigo"
                />
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">Safety Check Interval</span>
                  <span className="text-sm font-mono font-bold text-indigo-400">{settings.window_seconds || 10} seconds</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="60"
                  step="5"
                  value={settings.window_seconds || 10}
                  onChange={(e) => updateLocal({ window_seconds: Number(e.target.value) })}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <p className="text-sm text-slate-300 leading-relaxed">
                  The time window within which actions are counted. Lower intervals offer tighter protection.
                </p>
              </div>
            </div>
          </div>

          {/* Safety Limit Sliders */}
          <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-white/10 bg-slate-900/40 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" />
                <span>Action Limits (Maximum allowed per {settings.window_seconds || 10} seconds)</span>
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                If an administrator performs more than this number of actions within the interval, protection triggers automatically.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Channel Delete */}
              <div className="bg-slate-950/70 p-5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">Channel Deletions</span>
                  <span className="text-sm font-mono font-bold text-rose-400">Max {settings.channel_delete_threshold}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.channel_delete_threshold || 3}
                  onChange={(e) => updateLocal({ channel_delete_threshold: Number(e.target.value) })}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <p className="text-sm text-slate-300">Protects against mass deletion of voice and text channels.</p>
              </div>

              {/* Channel Create */}
              <div className="bg-slate-950/70 p-5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">Channel Creation Spam</span>
                  <span className="text-sm font-mono font-bold text-amber-400">Max {settings.channel_create_threshold}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={settings.channel_create_threshold || 4}
                  onChange={(e) => updateLocal({ channel_create_threshold: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className="text-sm text-slate-300">Prevents users from spamming new channels.</p>
              </div>

              {/* Role Delete */}
              <div className="bg-slate-950/70 p-5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">Role Deletions</span>
                  <span className="text-sm font-mono font-bold text-rose-400">Max {settings.role_delete_threshold}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.role_delete_threshold || 3}
                  onChange={(e) => updateLocal({ role_delete_threshold: Number(e.target.value) })}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <p className="text-sm text-slate-300">Stops rogue staff from deleting important server roles.</p>
              </div>

              {/* Role Create */}
              <div className="bg-slate-950/70 p-5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">Role Creation Spam</span>
                  <span className="text-sm font-mono font-bold text-amber-400">Max {settings.role_create_threshold}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={settings.role_create_threshold || 4}
                  onChange={(e) => updateLocal({ role_create_threshold: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className="text-sm text-slate-300">Prevents spam generation of empty roles.</p>
              </div>

              {/* Member Bans */}
              <div className="bg-slate-950/70 p-5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">Member Bans</span>
                  <span className="text-sm font-mono font-bold text-rose-400">Max {settings.member_ban_threshold}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.member_ban_threshold || 3}
                  onChange={(e) => updateLocal({ member_ban_threshold: Number(e.target.value) })}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <p className="text-sm text-slate-300">Halts mass ban sprees and automatically unbans victims.</p>
              </div>

              {/* Member Kicks */}
              <div className="bg-slate-950/70 p-5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">Member Kicks</span>
                  <span className="text-sm font-mono font-bold text-rose-400">Max {settings.member_kick_threshold}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.member_kick_threshold || 3}
                  onChange={(e) => updateLocal({ member_kick_threshold: Number(e.target.value) })}
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <p className="text-sm text-slate-300">Stops mass kick raids against regular members.</p>
              </div>

              {/* Webhook Creations */}
              <div className="bg-slate-950/70 p-5 rounded-xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-200">Webhook Creations</span>
                  <span className="text-sm font-mono font-bold text-amber-400">Max {settings.webhook_create_threshold}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={settings.webhook_create_threshold || 2}
                  onChange={(e) => updateLocal({ webhook_create_threshold: Number(e.target.value) })}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className="text-sm text-slate-300">Stops unauthorized webhooks created to bypass chat filters.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 5. Tab 2: Advanced Protections */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "enforcements" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Unauthorized Bot Protection */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-900/40 space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Unauthorized Bot Protection</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Immediately bans unauthorized bots added to the server without prior approval, and removes permissions from the admin who invited them.
              </p>
            </div>
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">Active</span>
              <Switch
                checked={Boolean(settings.strict_anti_bot)}
                onChange={(checked) => updateLocal({ strict_anti_bot: checked ? 1 : 0 })}
                color="purple"
              />
            </div>
          </div>

          {/* Admin Permission Guard */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-900/40 space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Administrator Permission Guard</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Reverts any unauthorized grant of Administrator, Manage Server, or Mention Everyone roles (especially on @everyone) and isolates the user.
              </p>
            </div>
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">Active</span>
              <Switch
                checked={Boolean(settings.strict_dangerous_perms)}
                onChange={(checked) => updateLocal({ strict_dangerous_perms: checked ? 1 : 0 })}
                color="indigo"
              />
            </div>
          </div>

          {/* Server Name & Identity Protection */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-slate-900/40 space-y-5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Server Name & Vanity Protection</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Prevents unauthorized changes to your server's name, vanity URL invite, or server icon, reverting them automatically.
              </p>
            </div>
            <div className="pt-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">Active</span>
              <Switch
                checked={Boolean(settings.strict_vanity_protect)}
                onChange={(checked) => updateLocal({ strict_vanity_protect: checked ? 1 : 0 })}
                color="cyan"
              />
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 6. Tab 3: Trusted List (Whitelist) */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "trustees" && (() => {
        const staffTrustees = data.trustees?.filter((t) => t.target_type !== "bot") || [];
        const botTrustees = data.trustees?.filter((t) => t.target_type === "bot") || [];

        return (
          <div className="space-y-8">
            {/* 1. Whitelisted Bots (Join-to-Create / Temp Voice Integrations) */}
            <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-purple-500/20 bg-slate-900/50 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
                      <Bot className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Whitelisted Bots & Join-to-Create Integrations</h3>
                  </div>
                  <p className="text-sm text-slate-300">
                    Temporary voice channel and Join-to-Create bots (e.g. VoiceMaster, TempVoice, AutoRooms) automatically delete empty channels. Whitelist them here to grant channel deletion immunity so they are never flagged as nukers.
                  </p>
                </div>
                <button
                  onClick={openAddBotModal}
                  className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-md shadow-purple-600/30 shrink-0 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Whitelist Bot (Join-to-Create)</span>
                </button>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-950/60 overflow-hidden">
                {botTrustees.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {botTrustees.map((t) => {
                      const botInfo = data.bots?.find((b) => b.id === t.target_id);
                      return (
                        <div key={t.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-4">
                            {botInfo?.avatar ? (
                              <img src={botInfo.avatar} alt={botInfo.name} className="w-11 h-11 rounded-xl border border-white/10 object-cover" />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0">
                                <Bot className="w-6 h-6" />
                              </div>
                            )}
                            <div>
                              <div className="text-base font-bold text-white flex items-center gap-2.5 flex-wrap">
                                <span>{botInfo ? botInfo.displayName || botInfo.name : t.target_id}</span>
                                <Badge variant="purple" size="sm">Bot Whitelisted</Badge>
                                <Badge variant="success" size="sm">Channel Deletion Immunity</Badge>
                              </div>
                              <div className="text-xs sm:text-sm text-slate-400 font-mono mt-1">
                                Bot ID: {t.target_id}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => removeTrustee(t.id)}
                            disabled={actionLoading}
                            className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                            title="Remove Bot Whitelist"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-10 text-center text-slate-400 text-sm">
                    No utility or Join-to-Create bots whitelisted yet. If you have bots that dynamically delete temporary voice channels, click <strong className="text-purple-400">"Whitelist Bot (Join-to-Create)"</strong> to prevent accidental anti-nuke triggers.
                  </div>
                )}
              </div>
            </div>

            {/* 2. Trusted Staff & Security Trustees */}
            <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-white/10 bg-slate-900/50 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Trusted Staff & Security Trustees</h3>
                  </div>
                  <p className="text-sm text-slate-300">
                    Senior staff members and administrative roles added here are exempt from security velocity limits based on their assigned tier.
                  </p>
                </div>
                <button
                  onClick={openAddStaffModal}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-md shadow-indigo-600/30 shrink-0 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Trusted Staff / Role</span>
                </button>
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-950/60 overflow-hidden">
                {staffTrustees.length > 0 ? (
                  <div className="divide-y divide-white/5">
                    {staffTrustees.map((t) => {
                      const role = t.target_type === "role" ? data.roles?.find((r) => r.id === t.target_id) : null;
                      const member = t.target_type === "user" ? data.members?.find((m) => m.id === t.target_id) : null;

                      return (
                        <div key={t.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center font-bold text-sm text-white shrink-0">
                              {t.target_type === "role" ? "@" : "U"}
                            </div>
                            <div>
                              <div className="text-base font-bold text-white flex items-center gap-2.5 flex-wrap">
                                <span>{role ? `@${role.name}` : member ? member.displayName : t.target_id}</span>
                                <Badge
                                  variant={t.trust_tier === 1 ? "warning" : t.trust_tier === 2 ? "brand" : "neutral"}
                                  size="sm"
                                >
                                  Tier {t.trust_tier}: {t.trust_tier === 1 ? "Full Bypass" : t.trust_tier === 2 ? "Senior Admin" : "Moderator"}
                                </Badge>
                              </div>
                              <div className="text-sm text-slate-300 mt-1.5 flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-300">Allowed Actions:</span>
                                {t.trust_tier === 1 ? (
                                  <span className="text-emerald-400 font-medium">Full Bypass (All Actions Permitted)</span>
                                ) : (
                                  <>
                                    {t.bypass_channels && <Badge variant="neutral" size="xs">Channels</Badge>}
                                    {t.bypass_roles && <Badge variant="neutral" size="xs">Roles</Badge>}
                                    {t.bypass_members && <Badge variant="neutral" size="xs">Members</Badge>}
                                    {t.bypass_bots && <Badge variant="purple" size="xs">Bots</Badge>}
                                    {t.bypass_webhooks && <Badge variant="cyan" size="xs">Webhooks</Badge>}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => removeTrustee(t.id)}
                            disabled={actionLoading}
                            className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                            title="Remove from Trusted List"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-10 text-center text-slate-400 text-sm">
                    No custom trusted staff or roles registered yet. The Server Owner holds default full protection immunity.
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 7. Tab 4: Protection Logs & 1-Click Restore */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {activeTab === "incidents" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Security Activity History</h3>
            <p className="text-sm text-slate-400 mt-0.5">
              History of blocked actions, prevented mass changes, and quick one-click restoration of deleted channels and roles.
            </p>
          </div>

          <div className="glass-panel rounded-2xl border border-white/10 bg-slate-900/40 overflow-hidden">
            {data.incidents && data.incidents.length > 0 ? (
              <div className="divide-y divide-white/5">
                {data.incidents.map((inc) => {
                  const parsedSnapshot =
                    inc.snapshot_data && typeof inc.snapshot_data === "object"
                      ? inc.snapshot_data
                      : typeof inc.snapshot_data === "string"
                      ? (() => {
                          try {
                            return JSON.parse(inc.snapshot_data);
                          } catch {
                            return null;
                          }
                        })()
                      : null;

                  const details = parsedSnapshot?.details;
                  const isRecoverableAsset = Boolean(
                    inc.threat_type === "CHANNEL_DELETE_NUKE" ||
                    inc.threat_type === "ROLE_DELETE_NUKE" ||
                    (parsedSnapshot && (parsedSnapshot.permissionOverwrites !== undefined || parsedSnapshot.color !== undefined))
                  );

                  return (
                    <div key={inc.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-base font-bold text-white">{formatThreatLabel(inc.threat_type)}</span>
                            <Badge variant="danger" size="sm">{formatPunishmentLabel(inc.punishment_applied, inc.threat_type)}</Badge>
                            {isRecoverableAsset ? (
                              inc.resolved ? (
                                <Badge variant="success" size="sm" icon={CheckCircle2}>Restored</Badge>
                              ) : (
                                <Badge variant="warning" size="sm">Open</Badge>
                              )
                            ) : (
                              <Badge variant="success" size="sm" icon={CheckCircle2}>Neutralized</Badge>
                            )}
                          </div>
                          {details && (
                            <div className="text-xs sm:text-sm text-slate-300 mt-1.5 font-medium bg-slate-950/60 px-3 py-1 rounded-lg border border-white/5 inline-block">
                              {details}
                            </div>
                          )}
                          <div className="text-sm text-slate-400 mt-1.5 flex items-center gap-2 flex-wrap">
                            <span>Responsible ID: <span className="font-mono text-slate-200 font-medium">{inc.executor_id}</span></span>
                            <span>•</span>
                            <span>Actions: <span className="font-mono text-slate-200 font-medium">{inc.actions_count}</span></span>
                            <span>•</span>
                            <span>{new Date(inc.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {isRecoverableAsset && (
                        <button
                          onClick={() => rollbackIncident(inc.id)}
                          disabled={actionLoading || inc.resolved}
                          className={`px-4 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all shrink-0 ${
                            inc.resolved
                              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5"
                              : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30"
                          }`}
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>{inc.resolved ? "Restored" : "Restore Deleted Asset"}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-sm">
                No security incidents recorded. Your server is completely safe.
              </div>
            )}
          </div>
        </div>
      )}



      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 9. Centralized ConfirmDialog: Emergency Server Lockdown */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={lockdownConfirmOpen}
        onClose={() => setLockdownConfirmOpen(false)}
        onConfirm={handleLockdownToggle}
        title={isLockdown ? "Lift Server Lockdown?" : "Enable Emergency Server Lockdown?"}
        description={
          isLockdown
            ? "This will restore standard messaging and connect permissions for @everyone across all public channels."
            : "This will immediately revoke @everyone permissions to send messages, create threads, and connect to voice channels across all public spaces."
        }
        confirmText={isLockdown ? "Lift Lockdown" : "Enable Lockdown Now"}
        cancelText="Cancel"
        danger={!isLockdown}
        isPending={actionLoading}
      />

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 10. Modal: Add Trusted Entry using Centralized Selectors */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {addTrusteeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg glass-panel p-6 sm:p-7 rounded-2xl border border-white/10 bg-slate-900 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {newTrustee.target_type === "bot" ? (
                  <Bot className="w-5 h-5 text-purple-400" />
                ) : (
                  <Users className="w-5 h-5 text-indigo-400" />
                )}
                <span>{newTrustee.target_type === "bot" ? "Whitelist Bot (Join-to-Create)" : "Add Trusted Role or Member"}</span>
              </h3>
              <button
                onClick={() => setAddTrusteeOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTrustee} className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-slate-200 block mb-2">Entry Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTrustee((p) => ({ ...p, target_type: "user", target_id: "" }))}
                    className={`py-2.5 px-2 text-center rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                      newTrustee.target_type === "user"
                        ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30"
                        : "bg-slate-950 border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    Staff Member
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTrustee((p) => ({ ...p, target_type: "role", target_id: "" }))}
                    className={`py-2.5 px-2 text-center rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                      newTrustee.target_type === "role"
                        ? "bg-indigo-600 border-indigo-400 text-white shadow-md shadow-indigo-600/30"
                        : "bg-slate-950 border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    Staff Role
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewTrustee((p) => ({
                        ...p,
                        target_type: "bot",
                        target_id: "",
                        trust_tier: 2,
                        bypass_channels: true,
                        bypass_roles: false,
                        bypass_members: false,
                        bypass_bots: false,
                        bypass_webhooks: false,
                      }))
                    }
                    className={`py-2.5 px-2 text-center rounded-xl text-xs sm:text-sm font-semibold transition-all border ${
                      newTrustee.target_type === "bot"
                        ? "bg-purple-600 border-purple-400 text-white shadow-md shadow-purple-600/30"
                        : "bg-slate-950 border-white/10 text-slate-400 hover:text-white"
                    }`}
                  >
                    Bot (J2C)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-200 block mb-2">
                  Select {newTrustee.target_type === "role" ? "Role" : newTrustee.target_type === "bot" ? "Bot Integration" : "Member"}
                </label>
                {newTrustee.target_type === "role" ? (
                  <RoleSelector
                    guildId={guildId}
                    roles={data.roles || []}
                    value={newTrustee.target_id}
                    onChange={(roleId) => setNewTrustee((p) => ({ ...p, target_id: roleId }))}
                    placeholder="Search or select a role..."
                  />
                ) : newTrustee.target_type === "bot" ? (
                  <div className="space-y-3">
                    {data.bots && data.bots.length > 0 && (
                      <select
                        value={newTrustee.target_id}
                        onChange={(e) => setNewTrustee((p) => ({ ...p, target_id: e.target.value }))}
                        className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                      >
                        <option value="">-- Select a bot in this server --</option>
                        {data.bots.map((b) => (
                          <option key={b.id} value={b.id}>
                            🤖 {b.displayName || b.name} ({b.id})
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      type="text"
                      value={newTrustee.target_id}
                      onChange={(e) => setNewTrustee((p) => ({ ...p, target_id: e.target.value.trim() }))}
                      placeholder="Or enter bot user ID (e.g. 1033451129364811929)..."
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 leading-relaxed">
                      💡 Whitelisting this bot grants immunity to channel deletion velocity limits. Any temporary voice channels deleted when users leave will not be flagged as a nuke attack.
                    </div>
                  </div>
                ) : (
                  <UserSelector
                    guildId={guildId}
                    value={newTrustee.target_id}
                    onChange={(userId) => setNewTrustee((p) => ({ ...p, target_id: userId }))}
                    placeholder="Search member name or enter user ID..."
                  />
                )}
              </div>

              {newTrustee.target_type !== "bot" && (
                <>
                  <div>
                    <label className="text-sm font-semibold text-slate-200 block mb-2">Trust Level</label>
                    <select
                      value={newTrustee.trust_tier}
                      onChange={(e) => setNewTrustee((p) => ({ ...p, trust_tier: Number(e.target.value) }))}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value={1}>Tier 1: Full Bypass (Universal immunity to all limits)</option>
                      <option value={2}>Tier 2: Senior Admin (Channels, Roles & Members)</option>
                      <option value={3}>Tier 3: Moderator (Selective bypasses)</option>
                    </select>
                  </div>

                  {newTrustee.trust_tier > 1 && (
                    <div className="space-y-3 pt-3 border-t border-white/10">
                      <div className="text-sm font-semibold text-slate-200">Permitted Bypasses</div>
                      <div className="grid grid-cols-2 gap-3 text-sm text-slate-300">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-white/20 text-indigo-600 focus:ring-0"
                            checked={newTrustee.bypass_channels}
                            onChange={(e) => setNewTrustee((p) => ({ ...p, bypass_channels: e.target.checked }))}
                          />
                          <span>Channels</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-white/20 text-indigo-600 focus:ring-0"
                            checked={newTrustee.bypass_roles}
                            onChange={(e) => setNewTrustee((p) => ({ ...p, bypass_roles: e.target.checked }))}
                          />
                          <span>Roles</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-white/20 text-indigo-600 focus:ring-0"
                            checked={newTrustee.bypass_members}
                            onChange={(e) => setNewTrustee((p) => ({ ...p, bypass_members: e.target.checked }))}
                          />
                          <span>Member Bans/Kicks</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-white/20 text-indigo-600 focus:ring-0"
                            checked={newTrustee.bypass_bots}
                            onChange={(e) => setNewTrustee((p) => ({ ...p, bypass_bots: e.target.checked }))}
                          />
                          <span>Bot Invites</span>
                        </label>
                        <label className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            className="rounded border-white/20 text-indigo-600 focus:ring-0"
                            checked={newTrustee.bypass_webhooks}
                            onChange={(e) => setNewTrustee((p) => ({ ...p, bypass_webhooks: e.target.checked }))}
                          />
                          <span>Webhooks</span>
                        </label>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAddTrusteeOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-1/2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
