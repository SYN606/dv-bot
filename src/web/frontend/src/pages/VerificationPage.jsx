import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getGuildMeta,
  getVerification,
  saveVerification,
  postVerificationButton,
} from "../api/client";
import {
  ShieldCheck,
  Send,
  Check,
  AlertTriangle,
  KeyRound,
  Clock,
  Sliders,
  Sparkles,
  Eye,
  Hash,
  UserCheck,
} from "lucide-react";

const SERVER_VARS = [
  { label: "{server}", title: "Server Name", desc: "Current Discord server name" },
  { label: "{memberCount}", title: "Member Count", desc: "Total member count" },
  { label: "{channel}", title: "Verification Channel", desc: "Channel mention (#verify)" },
  { label: "{verifiedRole}", title: "Verified Role", desc: "Role mention (@Verified)" },
  { label: "{unverifiedRole}", title: "Unverified Role", desc: "Role mention (@Unverified)" },
  { label: "{rules}", title: "Rules Channel", desc: "Channel mention (#rules)" },
  { label: "{owner}", title: "Server Owner", desc: "Server owner mention" },
  { label: "{boosts}", title: "Nitro Boosts", desc: "Server boost count" },
  { label: "{server.id}", title: "Server ID", desc: "Discord guild snowflake ID" },
];

export default function VerificationPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [guildInfo, setGuildInfo] = useState(null);
  const [config, setConfig] = useState({
    enabled: false,
    channelId: "",
    verifiedRoleId: "",
    unverifiedRoleId: "",
    logChannelId: "",
    mode: "button",
    minAccountAgeHours: 0,
    embedTitle: "",
    embedDescription: "",
    buttonLabel: "Verify Access",
    buttonEmoji: "✅",
  });
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    Promise.all([getGuildMeta(guildId), getVerification(guildId)])
      .then(([meta, verif]) => {
        setChannels(meta.channels || []);
        setRoles(meta.roles || []);
        if (meta.guild) {
          setGuildInfo(meta.guild);
        }
        if (verif) {
          setConfig({
            enabled: Boolean(verif.enabled),
            channelId: verif.channelId || verif.verify_channel_id || "",
            verifiedRoleId: verif.verifiedRoleId || verif.verified_role_id || "",
            unverifiedRoleId: verif.unverifiedRoleId || verif.unverified_role_id || "",
            logChannelId: verif.logChannelId || verif.log_channel_id || "",
            mode: verif.mode || "button",
            minAccountAgeHours: verif.minAccountAgeHours || verif.min_account_age_hours || 0,
            embedTitle: verif.embedTitle || verif.embed_title || "",
            embedDescription: verif.embedDescription || verif.embed_description || "",
            buttonLabel: verif.buttonLabel || verif.button_label || "Verify Access",
            buttonEmoji: verif.buttonEmoji || verif.button_emoji || "✅",
          });
        }
      })
      .catch((err) => console.error(err));
  }, [guildId]);

  const selectedRole = roles.find((r) => r.id === config.verifiedRoleId);
  const isHierarchyError = selectedRole?.isAboveBot;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveVerification(guildId, config);
      showToast("Verification gate settings saved successfully!");
    } catch (err) {
      showToast(err.message || "Failed to save verification settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePostButton = async () => {
    if (!config.channelId) {
      showToast("Please select a verification channel first.", "error");
      return;
    }
    setPosting(true);
    try {
      await postVerificationButton(guildId);
      showToast("Verification prompt posted to channel!");
    } catch (err) {
      showToast(err.message || "Failed to post verification prompt.", "error");
    } finally {
      setPosting(false);
    }
  };

  // Insert template variable into description textarea
  const insertVariable = (variableKey) => {
    setConfig((prev) => {
      const current = prev.embedDescription || "";
      const updated = current ? `${current} ${variableKey}` : variableKey;
      return { ...prev, embedDescription: updated };
    });
    showToast(`Appended ${variableKey} to description!`);
  };

  // Live variable resolution for real-time Discord preview
  const previewData = useMemo(() => {
    const currentGuild = user?.guilds?.find((g) => g.id === guildId) || guildInfo || {};
    const serverName = currentGuild.name || "Community Server";
    const memberCount = guildInfo?.memberCount ? Number(guildInfo.memberCount).toLocaleString() : "1,248";
    const selectedChan = channels.find((c) => c.id === config.channelId);
    const channelName = selectedChan ? `#${selectedChan.name}` : "#verification";
    const verifiedRole = roles.find((r) => r.id === config.verifiedRoleId);
    const verifiedRoleName = verifiedRole ? `@${verifiedRole.name}` : "@Verified";
    const unverifiedRole = roles.find((r) => r.id === config.unverifiedRoleId);
    const unverifiedRoleName = unverifiedRole ? `@${unverifiedRole.name}` : "@Unverified";

    const resolveVariables = (str, fallback = "") => {
      const text = str || fallback;
      if (!text) return "";
      return text
        .replace(/\{server\.name\}|\{guild\.name\}|\{server\}|\{guild\}/gi, serverName)
        .replace(/\{server\.id\}|\{guild\.id\}/gi, guildId)
        .replace(/\{memberCount\}|\{member_count\}|\{server\.memberCount\}|\{server\.members\}|\{members\}/gi, memberCount)
        .replace(/\{channel\.name\}|\{channel\.mention\}|\{channel\}/gi, channelName)
        .replace(/\{verifiedRole\}|\{verified_role\}/gi, verifiedRoleName)
        .replace(/\{unverifiedRole\}|\{unverified_role\}/gi, unverifiedRoleName)
        .replace(/\{rulesChannel\}|\{rules_channel\}|\{rules\}/gi, "#rules")
        .replace(/\{owner\}|\{server\.owner\}/gi, "@Owner")
        .replace(/\{boosts\}|\{boost_count\}|\{server\.boosts\}/gi, "14")
        .replace(/\{boostTier\}|\{boost_tier\}|\{server\.tier\}/gi, "Level 2");
    };

    return {
      title: resolveVariables(config.embedTitle, "Server Verification"),
      description: resolveVariables(
        config.embedDescription,
        `🛡️ Welcome to **${serverName}**!\n\nTo gain access to the rest of the server channels, please click the verification button below.`
      ),
      buttonLabel: resolveVariables(config.buttonLabel, "Verify Access"),
      serverName,
    };
  }, [config, guildInfo, channels, roles, user, guildId]);

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Verification Gate"]}
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <span>Verification Gate & Security</span>
          </h1>
          <p className="text-sm text-slate-300 mt-1.5">
            Safeguard your server against raids and bots with automated 1-click or captcha challenge verification. Supports dynamic server variables.
          </p>
        </div>

        {/* Role Hierarchy Warning */}
        {isHierarchyError && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <p className="font-bold text-amber-300">Bot Role Hierarchy Warning</p>
              <p className="mt-0.5">
                The role <strong>@{selectedRole?.name}</strong> is positioned higher than (or equal to) the bot's role.
                Discord will reject assigning this role to users. Please open <strong>Discord Server Settings &gt; Roles</strong> and drag the bot's role above @{selectedRole?.name}.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="glass-card p-6 sm:p-7 rounded-3xl border border-white/10 space-y-6">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between pb-6 border-b border-white/10">
              <div>
                <h3 className="font-bold text-base text-white">Enable Verification Gate</h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  When enabled, incoming members must verify before accessing server channels.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) =>
                    setConfig({ ...config, enabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Verification Mode & Anti-Raid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-white/10">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-indigo-400" />
                  <span>Challenge Mode</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, mode: "button" })}
                    className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                      config.mode === "button"
                        ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/50 shadow-sm"
                        : "bg-slate-900/60 text-slate-400 border-white/10 hover:border-white/20"
                    }`}
                  >
                    1-Click Instant
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, mode: "captcha" })}
                    className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                      config.mode === "captcha"
                        ? "bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-sm"
                        : "bg-slate-900/60 text-slate-400 border-white/10 hover:border-white/20"
                    }`}
                  >
                    Captcha Modal
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  {config.mode === "captcha"
                    ? "Displays a Discord popup modal with a randomized code to thwart automated token raids."
                    : "Instant verification with one button click."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2.5 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Minimum Account Age (Quarantine)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="720"
                    value={config.minAccountAgeHours}
                    onChange={(e) =>
                      setConfig({ ...config, minAccountAgeHours: Number(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500"
                    placeholder="0 (Disabled)"
                  />
                  <span className="text-xs text-slate-300 whitespace-nowrap font-medium">hours old</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Block accounts newer than this from verifying (e.g. 24h prevents raid burners).
                </p>
              </div>
            </div>

            {/* Channel & Role Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-white/10">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-emerald-400" />
                  <span>Verification Channel</span>
                </label>
                <select
                  value={config.channelId}
                  onChange={(e) =>
                    setConfig({ ...config, channelId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">Select a channel...</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  <span>Verified Member Role (Granted)</span>
                </label>
                <select
                  value={config.verifiedRoleId}
                  onChange={(e) =>
                    setConfig({ ...config, verifiedRoleId: e.target.value })
                  }
                  className={`w-full px-4 py-2.5 rounded-xl bg-slate-900 border text-xs sm:text-sm text-white focus:outline-none cursor-pointer ${
                    isHierarchyError
                      ? "border-amber-500/60 text-amber-200"
                      : "border-white/15 focus:border-indigo-500"
                  }`}
                >
                  <option value="">Select role to give...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name} {r.isAboveBot ? "(⚠️ Above Bot)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Unverified Role (Optional)
                </label>
                <select
                  value={config.unverifiedRoleId}
                  onChange={(e) =>
                    setConfig({ ...config, unverifiedRoleId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">None (Optional)</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name} {r.isAboveBot ? "(⚠️ Above Bot)" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Role assigned to users on join and removed automatically upon verification.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Verification Logs Channel (Optional)
                </label>
                <select
                  value={config.logChannelId}
                  onChange={(e) =>
                    setConfig({ ...config, logChannelId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="">None (Optional)</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Channel where audit logs of verified users will be posted.
                </p>
              </div>
            </div>

            {/* Custom Embed, Button, & Server Variables */}
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>Verification Message & Appearance</span>
                </h3>

                <span className="text-xs text-indigo-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Dynamic Server Variables Supported</span>
                </span>
              </div>

              {/* Server Variables Clickable Pills */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300">
                    Click variable to insert into description:
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Automatically replaced with live server details
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SERVER_VARS.map((v) => (
                    <button
                      key={v.label}
                      type="button"
                      onClick={() => insertVariable(v.label)}
                      title={`${v.desc} (e.g. ${v.title})`}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 text-xs font-mono font-medium transition-all hover:scale-105 cursor-pointer"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Embed Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={config.embedTitle}
                    onChange={(e) => setConfig({ ...config, embedTitle: e.target.value })}
                    placeholder="Server Verification (or {server} Verification)"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={config.buttonLabel}
                      onChange={(e) => setConfig({ ...config, buttonLabel: e.target.value })}
                      placeholder="Verify Access"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Button Emoji
                    </label>
                    <input
                      type="text"
                      value={config.buttonEmoji}
                      onChange={(e) => setConfig({ ...config, buttonEmoji: e.target.value })}
                      placeholder="✅"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Embed Description & Welcome Rules Markdown (Optional)
                </label>
                <textarea
                  rows="4"
                  value={config.embedDescription}
                  onChange={(e) => setConfig({ ...config, embedDescription: e.target.value })}
                  placeholder="Welcome to {server}! You are member #{memberCount}. Click below to get {verifiedRole} and check out {rules}."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-y font-sans leading-relaxed"
                />
              </div>
            </div>

            {/* Real-time Discord Message Preview */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Live Discord Prompt Preview</span>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-[#313338] border border-white/10 space-y-3 font-sans shadow-xl">
                {/* Bot Message Header */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-600 shrink-0">
                    <img
                      src={botInfo?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                      alt={botInfo?.username || "Bot"}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        {botInfo?.username || "Digital Vigital"}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#5865F2] text-white uppercase tracking-wider">
                        BOT
                      </span>
                      <span className="text-[11px] text-[#949ba4]">Today at 12:00 PM</span>
                    </div>
                  </div>
                </div>

                {/* Discord Embed */}
                <div className="ml-0 sm:ml-12 pl-3.5 border-l-4 border-[#5865f2] bg-[#2b2d31] p-4 rounded-r-xl space-y-2.5 max-w-xl">
                  <h4 className="text-base font-bold text-white tracking-wide">
                    {previewData.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-[#dbdee1] whitespace-pre-line leading-relaxed">
                    {previewData.description}
                  </p>
                  <div className="text-[11px] text-[#949ba4] pt-1 flex items-center gap-1.5">
                    <span>Digital Vigital Verification</span>
                    <span>•</span>
                    <span>{previewData.serverName}</span>
                  </div>
                </div>

                {/* Discord Action Button */}
                <div className="ml-0 sm:ml-12 pt-1">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#248046] text-white text-xs sm:text-sm font-semibold shadow-md select-none">
                    <span>{config.buttonEmoji || "✅"}</span>
                    <span>{previewData.buttonLabel}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={handlePostButton}
                disabled={posting || !config.channelId}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4 text-emerald-400" />
                <span>{posting ? "Posting..." : "Send Verification Prompt to Channel"}</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? "Saving..." : "Save Settings"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
