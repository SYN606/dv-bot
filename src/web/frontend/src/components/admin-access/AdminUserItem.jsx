import React, { useState } from "react";
import { Trash2, ShieldAlert } from "lucide-react";
import { getDiscordAvatarUrl } from "../../utils/discord";

export default function AdminUserItem({ user, isRemoving, onRemove }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const avatar = getDiscordAvatarUrl(user);

  if (isDeleting) {
    return (
      <div className="flex items-center justify-between p-4 rounded-xl bg-rose-500/10 border border-rose-500/30">
        <div>
          <div className="text-sm font-semibold text-slate-200">Revoke user access?</div>
          <div className="text-xs text-slate-400 mt-1">
            <span className="font-bold text-rose-400">{user.globalName || user.username}</span> will lose dashboard & bot administration privileges.
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRemove(user.id)}
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
        <img src={avatar} alt="Admin" className="w-9 h-9 rounded-full border border-white/10 object-cover shrink-0" />
        <div className="min-w-0">
          <div className="text-sm font-bold text-white flex items-center gap-2 truncate">
            <span>{user.globalName || user.username}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 font-medium border border-indigo-500/20">
              Dashboard Admin
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">@{user.username} • {user.id}</div>
        </div>
      </div>
      <button
        onClick={() => setIsDeleting(true)}
        className="p-2 rounded-lg text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors shrink-0"
        title="Revoke User Access"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

