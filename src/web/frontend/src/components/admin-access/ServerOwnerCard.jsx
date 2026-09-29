import React from "react";
import { Crown } from "lucide-react";
import { getDiscordAvatarUrl } from "../../utils/discord";

export default function ServerOwnerCard({ ownerUser, ownerId }) {
  if (!ownerId && !ownerUser) return null;

  const avatar = getDiscordAvatarUrl(ownerUser);

  return (
    <div className="glass-card p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-4 h-4 text-amber-500" />
          <h2 className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-bold">Server Owner</h2>
        </div>
        <div className="flex items-center gap-4">
          <img src={avatar} alt="Owner" className="w-12 h-12 rounded-full border border-amber-500/20" />
          <div>
            <div className="text-lg font-bold text-white">{ownerUser?.globalName || ownerUser?.username || "Unknown User"}</div>
            <div className="text-xs font-mono text-slate-500">{ownerId}</div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-start sm:items-end gap-1">
        <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-semibold rounded-lg border border-amber-500/20">
          Permanent Access
        </span>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest">Cannot be revoked</span>
      </div>
    </div>
  );
}

