import React, { useState, useEffect } from "react";
import { CornerUpLeft, Search, Check, AlertCircle, X, Bell, BellOff, ArrowRight } from "lucide-react";
import { validateMessageStudioReply } from "../../api/client";

export default function ReplyMessageSelector({
  guildId,
  replyConfig = {},
  onChangeReplyConfig,
  currentChannelId,
  onSelectChannel,
}) {
  const [urlInput, setUrlInput] = useState(replyConfig.message_url || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(replyConfig.preview || null);

  // Sync state when replyConfig prop changes (e.g. on loading drafts, templates, or new canvas)
  useEffect(() => {
    setUrlInput(replyConfig.message_url || "");
    setPreview(replyConfig.preview || null);
    if (!replyConfig.enabled) {
      setError(null);
    }
  }, [replyConfig.message_url, replyConfig.preview, replyConfig.enabled]);

  const isEnabled = Boolean(replyConfig.enabled);

  const handleToggle = (enabled) => {
    onChangeReplyConfig({
      ...replyConfig,
      enabled,
    });
  };

  const handleVerify = async () => {
    if (!urlInput.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await validateMessageStudioReply(guildId, urlInput.trim());
      if (res.valid) {
        setPreview(res);
        onChangeReplyConfig({
          enabled: true,
          message_url: urlInput.trim(),
          guild_id: res.guildId,
          channel_id: res.channelId,
          message_id: res.messageId,
          mention_user: Boolean(replyConfig.mention_user),
          preview: res,
        });
      } else {
        setError(res.error || "Could not fetch message.");
      }
    } catch (err) {
      setError(err?.message || "Failed to validate Discord message link.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setUrlInput("");
    setPreview(null);
    setError(null);
    onChangeReplyConfig({
      enabled: false,
      message_url: "",
      channel_id: null,
      message_id: null,
      mention_user: false,
      preview: null,
    });
  };

  const handleToggleMention = () => {
    onChangeReplyConfig({
      ...replyConfig,
      mention_user: !replyConfig.mention_user,
    });
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 space-y-3">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CornerUpLeft className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wide">Reply to Message</span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => handleToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {isEnabled && (
        <div className="space-y-3 pt-1">
          {/* URL Input Row */}
          <div className="flex gap-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              placeholder="https://discord.com/channels/123.../456.../789..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
            <button
              type="button"
              disabled={loading || !urlInput.trim()}
              onClick={handleVerify}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-40 transition-colors flex items-center gap-1.5 shrink-0"
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Verify</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Validated Message Preview Card */}
          {preview && (
            <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-2 relative">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {preview.author?.avatar ? (
                    <img
                      src={preview.author.avatar}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-800 shrink-0" />
                  )}
                  <span className="font-bold text-xs text-white">
                    @{preview.author?.username}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    in #{preview.channelName}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleClear}
                  title="Remove reply"
                  className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-xs text-slate-300 italic pl-7 border-l-2 border-slate-700 max-h-16 overflow-y-auto">
                "{preview.contentSnippet}"
              </p>

              {/* Channel Mismatch Notification */}
              {currentChannelId && preview.channelId && currentChannelId !== preview.channelId && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-[11px] text-amber-300">
                  <span>Target message is in #{preview.channelName}.</span>
                  <button
                    type="button"
                    onClick={() => onSelectChannel?.(preview.channelId)}
                    className="inline-flex items-center gap-1 font-semibold text-indigo-400 hover:text-indigo-300 underline"
                  >
                    <span>Switch channel</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Mention Replied User Toggle */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  {replyConfig.mention_user ? (
                    <Bell className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <BellOff className="w-3.5 h-3.5 text-slate-500" />
                  )}
                  <span>Ping user on reply</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleMention}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    replyConfig.mention_user
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                      : "bg-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {replyConfig.mention_user ? "Ping: ON" : "Ping: OFF (Recommended)"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
