import React, { useMemo } from "react";
import { RoleSelector } from "../discord";
import { ShieldOff, AlertTriangle } from "lucide-react";

export default function RoleBlacklistPanel({ roles, blacklist, updateBlacklist, config }) {
  // Check if any reward role is also blacklisted to warn the user
  const rewardRoles = [
    config.top_chat_role_1, config.top_chat_role_2, config.top_chat_role_3,
    config.top_vc_role_1, config.top_vc_role_2, config.top_vc_role_3
  ].filter(Boolean);

  const conflicts = useMemo(() => {
    const conflictingIds = blacklist.filter(id => rewardRoles.includes(id));
    return roles.filter(r => conflictingIds.includes(r.id));
  }, [blacklist, rewardRoles, roles]);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 mb-8">
      <div className="flex items-center gap-3 mb-2">
        <ShieldOff className="w-5 h-5 text-brand-crimson" />
        <h2 className="text-xl font-bold text-white">Excluded Roles</h2>
      </div>
      <p className="text-sm text-slate-400 mb-6">
        Members with these roles cannot receive leaderboard reward roles.
      </p>

      {conflicts.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="text-sm text-amber-200/90">
            <strong>Warning:</strong> You have blacklisted {conflicts.map(r => `@${r.name}`).join(", ")} which {conflicts.length === 1 ? "is" : "are"} also set as reward roles. They will not be granted.
          </div>
        </div>
      )}

      <RoleSelector 
        roles={roles}
        value={blacklist}
        onChange={updateBlacklist}
        multiple={true}
        placeholder="Select roles to exclude..."
      />
    </div>
  );
}
