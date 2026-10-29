import React from "react";
import { useParams } from "react-router-dom";
import { useAutoRoleRewards } from "../../hooks/auto-roles";
import { PageError, PageSkeleton } from "../../components/ui";
import { Save, Loader2, RotateCcw } from "lucide-react";

// Components
import {
  AutoRoleHeader,
  AutoRoleSettings,
  RewardRolesPanel,
  RoleBlacklistPanel
} from "../../components/auto-roles";

export default function AutoRoleRewardsPage({ showToast }) {
  const { guildId } = useParams();
  
  const {
    config,
    blacklist,
    roles,
    channels,
    loading,
    error,
    saving,
    hasUnsavedChanges,
    updateConfig,
    updateBlacklist,
    resetChanges,
    saveConfig,
    refresh
  } = useAutoRoleRewards(guildId, showToast);

  if (error) {
    return <PageError title="Unable to load Auto-Roles" onRetry={refresh} />;
  }

  if (loading) {
    return <PageSkeleton cards={2} rows={0} />;
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-32">
      <AutoRoleHeader 
        enabled={Boolean(config.enabled)} 
        onToggle={() => updateConfig("enabled", config.enabled ? 0 : 1)} 
      />

      <AutoRoleSettings 
        guildId={guildId}
        channels={channels}
        config={config}
        updateConfig={updateConfig}
      />



      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <RewardRolesPanel 
          type="chat"
          roles={roles}
          config={config}
          updateConfig={updateConfig}
        />
        <RewardRolesPanel 
          type="voice"
          roles={roles}
          config={config}
          updateConfig={updateConfig}
        />
      </div>

      <RoleBlacklistPanel 
        roles={roles}
        blacklist={blacklist}
        config={config}
        updateBlacklist={updateBlacklist}
      />

      {/* Floating Save Bar */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-3xl px-4 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="glass-panel p-4 rounded-2xl border border-brand-crimson/50 bg-slate-950/90 shadow-2xl shadow-brand-crimson/10 flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-xl">
            <div className="text-center sm:text-left">
              <h3 className="text-sm font-bold text-white">Unsaved changes</h3>
              <p className="text-xs text-slate-400">Your Auto-Role configuration has changed.</p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={resetChanges}
                disabled={saving}
                className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={saveConfig}
                disabled={saving}
                className="flex-1 sm:flex-none px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
