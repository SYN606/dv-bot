import React, { useState } from "react";
import { FileEdit, Trash2, ArrowRight, Clock, Plus } from "lucide-react";
import ConfirmDialog from "../ui/ConfirmDialog";

export default function MessageDraftLibrary({
  drafts = [],
  onLoadDraft,
  onDeleteDraft,
  onNewDraft,
  activeDraftId,
}) {
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    await onDeleteDraft(deleteTargetId);
    setDeleteTargetId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Saved Drafts</span>
        <button
          type="button"
          onClick={onNewDraft}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Blank</span>
        </button>
      </div>

      {drafts.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-center">
          <p className="text-xs text-slate-500">No saved drafts found for this server.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {drafts.map((draft) => {
            const isActive = activeDraftId === draft.id;
            return (
              <div
                key={draft.id}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 group ${
                  isActive
                    ? "bg-indigo-600/15 border-indigo-500/40 ring-1 ring-indigo-500/30"
                    : "bg-slate-900/60 border-white/5 hover:border-white/10 hover:bg-slate-900/90"
                }`}
              >
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onLoadDraft(draft)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-xs text-white truncate">
                      {draft.name || "Untitled Message"}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] uppercase font-mono text-indigo-300">
                      {draft.mode || "normal"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>
                      Rev #{draft.revision || 1} •{" "}
                      {draft.updated_at
                        ? new Date(draft.updated_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })
                        : "Draft"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onLoadDraft(draft)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Load into editor"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(draft.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete draft"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Delete Message Draft"
        description="Are you sure you want to delete this draft? This action cannot be undone."
        confirmText="Delete Draft"
        danger={true}
      />
    </div>
  );
}
