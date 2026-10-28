import React, { useState } from "react";
import { Trash2 } from "lucide-react";

export default function AdminRoleItem({ role, isRemoving, onRemove }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const colorHex = typeof role.color === "string"
    ? (role.color.startsWith("#") ? role.color : `#${role.color}`)
    : typeof role.color === "number" && role.color > 0
    ? `#${role.color.toString(16).padStart(6, '0')}`
    : "#818cf8";

  if (isDeleting) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
        <div>
          <div className="text-sm font-semibold text-slate-200">Revoke dashboard role?</div>
          <div className="text-xs text-slate-400 mt-1">
            Members with <span className="font-bold text-rose-400">@{role.name}</span> will lose dashboard & bot management access.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRemove(role.id)}
            disabled={isRemoving}
            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-sm"
          >
            {isRemoving ? "Revoking..." : "Revoke Access"}
          </button>
          <button
            onClick={() => setIsDeleting(false)}
            disabled={isRemoving}
            className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50 border border-white/10"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: colorHex }}></div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-white flex items-center gap-2 truncate">
            <span>@{role.name}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 font-medium border border-indigo-500/20">
              Dashboard Access
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">{role.id}</div>
        </div>
      </div>
      <button
        onClick={() => setIsDeleting(true)}
        className="p-2 rounded-lg text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors shrink-0"
        title="Revoke Role Access"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
