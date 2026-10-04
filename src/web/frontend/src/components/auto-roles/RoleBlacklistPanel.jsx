import React, { useMemo } from "react";
import { RoleSelector } from "../discord";
import { ShieldOff, AlertTriangle, X, Trash2, CheckCircle2 } from "lucide-react";

export default function RoleBlacklistPanel({ roles = [], blacklist = [], updateBlacklist, config = {} }) {
  // Check if any reward role is also blacklisted to warn the user
  const rewardRoles = [
    config.top_chat_role_1, config.top_chat_role_2, config.top_chat_role_3,
    config.top_vc_role_1, config.top_vc_role_2, config.top_vc_role_3
  ].filter(Boolean);

  const conflicts = useMemo(() => {
    const conflictingIds = (blacklist || []).filter(id => rewardRoles.includes(id));
    return roles.filter(r => conflictingIds.includes(r.id));
  }, [blacklist, rewardRoles, roles]);

  const excludedRoleObjects = useMemo(() => {
    return (blacklist || []).map(id => {
      const found = roles.find(r => r.id === id);
      return found || { id, name: `Unknown Role (${id.slice(0, 6)}...)`, color: "#475569" };
    });
  }, [blacklist, roles]);

  const handleRemoveRole = (roleId) => {
    updateBlacklist((blacklist || []).filter(id => id !== roleId));
  };

  const handleClearAll = () => {
    updateBlacklist([]);
  };

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-crimson/10 border border-brand-crimson/20 flex items-center justify-center text-brand-crimson shrink-0">
            <ShieldOff className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Excluded Roles</h2>
            <p className="text-xs text-slate-400">
              Members holding any of these roles are excluded from winning weekly leaderboard rewards.
            </p>
          </div>
        </div>
        {blacklist && blacklist.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all self-start sm:self-auto"
            title="Remove all excluded roles"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear All ({blacklist.length})
          </button>
        )}
      </div>

      {conflicts.length > 0 && (
        <div className="my-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="text-sm text-amber-200/90">
            <strong>Warning:</strong> {conflicts.map(r => `@${r.name}`).join(", ")} {conflicts.length === 1 ? "is" : "are"} currently configured as reward roles. Members with these roles will not receive them.
          </div>
        </div>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-2">
            Add Roles to Exclude
          </label>
          <RoleSelector 
            roles={roles}
            value={blacklist}
            onChange={updateBlacklist}
            multiple={true}
            placeholder="Search and select roles to exclude..."
          />
        </div>

        {/* Selected Excluded Roles Chips */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
              Currently Excluded ({excludedRoleObjects.length})
            </span>
          </div>

          {excludedRoleObjects.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-white/5 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500/70" />
              <span>No roles excluded. All active members are eligible for weekly rewards.</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 p-3 rounded-2xl bg-slate-900/60 border border-white/5">
              {excludedRoleObjects.map(role => {
                const colorStyle = role.color ? { backgroundColor: role.color } : { backgroundColor: '#475569' };
                return (
                  <div
                    key={role.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-white/10 text-xs text-slate-200 shadow-sm hover:border-white/20 transition-all group"
                  >
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={colorStyle} />
                    <span className="font-medium max-w-[180px] truncate">@{role.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(role.id)}
                      className="p-0.5 rounded-md hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                      title={`Remove @${role.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
