import React, { useState } from "react";
import { RoleSelector } from "../discord";
import AdminRoleItem from "./AdminRoleItem";
import { Shield, Loader2 } from "lucide-react";

export default function AdminRolesPanel({ guildId, roles, adminRoles, onAddRole, onRemoveRole, addingRoleId, removingRoleId }) {
  const [selectedRole, setSelectedRole] = useState("");

  const handleAdd = async () => {
    if (!selectedRole) return;
    const success = await onAddRole(selectedRole);
    if (success) {
      setSelectedRole("");
    }
  };

  const adminRoleIds = adminRoles.map(r => r.id);
  // Exclude already added roles from the selector
  const availableRoles = roles.filter(r => !adminRoleIds.includes(r.id));

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" />
          Staff Roles
        </h2>
        <span className="text-xs font-mono text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">
          {adminRoles.length} roles
        </span>
      </div>
      <p className="text-sm text-slate-400 mb-6">
        Members with these roles can configure the bot and manage settings.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <RoleSelector 
            roles={availableRoles}
            value={selectedRole}
            onChange={setSelectedRole}
            placeholder="Select a role to authorize..."
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!selectedRole || addingRoleId}
          className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center min-w-35"
        >
          {addingRoleId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Role"}
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-2 scrollbar-thin">
        {adminRoles.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500 border border-dashed border-white/5 rounded-xl">
            No staff roles authorized yet.
          </div>
        ) : (
          adminRoles.map((r) => (
            <AdminRoleItem 
              key={r.id}
              role={r}
              isRemoving={removingRoleId === r.id}
              onRemove={onRemoveRole}
            />
          ))
        )}
      </div>
    </div>
  );
}
