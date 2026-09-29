import React, { useState } from "react";
import { Trash2, ShieldAlert } from "lucide-react";
import { getDiscordAvatarUrl } from "../../utils/discord";

export default function AdminUserItem({ user, isRemoving, onRemove }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const avatar = getDiscordAvatarUrl(user);

  if (isDeleting) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-brand-crimson/5 border border-brand-crimson/30">
        <div>
          <div className="text-sm font-semibold text-slate-200">Revoke admin access?</div>
          <div className="text-xs text-slate-400 mt-1">
            <span className="font-bold text-brand-crimson">{user.username}</span> will lose bot administration access.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRemove(user.id)}
            disabled={isRemoving}
            className="px-4 py-1.5 rounded-lg bg-brand-crimson hover:bg-brand-crimson-dark text-white text-xs font-semibold transition-colors disabled:opacity-50"
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
    <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/40 hover:bg-slate-900 border border-white/5 transition-colors">
      <div className="flex items-center gap-3">
        <img src={avatar} alt="Admin" className="w-10 h-10 rounded-full border border-white/10" />
        <div>
          <div className="text-sm font-bold text-white flex items-center gap-2">
            {user.globalName || user.username}
            <ShieldAlert className="w-3 h-3 text-indigo-400" />
          </div>
          <div className="text-[10px] text-slate-500 font-mono">{user.id}</div>
        </div>
      </div>
      <button
        onClick={() => setIsDeleting(true)}
        className="p-2 rounded-lg text-slate-400 hover:bg-brand-crimson hover:text-white transition-colors"
        title="Revoke Access"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

