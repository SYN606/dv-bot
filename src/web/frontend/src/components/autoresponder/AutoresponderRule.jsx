import React, { useState } from "react";
import { Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { EmojiBadge } from "../discord";

export default function AutoresponderRule({ rule, isEditing, onEdit, onToggle, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (isDeleting) {
    return (
      <div className="glass-panel p-5 rounded-2xl border border-brand-crimson/50 bg-brand-crimson/5 space-y-4">
        <div className="text-sm text-slate-200">
          Delete autoresponder for <span className="font-mono text-brand-crimson font-bold">"{rule.trigger}"</span>?
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onDelete(rule.id)}
            className="px-4 py-1.5 rounded-lg bg-brand-crimson hover:bg-brand-crimson-dark text-white text-xs font-semibold transition-colors"
          >
            Confirm Delete
          </button>
          <button
            onClick={() => setIsDeleting(false)}
            className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors border border-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card p-5 rounded-2xl border transition-colors ${isEditing ? "border-indigo-500/50 bg-indigo-500/5" : "border-white/5 hover:bg-white/[0.02]"}`}>
      <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-start">
        <div className="space-y-3 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white truncate break-words font-sans">{rule.trigger}</span>
            {!rule.enabled && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400">Disabled</span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-500">
            <span className="uppercase text-slate-400 font-semibold">{rule.matchMode}</span>
            <span>•</span>
            <span>{rule.cooldown}s cooldown</span>
            {rule.deleteTrigger && (
              <>
                <span>•</span>
                <span>Auto-delete</span>
              </>
            )}
            {rule.ignoreBots && (
              <>
                <span>•</span>
                <span>Ignore bots</span>
              </>
            )}
          </div>

          {(rule.reply || rule.embedTitle) && (
            <div className="text-sm text-slate-300 bg-slate-900/50 p-3 rounded-lg border border-white/5 break-words">
              {rule.isEmbed && (
                <div className="mb-1 text-xs font-mono text-indigo-400 uppercase tracking-widest">[ Embed ]</div>
              )}
              {rule.isEmbed && rule.embedTitle && (
                <div className="font-bold mb-1">{rule.embedTitle}</div>
              )}
              <div className="whitespace-pre-wrap opacity-90">{rule.reply}</div>
            </div>
          )}

          {rule.reactions?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {rule.reactions.map((emojiStr, i) => (
                <EmojiBadge key={i} emoji={emojiStr} size="sm" />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center sm:flex-col gap-2 shrink-0">
          <button
            onClick={() => onToggle(rule.id, rule.enabled)}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors w-full sm:w-28 ${
              rule.enabled 
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20" 
                : "bg-slate-800 text-slate-400 border-white/5 hover:bg-slate-700"
            }`}
          >
            {rule.enabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
            {rule.enabled ? "Enabled" : "Disabled"}
          </button>
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={() => onEdit(rule)}
              disabled={isEditing}
              className="flex-1 flex items-center justify-center gap-1.5 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors disabled:opacity-50 border border-white/5"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsDeleting(true)}
              className="flex-1 flex items-center justify-center gap-1.5 p-1.5 rounded-lg bg-white/5 hover:bg-brand-crimson hover:text-white text-slate-400 transition-colors border border-white/5"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
