import React from "react";
import { RoleSelector } from "../discord";

export default function VoiceRoleSettings({ roles, config, updateConfig }) {
  const currentVcRole = roles.find(r => r.id === config.vcRoleId);
  const currentAutoRole = roles.find(r => r.id === config.autoRoleId);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 mb-8 flex flex-col justify-between h-full">
      <div>
        <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-6">Automation</h2>
        
        {/* 1. Auto-Role on Join */}
        <div className="mb-6">
          <div className="mb-2">
            <h3 className="text-base font-bold text-white mb-0.5">Auto-Role on Join</h3>
            <p className="text-xs text-slate-400">
              Automatically assigns this role to new members immediately when they join the server.
            </p>
          </div>
          <RoleSelector 
            roles={roles}
            value={config.autoRoleId}
            onChange={(val) => updateConfig("autoRoleId", val)}
            placeholder="Select default join role..."
            specialOptions={[
              { value: "", label: "None / Disabled", description: "Join auto-role disabled" }
            ]}
          />
        </div>

        {/* 2. Active Voice Role */}
        <div className="mb-6">
          <div className="mb-2">
            <h3 className="text-base font-bold text-white mb-0.5">Active Voice Role</h3>
            <p className="text-xs text-slate-400">
              Automatically assigns a role while connected to a voice channel and removes it upon leaving.
            </p>
          </div>
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

      <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {currentAutoRole ? (
            <>
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shrink-0"></div>
              <span className="text-xs font-semibold text-indigo-400">Join Auto-Role: @{currentAutoRole.name}</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-slate-500 shrink-0"></div>
              <span className="text-xs font-semibold text-slate-400">Join Auto-Role disabled</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentVcRole ? (
            <>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
              <span className="text-xs font-semibold text-emerald-400">VC Role: @{currentVcRole.name}</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-slate-500 shrink-0"></div>
              <span className="text-xs font-semibold text-slate-400">Voice automation disabled</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
