import React from "react";
import { useParams } from "react-router-dom";
import { useAutoRoleRewards } from "../../hooks/auto-roles";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { PageError, PageSkeleton } from "../../components/ui";

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

  useUnsavedChanges({
    isDirty: hasUnsavedChanges,
    onSave: saveConfig,
    onReset: resetChanges,
    pageTitle: "Auto-Role Rewards",
  });

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
    </div>
  );
}
