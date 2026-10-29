import React, { useMemo } from "react";
import { ChannelSelector, RoleSelector } from "../discord";
import { AlertTriangle } from "lucide-react";

export default function AccessSetup({ guildId, config, updateConfig, channels, roles, staleRoleAlert }) {
  // Pre-process roles to append warnings for roles above the bot
  const displayRoles = useMemo(() => {
    return roles.map(r => ({
      ...r,
      name: r.name + (r.isAboveBot ? " (⚠️ Above Bot)" : "")
    }));
  }, [roles]);

  const selectedRole = roles.find(r => r.id === config.verifiedRoleId);
  const isHierarchyError = selectedRole?.isAboveBot;

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 space-y-6">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-2">
        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">1</div>
        <h2 className="text-sm font-bold text-white tracking-wider font-mono uppercase">Access Setup</h2>
      </div>

      {staleRoleAlert && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="text-xs text-rose-300">
            <p className="font-bold text-rose-400 text-sm mb-1">CONFIGURATION NEEDS ATTENTION</p>
            <p>The previously configured Verified Role no longer exists in Discord. Select a new role and save the configuration.</p>
          </div>
        </div>
      )}

      {isHierarchyError && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-400">
            <p className="font-bold text-amber-500 text-sm mb-1">BOT ROLE HIERARCHY ISSUE</p>
            <p>Digital Vigital cannot assign <strong className="text-white">@{selectedRole.name}</strong> because it is above or equal to the bot's highest Discord role.</p>
            <p className="mt-2 text-amber-500/80">Move the bot role above this role in Discord Server Settings.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Verification Channel <span className="text-rose-500">*</span>
          </label>
          <ChannelSelector 
            guildId={guildId}
            channels={channels}
            value={config.channelId}
            onChange={(val) => updateConfig("channelId", val)}
            allowedTypes={["text"]}
            placeholder="Select where users verify..."
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Verified Role <span className="text-rose-500">*</span>
          </label>
          <RoleSelector 
            guildId={guildId}
            roles={displayRoles}
            value={config.verifiedRoleId}
            onChange={(val) => updateConfig("verifiedRoleId", val)}
            placeholder="Select role to grant..."
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Unverified Role (Optional)
          </label>
          <RoleSelector 
            guildId={guildId}
            roles={roles}
            value={config.unverifiedRoleId}
            onChange={(val) => updateConfig("unverifiedRoleId", val)}
            specialOptions={[{ value: "", label: "None" }]}
            placeholder="Role to remove on success..."
          />
          <p className="text-[10px] text-slate-500 mt-1.5">Removed from the user once they verify.</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Audit Log Channel (Optional)
          </label>
          <ChannelSelector 
            guildId={guildId}
            channels={channels}
            value={config.logChannelId}
            onChange={(val) => updateConfig("logChannelId", val)}
            allowedTypes={["text"]}
            specialOptions={[{ value: "", label: "None" }]}
            placeholder="Log verifications here..."
          />
        </div>
      </div>
    </div>
  );
}
