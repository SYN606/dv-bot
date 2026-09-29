import React from "react";
import { useParams } from "react-router-dom";
import { useAutoRoleRewards } from "../../hooks/auto-roles";
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
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] animate-in fade-in zoom-in-[0.98] duration-500">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/5 text-center space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Unable to load Auto-Roles</h2>
          <p className="text-sm text-slate-400">Failed to connect to the backend.</p>
          <button onClick={refresh} className="mt-4 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
        <div className="h-24 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        <div className="h-48 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
          <div className="h-80 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto animate-in fade-in duration-500 pb-32">
      <AutoRoleHeader isEnabled={Boolean(config.enabled)} />

      <AutoRoleSettings 
        guildId={guildId}
        channels={channels}
        config={config}
        updateConfig={updateConfig}
      />

      {!config.enabled && (
        <div className="mb-8 p-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 text-indigo-200">
          <h3 className="font-bold text-indigo-400 mb-1">Auto-Roles are currently disabled.</h3>
          <p className="text-sm opacity-80">Your configuration is preserved and will be used when the module is enabled.</p>
        </div>
      )}

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
