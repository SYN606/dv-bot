import React from "react";
import Badge from "../ui/Badge";

export default function StickyNoticeItem({ notice, channelName, onEdit, onDelete, isDeleting }) {
  const contentPreview = notice.content.length > 100 
    ? notice.content.substring(0, 100) + "..."
    : notice.content;

  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-start justify-between gap-6 hover:border-white/10 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h4 className="text-lg font-bold text-white truncate">#{channelName || "unknown-channel"}</h4>
          <Badge variant="default" className="text-[10px]">
            {notice.repins || 0} repins
          </Badge>
          {notice.post_now && (
            <Badge variant="success" className="text-[10px]">
              Deploy immediately
            </Badge>
          )}
        </div>
        
        <p className="text-sm text-slate-300 wrap-break-word whitespace-pre-wrap leading-relaxed max-w-3xl">
          {contentPreview}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0 md:flex-col lg:flex-row">
        <button
          onClick={() => onEdit(notice)}
          className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(notice.channel_id)}
          disabled={isDeleting}
          className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          {isDeleting ? "Removing..." : "Remove"}
        </button>
      </div>
    </div>
  );
}
