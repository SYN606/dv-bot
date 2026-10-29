import React from "react";
import { useParams } from "react-router-dom";
import { useSupporterRewards } from "../../hooks/supporter-rewards";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { PageError, PageSkeleton } from "../../components/ui";

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
    reset,
    refresh
  } = useSupporterRewards(guildId, showToast);

  useUnsavedChanges({
    isDirty: hasChanges,
    onSave: save,
    onReset: reset,
    pageTitle: "Supporter Rewards",
  });

  if (error) {
    return <PageError title="Unable to load configuration" description="Failed to load Supporter Rewards configuration." onRetry={refresh} />;
  }

  if (loading) {
    return <PageSkeleton cards={2} rows={0} />;
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-32">
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
