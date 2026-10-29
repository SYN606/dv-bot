import React, { useState, useEffect } from "react";
import { Send, AlertTriangle, CheckCircle, Hash, X, ShieldAlert } from "lucide-react";

export default function PublishDialog({
  isOpen,
  onClose,
  onConfirmPublish,
  targetChannel,
  payload,
  replyConfig,
}) {
  const [loading, setLoading] = useState(false);
  const [mentionUsers, setMentionUsers] = useState(
    payload?.mention_config?.allowUsers !== undefined ? Boolean(payload.mention_config.allowUsers) : true
  );
  const [mentionRoles, setMentionRoles] = useState(Boolean(payload?.mention_config?.allowRoles));
  const [mentionEveryone, setMentionEveryone] = useState(Boolean(payload?.mention_config?.allowEveryone));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setMentionUsers(
        payload?.mention_config?.allowUsers !== undefined ? Boolean(payload.mention_config.allowUsers) : true
      );
      setMentionRoles(Boolean(payload?.mention_config?.allowRoles));
      setMentionEveryone(Boolean(payload?.mention_config?.allowEveryone));
      setError(null);
    }
  }, [isOpen, payload?.mention_config]);

  if (!isOpen) return null;

  const handlePublish = async () => {
    if (!targetChannel?.id) {
      setError("Please select a target destination channel first.");
      return;
    }

    setLoading(true);
    setError(null);

    const idempotencyKey = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const publishPayload = {
        ...payload,
        idempotencyKey,
        mention_config: {
          allowUsers: mentionUsers,
          allowRoles: mentionRoles,
          allowEveryone: mentionEveryone,
        },
      };

      await onConfirmPublish(publishPayload);
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to publish message.");
    } finally {
      setLoading(false);
    }
  };

  const mode = payload?.mode || "normal";
  const embedsCount = Array.isArray(payload?.embeds) ? payload.embeds.length : 0;
  const isReplyActive = Boolean(replyConfig?.enabled && replyConfig?.message_id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Publish to Discord</h3>
              <p className="text-xs text-slate-400">Review message targets and mention settings</p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Target Channel Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Destination:</span>
            <div className="flex items-center gap-1.5 font-bold text-white">
              <Hash className="w-3.5 h-3.5 text-indigo-400" />
              <span>#{targetChannel?.name || "Unselected Channel"}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Message Format:</span>
            <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] font-mono uppercase text-indigo-300">
              {mode} mode {mode !== "normal" && `(${embedsCount} embeds)`}
            </span>
          </div>

          {isReplyActive && (
            <div className="flex items-center justify-between text-xs text-emerald-400">
              <span>Reply Reference:</span>
              <span className="text-[11px] font-mono">
                Active (ID: {String(replyConfig.message_id).slice(-6)})
              </span>
            </div>
          )}

          {targetChannel && targetChannel.canSend === false && (
            <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <p className="font-semibold">Missing Bot Permissions</p>
                <p className="text-[11px] text-amber-400/80 mt-0.5">
                  The bot may lack permissions in #{targetChannel.name}: {targetChannel.missingPermissions?.join(", ") || "Send Messages"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Mention Controls */}
        <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-3">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide block">
            Allowed Mentions & Pings
          </span>

          <div className="space-y-2">
            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={mentionUsers}
                onChange={(e) => setMentionUsers(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Allow user mentions (<code className="text-[11px] text-slate-400 font-mono">@username</code>)</span>
            </label>

            <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={mentionRoles}
                onChange={(e) => setMentionRoles(e.target.checked)}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Allow role mentions (<code className="text-[11px] text-slate-400 font-mono">@Role</code>)</span>
            </label>

            <div className="pt-2 border-t border-white/5">
              <label className="flex items-start gap-2.5 text-xs text-rose-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={mentionEveryone}
                  onChange={(e) => setMentionEveryone(e.target.checked)}
                  className="rounded border-rose-500 text-rose-600 focus:ring-rose-500 mt-0.5"
                />
                <div>
                  <div className="flex items-center gap-1 font-semibold text-rose-400">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Allow @everyone and @here pings</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Leave disabled unless this is an intentional server-wide announcement.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handlePublish}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Publish Message</span>
          </button>
        </div>
      </div>
    </div>
  );
}
