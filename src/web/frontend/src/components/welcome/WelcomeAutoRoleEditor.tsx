import React from "react";
import { UserCheck, ShieldAlert, Bot, Plus, X, AlertTriangle } from "lucide-react";
import { RoleSelector } from "../discord";

export default function WelcomeAutoRoleEditor({
  config,
  roles,
  updateConfig,
  isVerificationEnabled = false,
}: {
  config: any;
  roles: any[];
  updateConfig: (key: string, val: any) => void;
  isVerificationEnabled?: boolean;
}) {
  const trigger = config.welcome_trigger || "join";
  const selectedJoinRoleIds = Array.isArray(config.join_role_ids) ? config.join_role_ids : [];

  // Filter assignable roles (exclude @everyone)
  const assignableRoles = roles.filter((r) => r.name !== "@everyone");

  const handleAddJoinRole = (roleId) => {
    if (!roleId || selectedJoinRoleIds.includes(roleId)) return;
    updateConfig("join_role_ids", [...selectedJoinRoleIds, roleId]);
  };

  const handleRemoveJoinRole = (roleId) => {
    updateConfig(
      "join_role_ids",
      selectedJoinRoleIds.filter((id) => id !== roleId)
    );
  };

  // Check if any selected role is above bot's highest role
  const hierarchyErrors = selectedJoinRoleIds
    .map((id) => roles.find((r) => r.id === id))
    .filter((r) => r?.isAboveBot);

  const botRole = roles.find((r) => r.id === config.bot_role_id);
  const isBotRoleHierarchyError = botRole?.isAboveBot;

  return (
    <div className="space-y-6">
      {/* Enable Toggle & Summary */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Join Auto-Roles</h2>
              <p className="text-xs text-slate-400">
                Grant roles automatically as soon as human members or bots join the server.
              </p>
            </div>
          </div>

          {/* Toggle */}
          <label className="relative inline-flex items-center cursor-pointer self-start sm:self-center">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={Boolean(config.autorole_enabled)}
              onChange={(e) => updateConfig("autorole_enabled", e.target.checked)}
            />
            <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600 shadow-inner"></div>
          </label>
        </div>

        {/* Verification & Trigger Protection Note */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-850/70 border border-white/5 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-white">Trigger Mode:</strong>{" "}
            {trigger === "verification" ? (
              <span>
                Configured to assign human auto-roles <strong>after server verification</strong>. Members will not receive join roles until they verify.
              </span>
            ) : trigger === "onboarding" ? (
              <span>
                Configured to assign human auto-roles <strong>after completing Discord onboarding / screening</strong>.
              </span>
            ) : (
              <span>
                Configured to assign auto-roles <strong>immediately upon server join</strong> (unless gated by active verification).
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Role Configuration Card */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl space-y-6">
        {/* Human Member Join-Roles (Multi-Select) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Member Join-Roles (Human Members)
          </label>
          <p className="text-xs text-slate-400 mb-3">
            Roles automatically added to regular users upon entering the server.
          </p>

          {/* Centralized Role Selector */}
          <div className="mb-3">
            <RoleSelector
              roles={assignableRoles}
              value={selectedJoinRoleIds}
              onChange={(val) => updateConfig("join_role_ids", val)}
              multiple={true}
              placeholder="Search and assign member join-roles..."
            />
          </div>

          {/* Active Badges */}
          <div className="flex flex-wrap gap-2 min-h-10 p-3 rounded-2xl bg-slate-800/50 border border-white/5">
            {selectedJoinRoleIds.length === 0 ? (
              <span className="text-xs text-slate-500 italic py-1 px-1">
                No join-roles selected. Members will join without default roles.
              </span>
            ) : (
              selectedJoinRoleIds.map((roleId) => {
                const roleObj = roles.find((r) => r.id === roleId);
                const isError = roleObj?.isAboveBot;
                return (
                  <span
                    key={roleId}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border shadow-sm ${
                      isError
                        ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: roleObj?.color || "#F59E0B" }}
                    />
                    <span>{roleObj?.name || "Unknown Role"}</span>
                    {isError && (
                      <span className="text-[10px] text-rose-400 font-bold" title="Role is positioned above bot's role">
                        [Above Bot]
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveJoinRole(roleId)}
                      className="hover:opacity-75 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })
            )}
          </div>

          {/* Hierarchy Warning */}
          {hierarchyErrors.length > 0 && (
            <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>
                One or more selected roles are higher than DV-BOT's role in the Discord Server Settings.
                Please move DV-BOT's role above these roles in Discord.
              </span>
            </div>
          )}
        </div>

        {/* Dedicated Bot Auto-Role */}
        <div className="pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 mb-1.5">
            <Bot className="w-4 h-4 text-indigo-400" />
            <label className="text-xs font-semibold text-slate-300">
              Dedicated Bot Auto-Role
            </label>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Assigned exclusively when another Discord bot is invited to the server.
          </p>

          <div className="w-full md:w-1/2">
            <RoleSelector
              roles={assignableRoles}
              value={config.bot_role_id || ""}
              onChange={(val) => updateConfig("bot_role_id", val)}
              specialOptions={[{ value: "", label: "No special bot role (Disabled)" }]}
              placeholder="Select bot auto-role..."
            />
          </div>

          {isBotRoleHierarchyError && (
            <div className="mt-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>The selected bot role is higher than DV-BOT's role in server hierarchy.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
