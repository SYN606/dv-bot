import React from "react";
import { RoleSelector } from "../discord";

export default function VoiceRoleSettings({ roles, config, updateConfig }) {
  const currentRole = roles.find(r => r.id === config.vcRoleId);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 mb-8 flex flex-col justify-between h-full">
      <div>
        <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-6">Automation</h2>
        
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white mb-1">Active Voice Role</h3>
          <p className="text-sm text-slate-400">
            Automatically assign a role while a member is connected to a voice channel and remove it when they leave.
          </p>
        </div>

        <div className="mb-8">
          <RoleSelector 
            roles={roles}
            value={config.vcRoleId}
            onChange={(val) => updateConfig("vcRoleId", val)}
            placeholder="Select voice activity role..."
            specialOptions={[
              { value: "", label: "None / Disabled", description: "Voice role automation disabled" }
            ]}
          />
        </div>
      </div>

      <div className="pt-4 border-t border-white/5 flex items-center gap-2">
        {currentRole ? (
          <>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
            <span className="text-xs font-semibold text-emerald-400">Assigning @{currentRole.name}</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-slate-500 shrink-0"></div>
            <span className="text-xs font-semibold text-slate-400">Voice automation disabled</span>
          </>
        )}
      </div>
    </div>
  );
}
