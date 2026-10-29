import React from "react";
import { RoleSelector } from "../discord";
import { Shield, ShieldAlert } from "lucide-react";

export default function TempbanSettings({ roles, config, updateConfig }) {
  const isIsolationMode = Boolean(config.tempbanRoleId);
  const currentRole = roles.find(r => r.id === config.tempbanRoleId);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5">
      <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-6">Moderation</h2>
      
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white mb-1">Tempban Isolation</h3>
        <p className="text-sm text-slate-400">
          Choose how temporary bans should behave.
        </p>
      </div>

      <div className="mb-6 max-w-md">
        <RoleSelector 
          roles={roles}
          value={config.tempbanRoleId}
          onChange={(val) => updateConfig("tempbanRoleId", val)}
          placeholder="Select isolation role..."
          specialOptions={[
            { value: "", label: "None (Native Discord Ban)", description: "Use native server banning" }
          ]}
        />
      </div>

      <div className="p-5 rounded-2xl bg-slate-900/50 border border-white/5">
        {!isIsolationMode ? (
          <div className="flex gap-4">
            <div className="p-3 bg-slate-800 rounded-xl border border-white/10 shrink-0 h-fit">
              <Shield className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1 tracking-wide">NATIVE BAN MODE</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Temporary bans use Discord's native server ban. The member is automatically unbanned when the configured duration expires.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shrink-0 h-fit">
              <ShieldAlert className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-indigo-400 mb-1 tracking-wide">ISOLATION MODE</h4>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Temporary bans use <strong className="text-white">@{currentRole?.name || "SelectedRole"}</strong> instead of removing the member from the server.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5 list-inside">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                  Isolation role is assigned
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                  Verified access is temporarily removed
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                  Access is restored automatically when the timer expires
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="pt-6 mt-6 border-t border-white/5 flex items-center gap-2">
        {isIsolationMode ? (
          <>
            <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0"></div>
            <span className="text-xs font-semibold text-indigo-400">Isolation Mode — @{currentRole?.name}</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-slate-500 shrink-0"></div>
            <span className="text-xs font-semibold text-slate-400">Native Ban Mode</span>
          </>
        )}
      </div>
    </div>
  );
}
