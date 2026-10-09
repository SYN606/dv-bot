import React, { useState } from "react";
import { Copy, Trash2, ArrowRight, Search, Bookmark, BookmarkPlus } from "lucide-react";
import ConfirmDialog from "../ui/ConfirmDialog";

export default function MessageTemplateLibrary({
  templates = [],
  onLoadTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onOpenSaveTemplateModal,
}) {
  const [search, setSearch] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const q = search.trim().toLowerCase();
  const filtered = templates.filter((tpl) => {
    if (!q) return true;
    return (
      tpl.name?.toLowerCase().includes(q) ||
      tpl.description?.toLowerCase().includes(q)
    );
  });

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    await onDeleteTemplate(deleteTargetId);
    setDeleteTargetId(null);
  };

  const getModeBadge = (mode) => {
    switch (mode) {
      case "embed":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "hybrid":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "normal":
      default:
        return "bg-slate-800 text-slate-400 border-white/5";
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
            Saved Templates ({templates.length})
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenSaveTemplateModal}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors border border-emerald-500/20 shadow-sm"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          <span>Save As Template</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search templates by name..."
          className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {/* Template List */}
      {filtered.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-slate-800/80 text-slate-500 flex items-center justify-center mx-auto">
            <Bookmark className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-slate-400">
            {search ? "No templates match your search." : "No templates saved yet."}
          </p>
          <p className="text-[11px] text-slate-600">
            {search
              ? "Try typing another keyword."
              : "Design a message and click 'Save As Template' to reuse it anytime."}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {filtered.map((tpl) => (
            <div
              key={tpl.id}
              className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-emerald-500/30 hover:bg-slate-900/90 transition-all flex items-start justify-between gap-3 group"
            >
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onLoadTemplate(tpl)}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Bookmark className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-bold text-xs text-white truncate group-hover:text-emerald-300 transition-colors">
                    {tpl.name}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-mono uppercase font-bold border ${getModeBadge(
                      tpl.mode
                    )}`}
                  >
                    {tpl.mode || "normal"}
                  </span>
                </div>
                {tpl.description ? (
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {tpl.description}
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-600 italic">No description provided</p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                <button
                  type="button"
                  onClick={() => onLoadTemplate(tpl)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 transition-colors text-xs font-semibold"
                  title="Load template into editor"
                >
                  <span>Load</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicateTemplate(tpl.id)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  title="Duplicate template"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(tpl.id)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Delete template"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Delete Reusable Template"
        description="Are you sure you want to delete this template? Any previously published messages will remain unaffected."
        confirmText="Delete Template"
        danger={true}
      />
    </div>
  );
}
