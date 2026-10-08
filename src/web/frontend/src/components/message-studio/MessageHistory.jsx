import React, { useState } from "react";
import {
  History,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  Copy,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import ConfirmDialog from "../ui/ConfirmDialog";

export default function MessageHistory({
  history = [],
  onLoadPayload,
  onOpenEditModal,
  onDeleteMessage,
  channels = [],
}) {
  const [deleteTarget, setDeleteTarget] = useState(null);

  const getChannelName = (channelId) => {
    const ch = channels.find((c) => c.id === channelId);
    return ch ? ch.name : channelId;
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await onDeleteMessage(deleteTarget.message_id, deleteTarget.channel_id);
    setDeleteTarget(null);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Delivered
          </span>
        );
      case "edited":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400 text-[10px] font-semibold border border-sky-500/20">
            <Edit3 className="w-3 h-3" />
            Edited
          </span>
        );
      case "deleted":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-semibold border border-white/5">
            <Trash2 className="w-3 h-3" />
            Deleted
          </span>
        );
      case "failed":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-[10px] font-semibold border border-rose-500/20">
            <AlertCircle className="w-3 h-3" />
            Failed
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
            Publishing History
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Last {history.length} operations
        </span>
      </div>

      {history.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-center">
          <p className="text-xs text-slate-500">No published messages recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {history.map((item) => {
            const hasMessageId = Boolean(item.message_id && item.status !== "deleted");
            const payload = item.payload || {};
            const snippet =
              payload.content ||
              payload.embeds?.[0]?.title ||
              payload.embeds?.[0]?.description ||
              "No preview text";

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-white/10 transition-all flex flex-col gap-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getStatusBadge(item.status)}
                    <span className="text-xs font-semibold text-white">
                      #{getChannelName(item.channel_id)}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Recently"}
                  </span>
                </div>

                <p className="text-xs text-slate-300 line-clamp-1 italic">
                  "{snippet.length > 80 ? snippet.slice(0, 80) + "..." : snippet}"
                </p>

                {item.error_message && (
                  <p className="text-[11px] text-rose-400 bg-rose-500/10 p-1.5 rounded border border-rose-500/20">
                    {item.error_message}
                  </p>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-500 font-mono">
                    {item.message_id ? (
                      <span>ID: {String(item.message_id).slice(-6)}</span>
                    ) : (
                      <span>ID: None</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Load Back into Editor */}
                    <button
                      type="button"
                      onClick={() => onLoadPayload({ ...(item.payload || {}), channel_id: item.channel_id })}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-indigo-400 hover:text-white hover:bg-white/5 transition-colors"
                      title="Load this message back into the editor"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Load</span>
                    </button>

                    {/* Edit Published Message */}
                    {hasMessageId && (
                      <button
                        type="button"
                        onClick={() => onOpenEditModal(item)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-sky-400 hover:text-white hover:bg-white/5 transition-colors"
                        title="Edit live message in Discord"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Live</span>
                      </button>
                    )}

                    {/* Delete Published Message */}
                    {hasMessageId && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                        title="Delete live message from Discord"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete Live</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Published Discord Message"
        description="Are you sure you want to permanently delete this message from Discord? The bot will remove it from the channel."
        confirmText="Delete from Discord"
        danger={true}
      />
    </div>
  );
}
