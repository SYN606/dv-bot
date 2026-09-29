import React from "react";
import { useParams } from "react-router-dom";
import { useSupporterRewards } from "../../hooks/supporter-rewards";

import {
  SupporterRewardsHeader,
  StatusVanityReward,
  ClanTagReward
} from "../../components/supporter-rewards";

export default function SupporterRewardsPage({ showToast }) {
  const { guildId } = useParams();

  const {
    config,
    channels,
    roles,
    loading,
    error,
    saving,
    hasChanges,
    updateConfig,
    save,
    refresh
  } = useSupporterRewards(guildId, showToast);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] animate-in fade-in zoom-in-[0.98] duration-500">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/5 text-center space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Unable to load configuration</h2>
          <p className="text-sm text-slate-400">Failed to load Supporter Rewards configuration.</p>
          <button onClick={refresh} className="mt-4 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
        <div className="h-32 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-100 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
          <div className="h-100 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto animate-in fade-in duration-500 pb-32">
      <SupporterRewardsHeader 
        enabled={config.enabled}
        onToggle={(checked) => updateConfig("enabled", checked)}
        hasChanges={hasChanges}
        onSave={save}
        saving={saving}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <StatusVanityReward 
          guildId={guildId}
          roles={roles}
          channels={channels}
          config={config}
          onChange={updateConfig}
        />

        <ClanTagReward 
          guildId={guildId}
          roles={roles}
          channels={channels}
          config={config}
          onChange={updateConfig}
        />
      </div>
    </div>
  );
}
