import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getGuildMeta,
  getVerification,
  saveVerification,
  postVerificationButton,
  getGuildEmojis,
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
  Smile,
  ChevronDown,
  Search,
  ChevronUp,
  RotateCcw,
  Layers,
} from "lucide-react";

const QUICK_UNICODE_EMOJIS = [
  "✅", "🛡️", "🔒", "⭐", "🚀", "✨", "🎉", "🔑", "👑", "🔥", "👍", "💎", "⚡", "🎯",
];

const VARIABLE_TAGS = [
  { key: "{server}", label: "Server Name", desc: "Discord server name" },
  { key: "{memberCount}", label: "Member Count", desc: "Total server members count" },
  { key: "{verifiedRole}", label: "Verified Role", desc: "Role mention (@Verified)" },
  { key: "{channel}", label: "Channel", desc: "Verification channel link" },
  { key: "{rules}", label: "Rules Channel", desc: "Rules channel link (#rules)" },
  { key: "{owner}", label: "Owner", desc: "Server owner mention" },
  { key: "{boosts}", label: "Boosts", desc: "Nitro boost count" },
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
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      embedTitle: "{server} Verification",
      embedDescription:
        "🛡️ Welcome to **{server}**!\n\n" +
        "You are member #{memberCount}. Click the button below to verify and unlock full member channels with {verifiedRole}.\n\n" +
        "Please make sure to review our community guidelines in {rules}.",
      buttonLabel: "Verify Access",
    }));
    showToast("Loaded recommended verification template!");
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
    setPosting(true);
    try {
      await postVerificationButton(guildId);
      showToast("Verification prompt posted to channel!");
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
    const serverName = currentGuild.name || "My Discord Server";
    const memberCount = guildInfo?.memberCount ? Number(guildInfo.memberCount).toLocaleString() : "1,420";
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
      title: resolveVariables(config.embedTitle, `${serverName} Verification`),
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

              {/* Verification Mode */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Challenge Mode</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, mode: "button" })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                      config.mode === "button"
                        ? "bg-indigo-600/30 text-indigo-200 border-indigo-500/50 shadow-sm"
                        : "bg-slate-900 text-slate-400 border-white/5 hover:border-white/15"
                    }`}
                  >
                    1-Click Button (Instant)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, mode: "captcha" })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all text-center cursor-pointer ${
                      config.mode === "captcha"
                        ? "bg-purple-600/30 text-purple-200 border-purple-500/50 shadow-sm"
                        : "bg-slate-900 text-slate-400 border-white/5 hover:border-white/15"
                    }`}
                  >
                    Anti-Raid Captcha Modal
                  </button>
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
                    placeholder="{server} Verification"
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

              {/* Description & Easy One-Click Variables Bar */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Embed Description & Rules Markdown
                  </label>
                  <span className="text-[11px] text-indigo-400 font-medium">
                    Click any tag below to insert into message
                  </span>
                </div>

                {/* 1-Click Variable Insert Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-2xl bg-slate-900/90 border border-white/10">
                  {VARIABLE_TAGS.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => handleInsertVariable(v.key)}
                      title={v.desc}
                      className="px-2.5 py-1 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 text-xs font-mono font-medium transition-all hover:scale-105 cursor-pointer flex items-center gap-1"
                    >
                      <span>+</span>
                      <span>{v.key}</span>
                    </button>
                  ))}
                </div>

                <textarea
                  ref={descTextareaRef}
                  rows="4"
                  value={config.embedDescription}
                  onChange={(e) => setConfig({ ...config, embedDescription: e.target.value })}
                  placeholder="Welcome to {server}! Click the button below to receive {verifiedRole} and gain access to channels."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-y leading-relaxed font-sans"
                />
              </div>
            </div>

            {/* Section 3: Collapsible Advanced Security */}
            <div className="glass-card rounded-3xl border border-white/10 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full p-5 text-left flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300 font-mono hover:bg-white/5 transition-all cursor-pointer"
              >
                <span>3. Optional Security & Quarantine</span>
                <div className="flex items-center gap-2 text-slate-400">
                  <span className="text-xs font-sans capitalize font-normal">
                    {showAdvanced ? "Hide" : "Show"}
                  </span>
                  {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {showAdvanced && (
                <div className="p-5 sm:p-6 border-t border-white/10 space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Unverified Role */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Unverified Role (Optional)
                      </label>
                      <select
                        value={config.unverifiedRoleId}
                        onChange={(e) => setConfig({ ...config, unverifiedRoleId: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">None (Optional)</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            @{r.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Given on join, removed upon successful verification.
                      </p>
                    </div>

                    {/* Logs Channel */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Audit Log Channel (Optional)
                      </label>
                      <select
                        value={config.logChannelId}
                        onChange={(e) => setConfig({ ...config, logChannelId: e.target.value })}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="">None (Optional)</option>
                        {channels.map((ch) => (
                          <option key={ch.id} value={ch.id}>
                            #{ch.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Where verification audit cards will be sent.
                      </p>
                    </div>
                  </div>

                  {/* Account Age Quarantine */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Minimum Account Age Quarantine</span>
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
                        className="w-40 px-3.5 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="0"
                      />
                      <span className="text-xs text-slate-300">hours old (0 = disabled)</span>
                    </div>
                  </div>
                </div>
              )}
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
                <div className="ml-0 sm:ml-12 pt-1">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#248046] text-white text-xs sm:text-sm font-semibold shadow-md select-none">
                    {renderEmoji(config.buttonEmoji)}
                    <span>{previewData.buttonLabel}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-white/10 space-y-2.5">
                <button
                  type="button"
                  onClick={handlePostButton}
                  disabled={posting || !config.channelId}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
