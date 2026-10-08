import React, { useState } from "react";
import { Copy, Trash2, ArrowRight, Search, Bookmark, BookmarkPlus } from "lucide-react";
import ConfirmDialog from "../ui/ConfirmDialog";

const CATEGORIES = ["All", "General", "Announcements", "Rules", "Events", "Welcome"];

export default function MessageTemplateLibrary({
  templates = [],
  onLoadTemplate,
  onDuplicateTemplate,
  onDeleteTemplate,
  onOpenSaveTemplateModal,
}) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const filtered = templates.filter((tpl) => {
    const matchesCat =
      selectedCategory === "All" ||
      String(tpl.category || "General").toLowerCase() === selectedCategory.toLowerCase();
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      tpl.name?.toLowerCase().includes(q) ||
      tpl.description?.toLowerCase().includes(q) ||
      tpl.category?.toLowerCase().includes(q);
    return matchesCat && matchesSearch;
  });

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    await onDeleteTemplate(deleteTargetId);
    setDeleteTargetId(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
          Message Templates
        </span>
        <button
          type="button"
          onClick={onOpenSaveTemplateModal}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold transition-colors"
        >
          <BookmarkPlus className="w-3.5 h-3.5" />
          <span>Save As Template</span>
        </button>
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-white/5 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors shrink-0 ${
                selectedCategory === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900/60 text-slate-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Template List */}
      {filtered.length === 0 ? (
        <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 text-center">
          <p className="text-xs text-slate-500">No matching templates found.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {filtered.map((tpl) => (
            <div
              key={tpl.id}
              className="p-3 rounded-xl bg-slate-900/60 border border-white/5 hover:border-white/10 hover:bg-slate-900/90 transition-all flex items-start justify-between gap-2 group"
            >
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => onLoadTemplate(tpl)}
              >
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <Bookmark className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-xs text-white truncate">{tpl.name}</span>
                  <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">
                    {tpl.category || "General"}
                  </span>
                </div>
                {tpl.description && (
                  <p className="text-[11px] text-slate-400 line-clamp-1 mb-1">{tpl.description}</p>
                )}
                <span className="text-[10px] uppercase font-mono text-indigo-400">
                  {tpl.mode || "normal"} mode
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                <button
                  type="button"
                  onClick={() => onLoadTemplate(tpl)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  title="Load into editor"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDuplicateTemplate(tpl.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                  title="Duplicate template"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTargetId(tpl.id)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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
        description="Are you sure you want to delete this template? Other saved messages will not be affected."
        confirmText="Delete Template"
        danger={true}
      />
    </div>
  );
}
