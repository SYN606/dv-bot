import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getAutoresponders,
  saveAutoresponder,
  toggleAutoresponder,
  deleteAutoresponder,
  getGuildEmojis,
} from "../api/client";
import {
  Bot,
  Plus,
  Trash2,
  Smile,
  X,
  Search,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  ChevronDown,
  ToggleLeft,
  ToggleRight,
  Eye,
  RefreshCw,
  Edit2,
} from "lucide-react";

// Standard popular unicode emojis for quick addition
const QUICK_UNICODE_EMOJIS = [
  "👍", "❤️", "🔥", "🎉", "🚀", "👀", "💀", "✅", "❌", "⭐", "💯", "⚡", "👏", "🙏", "💎", "🛡️"
];

// Helper to parse custom Discord emoji string: <:name:id> or <a:name:id>
export function parseDiscordEmoji(str) {
  if (!str || typeof str !== "string") return null;
  const match = str.trim().match(/^<(a)?:([a-zA-Z0-9_]+):([0-9]+)>$/);
  if (match) {
    const isAnimated = Boolean(match[1]);
    const name = match[2];
    const id = match[3];
    return {
      isCustom: true,
      isAnimated,
      name,
      id,
      url: `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? "gif" : "png"}`,
      raw: str.trim(),
    };
  }
  return {
    isCustom: false,
    raw: str.trim(),
  };
}

// Emoji visual badge renderer
export function EmojiBadge({ emoji, onRemove = null, size = "md" }) {
  const parsed = parseDiscordEmoji(emoji);
  const imgSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const fontSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-white/10 text-slate-200 shadow-sm text-xs font-medium">
      {parsed?.isCustom ? (
        <img
          src={parsed.url}
          alt={parsed.name}
          className={`${imgSize} object-contain rounded shrink-0`}
          loading="lazy"
        />
      ) : (
        <span className={fontSize}>{emoji}</span>
      )}
      {parsed?.isCustom && (
        <span className="text-[10px] text-slate-400 font-mono">:{parsed.name}:</span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(emoji);
          }}
          className="p-0.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-rose-400 transition-colors"
          title="Remove emoji"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

export default function AutoresponderPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();

  // Rules & Emojis data
  const [rules, setRules] = useState([]);
  const [serverEmojis, setServerEmojis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingEmojis, setLoadingEmojis] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState(null);
  const [trigger, setTrigger] = useState("");
  const [reply, setReply] = useState("");
  const [matchMode, setMatchMode] = useState("contains");
  const [isEmbed, setIsEmbed] = useState(false);
  const [embedTitle, setEmbedTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [deleteTrigger, setDeleteTrigger] = useState(false);
  const [ignoreBots, setIgnoreBots] = useState(true);
  const [selectedEmojis, setSelectedEmojis] = useState([]);

  // Emoji Dropdown Popover State
  const [emojiDropdownOpen, setEmojiDropdownOpen] = useState(false);
  const [emojiSearch, setEmojiSearch] = useState("");
  const dropdownRef = useRef(null);

  // Rules list search filter
  const [filterSearch, setFilterSearch] = useState("");

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setEmojiDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch Rules & Emojis
  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesRes, emojisRes] = await Promise.all([
        getAutoresponders(guildId).catch(() => []),
        getGuildEmojis(guildId).catch(() => []),
      ]);

      const formattedRules = Array.isArray(rulesRes)
        ? rulesRes
        : (rulesRes?.rules || rulesRes?.responders || []);

      setRules(formattedRules);
      setServerEmojis(Array.isArray(emojisRes) ? emojisRes : []);
    } catch (err) {
      console.error(err);
      showToast?.("Failed to load autoresponder data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  // Refresh server emojis on demand
  const handleRefreshEmojis = async () => {
    setLoadingEmojis(true);
    try {
      const res = await getGuildEmojis(guildId);
      setServerEmojis(Array.isArray(res) ? res : []);
      showToast?.("Server emojis refreshed!");
    } catch (err) {
      showToast?.("Could not fetch emojis.", "error");
    } finally {
      setLoadingEmojis(false);
    }
  };

  // Filter server emojis
  const filteredServerEmojis = useMemo(() => {
    if (!emojiSearch.trim()) return serverEmojis;
    const q = emojiSearch.toLowerCase().trim();
    return serverEmojis.filter((e) => e.name.toLowerCase().includes(q));
  }, [serverEmojis, emojiSearch]);

  // Validate regex syntax live
  const regexStatus = useMemo(() => {
    if (matchMode !== "regex") return null;
    if (!trigger.trim()) return null;
    try {
      new RegExp(trigger, "i");
      return { valid: true };
    } catch (e) {
      return { valid: false, message: e.message };
    }
  }, [matchMode, trigger]);

  // Add emoji to reactions list
  const handleSelectEmoji = (rawEmoji) => {
    if (selectedEmojis.includes(rawEmoji)) {
      setSelectedEmojis(selectedEmojis.filter((e) => e !== rawEmoji));
    } else {
      if (selectedEmojis.length >= 10) {
        showToast?.("Maximum 10 emoji reactions per rule allowed.", "error");
        return;
      }
      setSelectedEmojis([...selectedEmojis, rawEmoji]);
    }
  };

  const handleRemoveEmoji = (rawEmoji) => {
    setSelectedEmojis(selectedEmojis.filter((e) => e !== rawEmoji));
  };

  // Reset form
  const resetForm = () => {
    setEditingId(null);
    setTrigger("");
    setReply("");
    setMatchMode("contains");
    setIsEmbed(false);
    setEmbedTitle("");
    setImageUrl("");
    setCooldown(0);
    setDeleteTrigger(false);
    setIgnoreBots(true);
    setSelectedEmojis([]);
  };

  // Edit existing rule
  const handleEditRule = (rule) => {
    setEditingId(rule.id || rule.responder_id);
    setTrigger(rule.trigger || rule.trigger_phrase || "");
    setReply(rule.reply || rule.reply_content || "");
    setMatchMode(rule.match_mode || rule.match_type || "contains");
    setIsEmbed(Boolean(rule.is_embed));
    setEmbedTitle(rule.embed_title || "");
    setImageUrl(rule.image_url || "");
    setCooldown(Number(rule.cooldown || 0));
    setDeleteTrigger(Boolean(rule.delete_trigger));
    setIgnoreBots(rule.ignore_bots !== false);
    setSelectedEmojis(rule.reactions || []);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Save rule (Create or Update)
  const handleSave = async (e) => {
    e.preventDefault();
    const hasAction = Boolean(reply.trim() || (isEmbed && embedTitle.trim()) || selectedEmojis.length > 0);
    if (!trigger.trim()) {
      showToast?.("Trigger keyword or phrase is required.", "error");
      return;
    }
    if (!hasAction) {
      showToast?.("Please provide a reply message, embed, or select at least one reaction emoji.", "error");
      return;
    }

    if (matchMode === "regex" && regexStatus && !regexStatus.valid) {
      showToast?.("Please fix the regular expression syntax error before saving.", "error");
      return;
    }

    setSaving(true);
    try {
      await saveAutoresponder(guildId, {
        id: editingId,
        trigger: trigger.trim(),
        reply: reply.trim(),
        matchMode,
        isEmbed,
        embedTitle: isEmbed ? embedTitle.trim() : null,
        imageUrl: isEmbed && imageUrl.trim() ? imageUrl.trim() : null,
        cooldown: Number(cooldown) || 0,
        deleteTrigger,
        ignoreBots,
        reactions: selectedEmojis,
      });

      showToast?.(editingId ? `Rule #${editingId} updated successfully!` : "Autoresponder rule created!");
      resetForm();
      loadData();
    } catch (err) {
      showToast?.(err.message || "Failed to save autoresponder rule.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Toggle rule status
  const handleToggle = async (ruleId) => {
    try {
      const res = await toggleAutoresponder(guildId, ruleId);
      showToast?.(res.enabled ? "Rule enabled." : "Rule disabled.");
      setRules((prev) =>
        prev.map((r) =>
          (r.id || r.responder_id) === ruleId ? { ...r, enabled: res.enabled } : r
        )
      );
    } catch (err) {
      showToast?.(err.message || "Failed to toggle rule.", "error");
    }
  };

  // Delete rule
  const handleDelete = async (ruleId) => {
    try {
      await deleteAutoresponder(guildId, ruleId);
      showToast?.("Autoresponder rule deleted.");
      if (editingId === ruleId) resetForm();
      loadData();
    } catch (err) {
      showToast?.(err.message || "Failed to delete rule.", "error");
    }
  };

  // Filtered rules list
  const filteredRules = useMemo(() => {
    if (!filterSearch.trim()) return rules;
    const q = filterSearch.toLowerCase().trim();
    return rules.filter(
      (r) =>
        (r.trigger || r.trigger_phrase || "").toLowerCase().includes(q) ||
        (r.reply || r.reply_content || "").toLowerCase().includes(q)
    );
  }, [rules, filterSearch]);

  const activeCount = rules.filter((r) => r.enabled !== false).length;

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Autoresponder"]}
    >
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <Bot className="w-7 h-7 text-indigo-400" />
              <span>Autoresponder Engine</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Trigger automated bot replies and emoji reactions when keywords, phrases, or regex patterns are sent in chat.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs font-mono text-indigo-300">
              {activeCount} Active / {rules.length} Total
            </span>
            <button
              onClick={handleRefreshEmojis}
              disabled={loadingEmojis}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 hover:text-white transition-all disabled:opacity-50"
              title="Refresh server custom emojis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingEmojis ? "animate-spin text-indigo-400" : ""}`} />
              <span className="hidden sm:inline">Refresh Emojis</span>
            </button>
          </div>
        </div>

        {/* Creator / Editor Form Card */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative space-y-6">
          {/* Active Edit Mode Banner */}
          {editingId && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-indigo-500/15 to-purple-500/15 border border-amber-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">Editing Rule #{editingId}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono font-semibold">
                      ACTIVE EDIT
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Modifying trigger <span className="font-mono text-amber-300 font-semibold">"{trigger || "..."}"</span>. Saving will update this rule directly.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors cursor-pointer shrink-0"
              >
                Cancel Edit
              </button>
            </div>
          )}

          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {editingId ? `Edit Autoresponder Rule #${editingId}` : "Create New Autoresponder Rule"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {editingId ? "Customize triggers, actions, cooldowns, or emoji reactions" : "Configure triggers, match conditions, reactions, and responses"}
                </p>
              </div>
            </div>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            {/* Row 1: Trigger & Match Mode */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Trigger Keyword / Phrase / Pattern <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder={matchMode === "regex" ? "e.g. ^(hi|hello|hey)\\b" : "e.g. !help, discord link, ping"}
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border text-xs text-white placeholder-slate-500 focus:outline-none transition-all ${
                      regexStatus && !regexStatus.valid
                        ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        : "border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    }`}
                  />
                </div>
                {regexStatus && (
                  <p className={`text-[11px] flex items-center gap-1.5 ${regexStatus.valid ? "text-emerald-400" : "text-rose-400"}`}>
                    {regexStatus.valid ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Valid Regular Expression
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" /> Syntax Error: {regexStatus.message}
                      </>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Match Condition
                </label>
                <select
                  value={matchMode}
                  onChange={(e) => setMatchMode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="contains">Message Contains Anywhere</option>
                  <option value="exact">Exact Message Only</option>
                  <option value="startswith">Starts With Phrase</option>
                  <option value="endswith">Ends With Phrase</option>
                  <option value="regex">Regular Expression (Regex)</option>
                </select>
              </div>
            </div>

            {/* Row 2: Server Emoji Reaction Dropdown Picker */}
            <div className="space-y-2" ref={dropdownRef}>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Smile className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Emoji Reactions (Selected: {selectedEmojis.length})</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  The bot will automatically react to the user message with these emojis
                </span>
              </div>

              {/* Selected Emojis Chips & Add Button */}
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-white/10 min-h-[50px] flex flex-wrap items-center gap-2">
                {selectedEmojis.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">No reactions added yet. Pick one below:</span>
                ) : (
                  selectedEmojis.map((em) => (
                    <EmojiBadge
                      key={em}
                      emoji={em}
                      onRemove={handleRemoveEmoji}
                    />
                  ))
                )}

                {/* Dropdown Toggle Trigger Button */}
                <button
                  type="button"
                  onClick={() => setEmojiDropdownOpen(!emojiDropdownOpen)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all ml-auto"
                >
                  <Smile className="w-3.5 h-3.5" />
                  <span>Pick Server Emojis</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${emojiDropdownOpen ? "rotate-180" : ""}`} />
                </button>
              </div>

              {/* Emoji Picker Popover Modal / Dropdown */}
              {emojiDropdownOpen && (
                <div className="p-4 rounded-2xl glass-panel border border-white/15 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 z-30 relative">
                  {/* Search bar inside picker */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search server custom emojis by name..."
                      value={emojiSearch}
                      onChange={(e) => setEmojiSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Section 1: Server Custom Emojis */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                      <span>Server Custom Emojis ({serverEmojis.length})</span>
                      {serverEmojis.length === 0 && (
                        <span className="text-slate-500 lowercase">no custom emojis uploaded to guild</span>
                      )}
                    </div>

                    {filteredServerEmojis.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-500">
                        {serverEmojis.length === 0
                          ? "This server does not have custom emojis yet."
                          : "No server emojis match your search."}
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1">
                        {filteredServerEmojis.map((emoji) => {
                          const isSelected = selectedEmojis.includes(emoji.identifier || emoji.raw);
                          return (
                            <button
                              key={emoji.id}
                              type="button"
                              onClick={() => handleSelectEmoji(emoji.identifier || emoji.raw)}
                              title={`:${emoji.name}: ${emoji.animated ? "(Animated)" : ""}`}
                              className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                                isSelected
                                  ? "bg-indigo-600/30 border-indigo-400 ring-2 ring-indigo-400/40"
                                  : "bg-slate-900/60 border-white/5 hover:border-indigo-500/40 hover:bg-slate-800/80"
                              }`}
                            >
                              <img
                                src={emoji.url}
                                alt={emoji.name}
                                className="w-6 h-6 object-contain"
                                loading="lazy"
                              />
                              <span className="text-[9px] text-slate-400 truncate max-w-full mt-1 font-mono">
                                {emoji.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section 2: Quick Unicode Emojis */}
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                      Standard Unicode Emojis
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_UNICODE_EMOJIS.map((em) => {
                        const isSelected = selectedEmojis.includes(em);
                        return (
                          <button
                            key={em}
                            type="button"
                            onClick={() => handleSelectEmoji(em)}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all ${
                              isSelected
                                ? "bg-indigo-600/30 border border-indigo-400 ring-1 ring-indigo-400"
                                : "bg-slate-900/60 border border-white/5 hover:bg-slate-800 hover:border-white/20"
                            }`}
                          >
                            {em}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Row 3: Response Mode (Plain Text vs Rich Embed) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Response Format</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEmbed(false)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      !isEmbed
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                        : "bg-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    Plain Message
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEmbed(true)}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      isEmbed
                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                        : "bg-white/5 text-slate-400 hover:text-white"
                    }`}
                  >
                    Rich Embed
                  </button>
                </div>
              </div>

              {/* Embed Specific Fields */}
              {isEmbed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 animate-in fade-in">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Embed Title (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 📢 Important Notice"
                      value={embedTitle}
                      onChange={(e) => setEmbedTitle(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300">
                      Embed Image / Banner URL (Optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://example.com/banner.png"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Message Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-300">
                    {isEmbed ? "Embed Description / Content" : "Automated Reply Content"}{" "}
                    {selectedEmojis.length === 0 && <span className="text-rose-400">*</span>}
                  </label>
                  {selectedEmojis.length > 0 && !reply.trim() && (
                    <span className="text-[10px] text-amber-300 font-mono">
                      (Optional: Reactions-only mode active)
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  placeholder={
                    selectedEmojis.length > 0
                      ? "Optional: Leave empty for reaction-only, or enter message..."
                      : "The message text that the bot will respond with..."
                  }
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />

                {/* Variable Quick-Insert Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-slate-400 font-mono">Variables:</span>
                  {[
                    { tag: "{user}", label: "@{user}" },
                    { tag: "{username}", label: "{username}" },
                    { tag: "{server}", label: "{server}" },
                    { tag: "{channel}", label: "{channel}" },
                    { tag: "{memberCount}", label: "{memberCount}" },
                    { tag: "{owner}", label: "@{owner}" },
                    { tag: "{boosts}", label: "{boosts}" },
                  ].map((v) => (
                    <button
                      key={v.tag}
                      type="button"
                      onClick={() => setReply((prev) => (prev ? `${prev} ${v.tag}` : v.tag))}
                      className="px-2 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[10px] font-mono border border-indigo-500/20 transition-colors cursor-pointer"
                      title={`Insert ${v.tag}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 4: Advanced Options (Cooldown, Delete Trigger, Ignore Bots) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                  <span>User Cooldown</span>
                </label>
                <select
                  value={cooldown}
                  onChange={(e) => setCooldown(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value={0}>No Cooldown (0s)</option>
                  <option value={5}>5 Seconds</option>
                  <option value={10}>10 Seconds</option>
                  <option value={30}>30 Seconds</option>
                  <option value={60}>1 Minute</option>
                  <option value={300}>5 Minutes</option>
                </select>
              </div>

              <div className="flex items-center justify-between sm:justify-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-white/5">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-200">Delete Trigger Message</p>
                  <p className="text-[10px] text-slate-400">Deletes user's chat message</p>
                </div>
                <input
                  type="checkbox"
                  checked={deleteTrigger}
                  onChange={(e) => setDeleteTrigger(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-white/20"
                />
              </div>

              <div className="flex items-center justify-between sm:justify-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-white/5">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-200">Ignore Bots</p>
                  <p className="text-[10px] text-slate-400">Prevents bot message loops</p>
                </div>
                <input
                  type="checkbox"
                  checked={ignoreBots}
                  onChange={(e) => setIgnoreBots(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-white/20"
                />
              </div>
            </div>

            {/* Live Discord Chat Simulation Preview */}
            {(trigger.trim() || reply.trim() || selectedEmojis.length > 0) && (
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Live Discord Chat Simulation</span>
                </div>

                {/* User Message */}
                <div className="flex items-start gap-3 pl-2">
                  <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                    U
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-semibold text-xs text-slate-200">Member</span>
                      <span className="text-[10px] text-slate-500">Today at 12:00 PM</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {trigger.trim() || "trigger message"}
                    </p>

                    {/* Reactions below user message */}
                    {selectedEmojis.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {selectedEmojis.map((em, idx) => {
                          const parsed = parseDiscordEmoji(em);
                          return (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#2b2d31] hover:bg-[#35373c] border border-[#3b3e45] text-xs text-slate-200"
                            >
                              {parsed?.isCustom ? (
                                <img src={parsed.url} alt="" className="w-4 h-4 object-contain" />
                              ) : (
                                <span>{em}</span>
                              )}
                              <span className="text-[10px] text-indigo-300 font-semibold font-mono">1</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Bot Response Message (If reply content or embed title present) */}
                {(reply.trim() || embedTitle.trim()) && (
                  <div className="flex items-start gap-3 pl-2 pt-2 border-t border-white/5">
                    <img
                      src={botInfo?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-indigo-500/40"
                    />
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-xs text-indigo-400">
                          {botInfo?.username || "Digital Vigital"}
                        </span>
                        <span className="px-1 py-0.2 rounded bg-[#5865F2] text-[9px] font-bold text-white uppercase">
                          BOT
                        </span>
                        <span className="text-[10px] text-slate-500">Today at 12:00 PM</span>
                      </div>

                      {isEmbed ? (
                        <div className="p-3.5 rounded-lg bg-[#2b2d31] border-l-4 border-indigo-500 max-w-lg space-y-2">
                          {embedTitle && (
                            <h4 className="font-bold text-xs text-white">{embedTitle}</h4>
                          )}
                          <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                            {reply || "Autoresponder reply message content..."}
                          </p>
                          {imageUrl && (
                            <div className="rounded overflow-hidden max-h-48 border border-white/5">
                              <img src={imageUrl} alt="" className="w-full object-cover" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {reply || "Autoresponder reply message content..."}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Reaction-Only Notice (when no reply content/embed is configured) */}
                {selectedEmojis.length > 0 && !reply.trim() && !embedTitle.trim() && (
                  <div className="flex items-center gap-2 pl-2 pt-2 border-t border-white/5 text-xs text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Reaction-Only Rule: DV-BOT will add reactions without posting a message.</span>
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={
                  saving ||
                  !trigger.trim() ||
                  (!reply.trim() && !embedTitle.trim() && selectedEmojis.length === 0) ||
                  (regexStatus && !regexStatus.valid)
                }
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
              >
                {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                <span>
                  {saving
                    ? "Saving Rule..."
                    : editingId
                    ? `Save Changes to Rule #${editingId}`
                    : "Add Autoresponder Rule"}
                </span>
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Existing Rules List */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-base text-white">Configured Autoresponders</h3>
              <p className="text-xs text-slate-400">
                All automated triggers active in this Discord server
              </p>
            </div>

            {/* Filter Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Filter rules by trigger or reply..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-7 h-7 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-400">Loading server autoresponder rules...</p>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <Bot className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-xs">
                {filterSearch ? "No autoresponder rules match your filter." : "No autoresponder rules configured yet."}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredRules.map((rule) => {
                const ruleId = rule.id || rule.responder_id;
                const isRuleActive = rule.enabled !== false;
                const reactions = rule.reactions || rule.emoji_reactions || [];

                return (
                  <div
                    key={ruleId}
                    className={`p-5 rounded-2xl border transition-all ${
                      editingId === ruleId
                        ? "bg-indigo-950/40 border-amber-400/60 ring-2 ring-amber-400/30 shadow-xl shadow-amber-500/5"
                        : isRuleActive
                        ? "bg-slate-900/70 border-white/10 hover:border-indigo-500/30"
                        : "bg-slate-950/40 border-white/5 opacity-60"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      {/* Left: Trigger & Reply Info */}
                      <div className="space-y-2.5 flex-1 min-w-0">
                        {/* Badges Bar */}
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Active / Inactive switch */}
                          <button
                            type="button"
                            onClick={() => handleToggle(ruleId)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all cursor-pointer ${
                              isRuleActive
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-slate-800 text-slate-400 border border-white/10"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isRuleActive ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                            {isRuleActive ? "Active" : "Disabled"}
                          </button>

                          {/* Currently editing badge */}
                          {editingId === ruleId && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                              <Edit2 className="w-2.5 h-2.5" /> Editing
                            </span>
                          )}

                          {/* Match mode badge */}
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono uppercase">
                            {rule.match_mode || rule.match_type || "contains"}
                          </span>

                          {/* Cooldown badge */}
                          {rule.cooldown > 0 && (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" /> {rule.cooldown}s
                            </span>
                          )}

                          {/* Delete Trigger badge */}
                          {rule.delete_trigger && (
                            <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px] font-mono">
                              delete-trigger
                            </span>
                          )}

                          {/* Embed badge */}
                          {rule.is_embed && (
                            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-mono">
                              embed
                            </span>
                          )}
                        </div>

                        {/* Trigger Phrase */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400 font-mono">Trigger:</span>
                          <span className="font-bold text-sm text-white">
                            "{rule.trigger || rule.trigger_phrase}"
                          </span>
                        </div>

                        {/* Emoji Reactions Bar */}
                        {reactions.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span className="text-[10px] text-slate-400 font-mono">Reactions:</span>
                            {reactions.map((em, idx) => (
                              <EmojiBadge key={idx} emoji={em} size="sm" />
                            ))}
                          </div>
                        )}

                        {/* Response Content */}
                        {(rule.reply || rule.reply_content || rule.embed_title) ? (
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                            {rule.embed_title && (
                              <p className="font-semibold text-xs text-indigo-300">
                                {rule.embed_title}
                              </p>
                            )}
                            {(rule.reply || rule.reply_content) && (
                              <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-3">
                                {rule.reply || rule.reply_content}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-white/5 text-slate-400 text-xs italic flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Reaction-only trigger: reacts with emojis without sending text.</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                        <button
                          type="button"
                          onClick={() => handleEditRule(rule)}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            editingId === ruleId
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                          }`}
                          title={editingId === ruleId ? "Currently editing" : "Edit rule"}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(ruleId)}
                          className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                          title="Delete rule"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
