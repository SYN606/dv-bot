import React from "react";
import { useParams } from "react-router-dom";
import { useServerConfig } from "../../hooks/config";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { PageError, PageSkeleton } from "../../components/ui";

import {
  ConfigHeader,
  AuditLogSettings,
  VoiceRoleSettings,
  TempbanSettings
} from "../../components/config";

export default function ConfigPage({ showToast }) {
  const { guildId } = useParams();

  const {
    config,
    roles,
    channels,
    loading,
    error,
    saving,
    hasChanges,
    updateConfig,
    save,
    reset,
    refresh
  } = useServerConfig(guildId, showToast);

  useUnsavedChanges({
    isDirty: hasChanges,
    onSave: save,
    onReset: reset,
    pageTitle: "Bot Settings",
  });

  if (error) {
    return <PageError title="Unable to load server configuration" onRetry={refresh} />;
  }

  if (loading) {
    return <PageSkeleton cards={2} rows={1} />;
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-32">
      <ConfigHeader />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <AuditLogSettings 
          guildId={guildId}
          channels={channels}
          config={config}
          updateConfig={updateConfig}
        />
        
        <VoiceRoleSettings 
          roles={roles}
          config={config}
          updateConfig={updateConfig}
        />
      </div>

      <TempbanSettings 
        roles={roles}
        config={config}
        updateConfig={updateConfig}
      />
    </div>
  );
}
