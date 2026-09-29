import React, { useState } from "react";
import { Trash2 } from "lucide-react";

export default function AdminRoleItem({ role, isRemoving, onRemove }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const colorHex = role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#94a3b8';

  if (isDeleting) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-brand-crimson/5 border border-brand-crimson/30">
        <div>
          <div className="text-sm font-semibold text-slate-200">Revoke staff role?</div>
          <div className="text-xs text-slate-400 mt-1">
            Members with <span className="font-bold text-brand-crimson">@{role.name}</span> will lose bot access.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRemove(role.id)}
            disabled={isRemoving}
            className="px-4 py-1.5 rounded-lg bg-brand-crimson hover:bg-brand-crimson-dark text-white text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {isRemoving ? "Revoking..." : "Revoke Role"}
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
    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 hover:bg-slate-900 border border-white/5 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorHex }}></div>
        <div>
          <div className="text-sm font-bold text-white">{role.name}</div>
          <div className="text-[10px] text-slate-500 font-mono">{role.id}</div>
        </div>
      </div>
      <button
        onClick={() => setIsDeleting(true)}
        className="p-2 rounded-lg text-slate-400 hover:bg-brand-crimson hover:text-white transition-colors"
        title="Revoke Role Access"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
