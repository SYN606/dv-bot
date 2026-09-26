import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getGuildMeta,
  getSticky,
  saveSticky,
  deleteSticky,
  getGuildEmojis,
} from "../api/client";
import {
  Pin,
  Trash2,
  Check,
  Eye,
  Plus,
  Edit3,
  Smile,
  ImageIcon,
  Sparkles,
  Search,
  AlertCircle,
  HelpCircle,
  RefreshCw,
} from "lucide-react";

const IMAGE_URL_REGEX = /(https?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp)(?:\?\S+)?)/i;

export default function StickyPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  const [channels, setChannels] = useState([]);
  const [stickyList, setStickyList] = useState([]);
  const [serverEmojis, setServerEmojis] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Form states
  const [selectedChannel, setSelectedChannel] = useState("");
  const [content, setContent] = useState("");
  const [postNow, setPostNow] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const textareaRef = useRef(null);

  const loadData = async () => {
    try {
      const [meta, stickyRes, emojisRes] = await Promise.all([
        getGuildMeta(guildId),
        getSticky(guildId),
        getGuildEmojis(guildId).catch(() => []),
      ]);

      const chList = meta.channels || [];
      setChannels(chList);
      setStickyList(stickyRes?.stickyList || []);
      setServerEmojis(Array.isArray(emojisRes) ? emojisRes : []);

      if (chList.length > 0 && !selectedChannel) {
        setSelectedChannel(chList[0].id);
      }
    } catch (err) {
      console.error(err);
      showToast?.("Failed to load sticky messages data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  // When selected channel changes, check if it has an existing sticky notice
  useEffect(() => {
    if (!selectedChannel) return;
    const existing = stickyList.find((s) => s.channel_id === selectedChannel);
    if (existing) {
      setContent(existing.content || existing.sticky_content || "");
      setEditingId(existing.id || existing.channel_id);
    } else {
      setContent("");
      setEditingId(null);
    }
  }, [selectedChannel, stickyList]);

  const handleSelectChannelToEdit = (stickyItem) => {
    setSelectedChannel(stickyItem.channel_id);
    setContent(stickyItem.content || stickyItem.sticky_content || "");
    setEditingId(stickyItem.id || stickyItem.channel_id);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleResetForm = () => {
    const unconfigured = channels.find(
      (ch) => !stickyList.some((s) => s.channel_id === ch.id)
    );
    if (unconfigured) {
      setSelectedChannel(unconfigured.id);
    }
    setContent("");
    setEditingId(null);
  };

  const handleInsertEmoji = (emoji) => {
    const emojiCode = emoji.raw || `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}> `;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const newText = content.substring(0, start) + emojiCode + content.substring(end);
      setContent(newText);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emojiCode.length;
        textarea.focus();
      }, 0);
    } else {
      setContent((prev) => prev + " " + emojiCode);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedChannel) {
      showToast?.("Please select a target channel.", "error");
      return;
    }
    if (!content.trim()) {
      showToast?.("Please enter sticky message content.", "error");
      return;
    }

    setSaving(true);
    try {
      await saveSticky(guildId, {
        channelId: selectedChannel,
        content: content.trim(),
        post_now: postNow,
      });

      showToast(
        postNow
          ? "Sticky notice saved and deployed to channel!"
          : "Sticky notice saved (will pin on next message)."
      );
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to save sticky notice.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (channelIdToDelete) => {
    const targetId = channelIdToDelete || selectedChannel;
    if (!targetId) return;

    try {
      await deleteSticky(guildId, targetId);
      showToast("Sticky notice removed and cleaned up from channel.");
      if (targetId === selectedChannel) {
        setContent("");
        setEditingId(null);
      }
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to delete sticky notice.", "error");
    }
  };

  // Preview computations
  const imgMatch = content.match(IMAGE_URL_REGEX);
  const previewImage = imgMatch ? imgMatch[1] : null;
  const previewText = previewImage ? content.replace(previewImage, "").trim() : content.trim();

  // Channel lookup map
  const channelMap = new Map(channels.map((c) => [c.id, c.name]));
  const totalRepins = stickyList.reduce((sum, item) => sum + (item.counter || 0), 0);

  const filteredStickyList = stickyList.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const chName = (channelMap.get(s.channel_id) || s.channelName || "").toLowerCase();
    const text = (s.content || s.sticky_content || "").toLowerCase();
    return chName.includes(q) || text.includes(q) || s.channel_id.includes(q);
  });

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Sticky Channel Notice"]}
    >
      <div className="space-y-6">
        {/* Header & Metrics Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-600/30 to-blue-600/30 border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <Pin className="w-6 h-6" />
              </div>
              <span>Sticky Channel Notice</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Set persistent channel announcements directly from the dashboard that automatically delete and re-pin to the bottom of the conversation when members chat.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-2xl bg-slate-900/80 border border-white/5 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Active Notices</p>
                <p className="text-sm font-bold text-white">{stickyList.length} Channels</p>
              </div>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-slate-900/80 border border-white/5 flex items-center gap-3">
              <RefreshCw className="w-4 h-4 text-indigo-400" />
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Total Repins</p>
                <p className="text-sm font-bold text-white">{totalRepins.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid: Form + Live Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Form Card (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-4">
            <form onSubmit={handleSave} className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-bold text-sm text-white">
                    {editingId ? "Edit Sticky Notice" : "Configure Sticky Notice"}
                  </h3>
                </div>
                {editingId && (
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Sticky</span>
                  </button>
                )}
              </div>

              {/* Target Channel */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Text Channel
                </label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {channels.map((ch) => {
                    const hasSticky = stickyList.some((s) => s.channel_id === ch.id);
                    return (
                      <option key={ch.id} value={ch.id}>
                        #{ch.name} {hasSticky ? "• [Active Sticky]" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Notice Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Sticky Notice Content (Markdown & Media Supported)
                  </label>
                  {serverEmojis.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                    >
                      <Smile className="w-3.5 h-3.5" />
                      <span>{showEmojiPicker ? "Hide Emojis" : "Insert Emoji"}</span>
                    </button>
                  )}
                </div>

                {/* Custom Server Emojis Quick Picker */}
                {showEmojiPicker && serverEmojis.length > 0 && (
                  <div className="mb-3 p-3 rounded-xl bg-slate-900/90 border border-white/10 max-h-36 overflow-y-auto">
                    <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
                      Click to insert custom server emoji
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {serverEmojis.map((emoji) => (
                        <button
                          key={emoji.id}
                          type="button"
                          onClick={() => handleInsertEmoji(emoji)}
                          className="p-1 rounded-lg hover:bg-white/10 transition-colors inline-flex items-center justify-center"
                          title={emoji.name}
                        >
                          <img
                            src={emoji.url}
                            alt={emoji.name}
                            className="w-5 h-5 object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="e.g. 📌 Welcome to the server! Please review #rules before participating. Keep discussions respectful and relevant."
                  className="w-full p-4 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans leading-relaxed"
                />

                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 font-mono">
                  <span>
                    Tip: Paste an image link (e.g. <code>https://.../banner.png</code>) to auto-render an embed banner.
                  </span>
                  <span>{content.length} chars</span>
                </div>
              </div>

              {/* Immediate Deploy Option */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <input
                  type="checkbox"
                  id="postNowCheckbox"
                  checked={postNow}
                  onChange={(e) => setPostNow(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 focus:ring-offset-slate-900 bg-slate-800 border-white/20"
                />
                <label htmlFor="postNowCheckbox" className="text-xs text-slate-300 cursor-pointer select-none">
                  <span className="font-semibold text-white">Deploy notice immediately</span>
                  <span className="block text-[11px] text-slate-400">
                    Sends or refreshes the notice in the channel immediately upon saving.
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedChannel)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Sticky</span>
                  </button>
                ) : (
                  <div />
                )}

                <button
                  type="submit"
                  disabled={saving || !content.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 transition-all disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : editingId ? "Update Sticky" : "Save Sticky"}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Discord Embed Live Preview (5 cols on lg) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>Discord Notice Live Preview</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  #{channelMap.get(selectedChannel) || "channel"}
                </span>
              </div>

              {/* Discord Embed Mockup */}
              <div className="p-4 rounded-2xl bg-[#2b2d31] border-l-4 border-indigo-500 shadow-2xl space-y-2.5 select-none">
                <div className="flex items-center gap-2">
                  <span className="text-sm">📌</span>
                  <span className="font-bold text-xs text-white">
                    Sticky Message
                  </span>
                </div>

                <div className="text-xs text-[#dbdee1] whitespace-pre-wrap leading-relaxed">
                  {previewText ? (
                    previewText.split(/(<a?:[^:]+:\d+>)/g).map((part, i) => {
                      const match = part.match(/<(a?):([^:]+):(\d+)>/);
                      if (match) {
                        const ext = match[1] === "a" ? "gif" : "png";
                        return <img key={i} src={`https://cdn.discordapp.com/emojis/${match[3]}.${ext}`} alt={match[2]} className="w-4 h-4 inline-block align-middle mx-0.5" />;
                      }
                      return <span key={i}>{part}</span>;
                    })
                  ) : (
                    "📌 Welcome! Please read the guidelines and keep discussions on topic."
                  )}
                </div>

                {previewImage && (
                  <div className="pt-1.5 rounded-xl overflow-hidden max-h-48">
                    <img
                      src={previewImage}
                      alt="Sticky Banner"
                      className="w-full object-cover rounded-xl border border-white/10"
                      onError={(e) => (e.target.style.display = "none")}
                    />
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between text-[10px] text-[#949ba4] font-mono">
                  <span>{botInfo?.username || "Digital Vigital"}</span>
                  <span>Auto-Repinning Notice</span>
                </div>
              </div>

              {/* Mechanism Explanation */}
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>How Sticky Notices Work</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Whenever conversation occurs in the target channel, the bot automatically deletes the previous notice and posts a fresh copy at the very bottom.
                </p>
                <p className="text-[11px] leading-relaxed">
                  Chat bursts are automatically debounced (3-second cooldown) to prevent spam loops or Discord API rate limits.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Sticky Notices Section */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Pin className="w-4 h-4 text-cyan-400" />
                <span>Active Sticky Notices in Server</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Overview of all channels with persistent sticky announcements configured.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by channel or text..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {filteredStickyList.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500 space-y-2">
              <AlertCircle className="w-8 h-8 mx-auto text-slate-600" />
              <p>
                {searchQuery
                  ? "No sticky notices matched your filter."
                  : "No sticky notices configured yet. Select a channel above to create your first notice!"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 pt-1">
              {filteredStickyList.map((item) => {
                const channelName = channelMap.get(item.channel_id) || item.channelName || item.channel_id;
                const isCurrent = item.channel_id === selectedChannel;

                return (
                  <div
                    key={item.id || item.channel_id}
                    className={`p-4 rounded-2xl bg-slate-900/70 border transition-all flex flex-col justify-between gap-3 ${
                      isCurrent
                        ? "border-cyan-500/40 ring-1 ring-cyan-500/20"
                        : "border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-cyan-300 truncate">
                          #{channelName}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                          {item.counter || 0} repins
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed font-sans">
                        {item.content || item.sticky_content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[10px] font-mono text-slate-500 truncate max-w-[140px]">
                        ID: {item.channel_id}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleSelectChannelToEdit(item)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs inline-flex items-center gap-1"
                          title="Edit in form"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span className="text-[11px]">Edit</span>
                        </button>
                        <button
                          onClick={() => handleDelete(item.channel_id)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                          title="Delete Sticky"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
