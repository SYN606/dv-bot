import React from "react";
import Badge from "../ui/Badge";
import { Pin } from "lucide-react";

export default function StickyNoticeItem({ notice, channelName, onEdit, onDelete, isDeleting }) {
  const rawContent = notice.content || notice.sticky_content || "";
  const contentPreview = rawContent.length > 120 
    ? rawContent.substring(0, 120) + "..."
    : rawContent;

  const repins = Number(notice.repins || notice.counter || 0);

  return (
    <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row md:items-start justify-between gap-6 hover:border-white/10 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2.5 mb-2">
          <div className="flex items-center gap-1.5 font-bold text-white text-base truncate">
            <Pin className="w-4 h-4 text-brand-crimson shrink-0" />
            <span>#{channelName || `channel-${notice.channel_id?.slice(-4)}`}</span>
          </div>

          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>

          <Badge variant="default" className="text-[10px] font-mono">
            {repins.toLocaleString()} repin{repins === 1 ? "" : "s"}
          </Badge>
        </div>
        
        <p className="text-sm text-slate-300 wrap-break-word whitespace-pre-wrap leading-relaxed max-w-3xl">
          {contentPreview || <span className="text-slate-500 italic">No content</span>}
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
