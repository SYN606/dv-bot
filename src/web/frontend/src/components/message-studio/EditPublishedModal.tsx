import React, { useState, useEffect } from "react";
import { Edit3, X, Save } from "lucide-react";

export default function EditPublishedModal({
  isOpen,
  onClose,
  historyItem,
  onConfirmEdit,
  channels = [],
}) {
  const [content, setContent] = useState(historyItem?.payload?.content || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (historyItem) {
      setContent(historyItem.payload?.content || "");
      setError(null);
    }
  }, [historyItem]);

  if (!isOpen || !historyItem) return null;

  const channel = channels.find((c) => c.id === historyItem.channel_id);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const updatedPayload = {
        ...(historyItem.payload || {}),
        content,
      };
      await onConfirmEdit(historyItem.message_id, historyItem.channel_id, updatedPayload);
      onClose();
    } catch (err) {
      setError(err?.message || "Failed to update Discord message.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit Published Message</h3>
              <p className="text-xs text-slate-400">
                Update live text content for message <code className="text-sky-300 font-mono">#{String(historyItem.message_id || "").slice(-6)}</code> in #{channel?.name || historyItem.channel_id}
              </p>
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

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-300">Message Content</label>
          <textarea
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono resize-y"
            placeholder="Edit text content..."
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

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
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition-all disabled:opacity-40"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Update Message</span>
          </button>
        </div>
      </div>
    </div>
  );
}
