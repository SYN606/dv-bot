import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getGuildMeta,
  getVerification,
  saveVerification,
  postVerificationButton,
  resetVerification,
  getGuildEmojis,
} from "../api/client";
import {
  ShieldCheck,
  Send,
  Check,
  AlertTriangle,
  Sliders,
  Sparkles,
  Eye,
  Hash,
  UserCheck,
  ChevronDown,
  Search,
  Layers,
  RotateCcw,
  UserMinus,
} from "lucide-react";

const QUICK_UNICODE_EMOJIS = [
  "✅", "🛡️", "🔒", "⭐", "🚀", "✨", "🎉", "🔑", "👑", "🔥", "👍", "💎", "⚡", "🎯",
];

const VARIABLE_TAGS = [
  { key: "{verifiedRole}", label: "Verified Role" },
];

function renderEmoji(emojiString) {
  if (!emojiString) return <span>✅</span>;

  const match = emojiString.match(/<(a)?:([a-zA-Z0-9_]+):([0-9]+)>/);
  if (match) {
    const isAnimated = Boolean(match[1]);
    const id = match[3];
    const ext = isAnimated ? "gif" : "png";
    return (
      <img
        src={`https://cdn.discordapp.com/emojis/${id}.${ext}`}
        alt={match[2]}
        className="w-5 h-5 object-contain inline-block"
        loading="lazy"
      />
    );
  }

  return <span className="text-base leading-none">{emojiString}</span>;
}

export default function VerificationPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [serverEmojis, setServerEmojis] = useState([]);
  const [guildInfo, setGuildInfo] = useState(null);

  // Form Configuration
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
  const [resetting, setResetting] = useState(false);
  const [staleRoleAlert, setStaleRoleAlert] = useState(false);

  // Emoji Dropdown Popover
  const [emojiDropdownOpen, setEmojiDropdownOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const emojiPopoverRef = useRef(null);
  const descTextareaRef = useRef(null);

  // Close emoji dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (emojiPopoverRef.current && !emojiPopoverRef.current.contains(event.target)) {
        setEmojiDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Meta, Verification Config, and Emojis
  useEffect(() => {
    Promise.all([
      getGuildMeta(guildId),
      getVerification(guildId),
      getGuildEmojis(guildId).catch(() => []),
    ])
      .then(([meta, verif, emojis]) => {
        setChannels(meta.channels || []);
        setRoles(meta.roles || []);
        if (meta.guild) setGuildInfo(meta.guild);

        const customEmojis = Array.isArray(emojis) && emojis.length > 0
          ? emojis
          : meta.emojis || [];
        setServerEmojis(customEmojis);

        if (verif) {
          if (verif.roleExists === false && verif.verified_role_id) {
            setStaleRoleAlert(true);
          } else {
            setStaleRoleAlert(false);
          }

          setConfig({
            enabled: Boolean(verif.enabled),
            channelId: verif.channelId || verif.verify_channel_id || "",
            verifiedRoleId: verif.verifiedRoleId || verif.verified_role_id || "",
            unverifiedRoleId: verif.unverifiedRoleId || verif.unverified_role_id || "",
            logChannelId: verif.logChannelId || verif.log_channel_id || "",
            mode: verif.mode === "captcha" ? "captcha" : "button",
            minAccountAgeHours: Number(verif.minAccountAgeHours || verif.min_account_age_hours || 0),
            embedTitle: verif.embedTitle || verif.embed_title || "Server Verification",
            embedDescription: verif.embedDescription || verif.embed_description || "🛡️ Click the button below to verify and get access to the server.",
            buttonLabel: verif.buttonLabel || verif.button_label || "Verify Access",
            buttonEmoji: verif.buttonEmoji || verif.button_emoji || "✅",
          });
        }
      })
      .catch((err) => console.error(err));
  }, [guildId]);

  const selectedRole = roles.find((r) => r.id === config.verifiedRoleId);
  const isHierarchyError = selectedRole?.isAboveBot;

  // Insert Variable at cursor position
  const handleInsertVariable = (variableKey) => {
    const textarea = descTextareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart ?? config.embedDescription.length;
      const end = textarea.selectionEnd ?? config.embedDescription.length;
      const current = config.embedDescription || "";
      const updated = current.substring(0, start) + variableKey + current.substring(end);
      setConfig((prev) => ({ ...prev, embedDescription: updated }));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variableKey.length, start + variableKey.length);
      }, 0);
    } else {
      setConfig((prev) => ({
        ...prev,
        embedDescription: prev.embedDescription
          ? `${prev.embedDescription} ${variableKey}`
          : variableKey,
      }));
    }
    showToast(`Added ${variableKey}`);
  };

  // Preset Template Loader
  const handleApplyPreset = () => {
    setConfig((prev) => ({
      ...prev,
      embedTitle: "Server Verification",
      embedDescription: "🛡️ Click the button below to verify and get access to the server.",
      buttonLabel: "Verify Access",
      buttonEmoji: "✅",
    }));
    showToast("Loaded simple template!");
  };

  const handleResetConfig = async () => {
    if (!window.confirm("Delete and completely reset all verification configuration for this server?")) {
      return;
    }
    setResetting(true);
    try {
      await resetVerification(guildId);
      setConfig({
        enabled: false,
        channelId: "",
        verifiedRoleId: "",
        unverifiedRoleId: "",
        logChannelId: "",
        mode: "button",
        minAccountAgeHours: 0,
        embedTitle: "Server Verification",
        embedDescription: "🛡️ Click the button below to verify and get access to the server.",
        buttonLabel: "Verify Access",
        buttonEmoji: "✅",
      });
      setStaleRoleAlert(false);
      showToast("Verification configuration completely deleted and reset!");
    } catch (err) {
      showToast(err.message || "Failed to reset config.", "error");
    } finally {
      setResetting(false);
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      await saveVerification(guildId, config);
      showToast("Verification settings saved!");
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
    if (!config.verifiedRoleId) {
      showToast("Please select a Role to Grant first.", "error");
      return;
    }
    setPosting(true);
    try {
      // Auto-save current configuration first
      await saveVerification(guildId, config);
      const res = await postVerificationButton(guildId, {
        ...config,
        channelId: config.channelId,
        verifiedRoleId: config.verifiedRoleId,
      });
      showToast(res.message || "Verification prompt posted to channel!");
    } catch (err) {
      showToast(err.message || "Failed to post prompt.", "error");
    } finally {
      setPosting(false);
    }
  };

  // Filter emojis by search query
  const filteredServerEmojis = useMemo(() => {
    if (!emojiSearch.trim()) return serverEmojis;
    const q = emojiSearch.toLowerCase();
    return serverEmojis.filter((e) => e.name?.toLowerCase().includes(q));
  }, [serverEmojis, emojiSearch]);

  // Live variable resolution for real-time Discord preview
  const previewData = useMemo(() => {
    const currentGuild = user?.guilds?.find((g) => g.id === guildId) || guildInfo || {};
    const serverName = currentGuild.name || "Server";
    const verifiedRole = roles.find((r) => r.id === config.verifiedRoleId);
    const verifiedRoleName = verifiedRole ? `@${verifiedRole.name}` : "@Verified";

    const resolveVariables = (str, fallback = "") => {
      const text = str || fallback;
      if (!text) return "";
      return text
        .replace(/\{verifiedRole\}|\{verified_role\}/gi, verifiedRoleName)
        // Clean out legacy unused variables
        .replace(/\{server\.name\}|\{guild\.name\}|\{server\}|\{guild\}/gi, serverName)
        .replace(/\{memberCount\}|\{member_count\}|\{server\.memberCount\}|\{server\.members\}|\{members\}/gi, "")
        .replace(/\{rulesChannel\}|\{rules_channel\}|\{rules\}/gi, "");
    };

    return {
      title: resolveVariables(config.embedTitle, "Server Verification"),
      description: resolveVariables(
        config.embedDescription,
        "🛡️ Click the button below to verify and get access to the server."
      ),
      buttonLabel: resolveVariables(config.buttonLabel, "Verify Access"),
      serverName,
    };
  }, [config, guildInfo, roles, user, guildId]);

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Verification Gate"]}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Simple Header & Global Status */}
        <div className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                  Verification Gate
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                    config.enabled
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-slate-800 text-slate-400 border-white/5"
                  }`}
                >
                  {config.enabled ? "Active" : "Disabled"}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Automatically verify incoming members and assign access roles.
              </p>
            </div>
          </div>

          {/* Quick Toggle Switch */}
          <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-2.5 rounded-2xl border border-white/10 self-start sm:self-auto">
            <span className="text-xs font-semibold text-slate-300">
              {config.enabled ? "Gate Enabled" : "Gate Disabled"}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>

        {/* Verification Disabled Hint Banner */}
        {!config.enabled && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <p className="font-bold text-amber-300">Verification Gate is Currently Turned Off</p>
              <p className="mt-0.5">
                Incoming members clicking the verification button in Discord will see a notice that verification is paused by administrators. Enable the gate switch above when you are ready to accept new members.
              </p>
            </div>
          </div>
        )}

        {/* Stale / Deleted Role Warning */}
        {staleRoleAlert && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-200">
              <p className="font-bold text-rose-300">Stale Config Alert: Verified Role Missing in Discord</p>
              <p className="mt-0.5">
                The role previously configured in the database was deleted from Discord. Please choose a valid role under <strong>Role to Grant</strong> and click <strong>Save Settings</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Role Hierarchy Warning */}
        {isHierarchyError && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <p className="font-bold text-amber-300">Bot Role Hierarchy Alert</p>
              <p className="mt-0.5">
                The role <strong>@{selectedRole?.name}</strong> is higher than or equal to the bot's highest role. Discord will reject assigning it. Open <strong>Discord Server Settings &gt; Roles</strong> and drag the bot's role above @{selectedRole?.name}.
              </p>
            </div>
          </div>
        )}

        {/* 2-Column Uncluttered Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Configuration Form (7 Cols) */}
          <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
            {/* Section 1: Essentials */}
            <div className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 space-y-5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>1. Core Setup</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Verification Channel */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Verification Channel *</span>
                  </label>
                  <select
                    value={config.channelId}
                    onChange={(e) => setConfig({ ...config, channelId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">Select a channel...</option>
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        #{ch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Verified Role */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Role to Grant *</span>
                  </label>
                  <select
                    value={config.verifiedRoleId}
                    onChange={(e) => setConfig({ ...config, verifiedRoleId: e.target.value })}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border text-xs sm:text-sm text-white focus:outline-none cursor-pointer ${
                      isHierarchyError ? "border-amber-500/50 text-amber-200" : "border-white/10 focus:border-indigo-500"
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
              </div>

              {/* Challenge Mode Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Challenge Mode</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, mode: "button" })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      config.mode === "button"
                        ? "bg-indigo-600/20 border-indigo-500/60 ring-1 ring-indigo-500/40"
                        : "bg-slate-900/60 border-white/10 hover:border-white/20 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>⚡</span>
                        <span>1-Click Button (Instant)</span>
                      </span>
                      {config.mode === "button" && (
                        <Check className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Instant access with zero friction. Clicking the button immediately assigns the role.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, mode: "captcha" })}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      config.mode === "captcha"
                        ? "bg-indigo-600/20 border-indigo-500/60 ring-1 ring-indigo-500/40"
                        : "bg-slate-900/60 border-white/10 hover:border-white/20 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🧩</span>
                        <span>Anti-Raid Captcha Modal</span>
                      </span>
                      {config.mode === "captcha" && (
                        <Check className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Opens a modal popup requiring the member to type a 6-character code to defeat raid bots.
                    </p>
                  </button>
                </div>
              </div>

              {/* Optional Unverified Role & Audit Log Channel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Unverified Role (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <UserMinus className="w-3.5 h-3.5 text-slate-400" />
                    <span>Unverified Role (Optional)</span>
                  </label>
                  <select
                    value={config.unverifiedRoleId}
                    onChange={(e) => setConfig({ ...config, unverifiedRoleId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">None (Optional)</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        @{r.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Removed automatically when the member verifies.
                  </p>
                </div>

                {/* Audit Log Channel (Optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                    <span>Audit Log Channel (Optional)</span>
                  </label>
                  <select
                    value={config.logChannelId}
                    onChange={(e) => setConfig({ ...config, logChannelId: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">None (Disabled)</option>
                    {channels.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        #{ch.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Sends verification confirmation logs here.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Embed Message & Button Styling */}
            <div className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>2. Message & Button</span>
                </h2>

                <button
                  type="button"
                  onClick={handleApplyPreset}
                  className="text-xs text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Use Recommended Template</span>
                </button>
              </div>

              {/* Title & Button Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Embed Title
                  </label>
                  <input
                    type="text"
                    value={config.embedTitle}
                    onChange={(e) => setConfig({ ...config, embedTitle: e.target.value })}
                    placeholder="Server Verification"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Button Label
                  </label>
                  <input
                    type="text"
                    value={config.buttonLabel}
                    onChange={(e) => setConfig({ ...config, buttonLabel: e.target.value })}
                    placeholder="Verify Access"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Button Emoji Dropdown / Option Menu */}
              <div className="relative" ref={emojiPopoverRef}>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Button Emoji (Animated & Custom Supported)
                </label>

                <button
                  type="button"
                  onClick={() => setEmojiDropdownOpen(!emojiDropdownOpen)}
                  className="w-full sm:w-auto min-w-[200px] px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-white/10 hover:border-indigo-500/40 text-xs sm:text-sm text-white flex items-center justify-between gap-3 transition-all cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-2.5">
                    {renderEmoji(config.buttonEmoji)}
                    <span className="font-mono text-xs text-slate-300">
                      {config.buttonEmoji || "✅"}
                    </span>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      emojiDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Emoji Popover Option Menu */}
                {emojiDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 w-full sm:w-96 rounded-2xl glass-panel border border-white/15 shadow-2xl p-4 space-y-3 z-50 animate-in fade-in zoom-in-95">
                    {/* Search inside emojis */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Search custom or animated emojis..."
                        value={emojiSearch}
                        onChange={(e) => setEmojiSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Server Custom & Animated Emojis */}
                    <div className="space-y-1.5">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center justify-between">
                        <span>Server Emojis ({serverEmojis.length})</span>
                        <span className="text-[10px] text-slate-500 lowercase">animated GIFs enabled</span>
                      </div>

                      {filteredServerEmojis.length === 0 ? (
                        <div className="text-center py-3 text-xs text-slate-400">
                          {serverEmojis.length === 0
                            ? "No custom server emojis found."
                            : "No emojis match your search."}
                        </div>
                      ) : (
                        <div className="grid grid-cols-6 gap-2 max-h-44 overflow-y-auto p-1 scrollbar-thin">
                          {filteredServerEmojis.map((e) => {
                            const val = e.identifier || e.raw;
                            const isSelected = config.buttonEmoji === val;
                            return (
                              <button
                                key={e.id}
                                type="button"
                                onClick={() => {
                                  setConfig({ ...config, buttonEmoji: val });
                                  setEmojiDropdownOpen(false);
                                  showToast(`Selected :${e.name}: for button!`);
                                }}
                                title={`:${e.name}: ${e.animated ? "(Animated GIF)" : ""}`}
                                className={`p-2 rounded-xl flex flex-col items-center justify-center border transition-all cursor-pointer ${
                                  isSelected
                                    ? "bg-indigo-600/30 border-indigo-400 ring-2 ring-indigo-400/40"
                                    : "bg-slate-900/80 border-white/5 hover:border-indigo-500/40 hover:bg-slate-800"
                                }`}
                              >
                                <img
                                  src={e.url}
                                  alt={e.name}
                                  className="w-6 h-6 object-contain"
                                  loading="lazy"
                                />
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Quick Standard Unicode */}
                    <div className="space-y-1.5 border-t border-white/10 pt-2.5">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                        Standard Icons
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_UNICODE_EMOJIS.map((em) => (
                          <button
                            key={em}
                            type="button"
                            onClick={() => {
                              setConfig({ ...config, buttonEmoji: em });
                              setEmojiDropdownOpen(false);
                            }}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-base transition-all cursor-pointer ${
                              config.buttonEmoji === em
                                ? "bg-indigo-600/30 border border-indigo-400"
                                : "bg-slate-900 border border-white/5 hover:bg-slate-800 hover:border-white/20"
                            }`}
                          >
                            {em}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Description & Verified Role Variable */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Embed Description & Instructions
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Available variable:
                  </span>
                </div>

                {/* Clean 1-Click Verified Role Variable */}
                <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-slate-900/90 border border-white/10">
                  <button
                    type="button"
                    onClick={() => handleInsertVariable("{verifiedRole}")}
                    title="Insert verified role mention"
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 text-xs font-mono font-medium transition-all hover:scale-105 cursor-pointer flex items-center gap-2 shadow-sm"
                  >
                    <span className="text-indigo-400 font-bold text-sm">+</span>
                    <span className="font-semibold">{`{verifiedRole}`}</span>
                    <span className="text-[10px] text-slate-400 font-sans">(Verified Role Mention)</span>
                  </button>
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    Mentions the role given to verified members.
                  </span>
                </div>

                <textarea
                  ref={descTextareaRef}
                  rows="3"
                  value={config.embedDescription}
                  onChange={(e) => setConfig({ ...config, embedDescription: e.target.value })}
                  placeholder="🛡️ Click the button below to verify and receive the {verifiedRole} role to unlock access."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-y leading-relaxed font-sans"
                />
              </div>
            </div>
          </form>

          {/* Right Column: Live Discord Preview & Actions (5 Cols) */}
          <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-6">
            <div className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>Live Discord Preview</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Real-time
                </span>
              </div>

              {/* Realistic Discord Mockup */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#313338] border border-white/10 space-y-3 font-sans shadow-xl">
                {/* Bot Message Header */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-indigo-600 shrink-0">
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

                {/* Discord Embed Box */}
                <div className="ml-0 sm:ml-12 pl-3.5 border-l-4 border-[#5865f2] bg-[#2b2d31] p-4 rounded-r-xl space-y-2 max-w-xl">
                  <h4 className="text-sm sm:text-base font-bold text-white tracking-wide">
                    {previewData.title}
                  </h4>
                  <p className="text-xs sm:text-sm text-[#dbdee1] whitespace-pre-line leading-relaxed">
                    {previewData.description}
                  </p>
                  <div className="text-[10px] text-[#949ba4] pt-1 flex items-center gap-1.5 font-sans">
                    <span>Digital Vigital Verification</span>
                    <span>•</span>
                    <span>{previewData.serverName}</span>
                  </div>
                </div>

                {/* Discord Interactive Button */}
                <div className="ml-0 sm:ml-12 pt-1 flex flex-col items-start gap-1.5">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#248046] text-white text-xs sm:text-sm font-semibold shadow-md select-none">
                    {renderEmoji(config.buttonEmoji)}
                    <span>{previewData.buttonLabel}</span>
                  </div>
                  <span className="text-[10px] text-[#949ba4] italic flex items-center gap-1">
                    {config.mode === "captcha"
                      ? "🧩 Clicking opens Anti-Raid Captcha Modal in Discord"
                      : "⚡ Clicking grants role instantly (1-Click)"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <button
                  type="button"
                  onClick={handlePostButton}
                  disabled={posting || !config.channelId || !config.verifiedRoleId}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{posting ? "Posting to Discord..." : "Send Verification Prompt to Channel"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? "Saving..." : "Save Settings"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetConfig}
                  disabled={resetting}
                  title="Reset verification database configuration back to clean defaults"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 text-rose-400 ${resetting ? "animate-spin" : ""}`} />
                  <span>{resetting ? "Resetting Configuration..." : "Reset Config to Clean Defaults"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
