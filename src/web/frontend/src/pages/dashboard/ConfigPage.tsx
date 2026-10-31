import React from "react";
import { useParams, Link } from "react-router-dom";
import { useServerConfig } from "../../hooks/config";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { PageError, PageSkeleton } from "../../components/ui";
import { ArrowRight, Shield } from "lucide-react";

import {
  ConfigHeader,
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

      {/* Info Banner pointing to granular Audit Log Channels */}
      <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-slate-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-white mb-0.5">Audit & Moderation Log Channels</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Granular per-event log channels (messages, members, moderation, voice, and roles) are configured in the Audit Logs hub.
            </p>
          </div>
        </div>
        <Link
          to={`/dashboard/${guildId}/audit-logs`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all shrink-0"
        >
          <span>Configure Channels</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <VoiceRoleSettings 
          roles={roles}
          config={config}
          updateConfig={updateConfig}
        />
        
        <TempbanSettings 
          roles={roles}
          config={config}
          updateConfig={updateConfig}
        />
      </div>
    </div>
  );
}
