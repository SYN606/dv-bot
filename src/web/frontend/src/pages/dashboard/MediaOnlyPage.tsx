import React from "react";
import { useParams } from "react-router-dom";
import { useMediaOnly } from "../../hooks/media-only";
import { useModuleStatus } from "../../hooks/useModuleStatus";
import { PageError, PageSkeleton } from "../../components/ui";

import {
  MediaOnlyHeader,
  MediaRuleEditor,
  MediaRuleList
} from "../../components/media-only";

export default function MediaOnlyPage({ showToast }) {
  const { guildId } = useParams();

  const {
    rules,
    channels,
    roles,
    loading,
    error,
    creating,
    deletingChannelId,
    refresh,
    createRule,
    deleteRule
  } = useMediaOnly(guildId, showToast);

  const { enabled: moduleEnabled, toggle: toggleModule } = useModuleStatus(guildId, "media_only", showToast);

  if (error) {
    return <PageError title="Unable to load media rules" onRetry={refresh} />;
  }

  if (loading && rules.length === 0) {
    return <PageSkeleton cards={1} rows={3} />;
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-24">
      <MediaOnlyHeader 
        activeCount={rules.length} 
        enabled={moduleEnabled}
        onToggle={toggleModule}
      />

      <MediaRuleEditor 
        guildId={guildId}
        channels={channels}
        roles={roles}
        activeRules={rules}
        onCreate={createRule}
        isCreating={creating}
      />

      <MediaRuleList 
        rules={rules}
        channels={channels}
        roles={roles}
        onDelete={deleteRule}
        deletingChannelId={deletingChannelId}
      />
    </div>
  );
}
