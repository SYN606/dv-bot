import React, { useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { useVerification } from "../../hooks/verification";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

import {
  VerificationHeader,
  AccessSetup,
  VerificationMethod,
  VerificationMessageEditor,
  VerificationPreview
} from "../../components/verification";

export default function VerificationPage({ showToast }) {
  const { guildId } = useParams();
  const { botInfo } = useOutletContext() || {};

  const {
    config,
    channels,
    roles,
    staleRoleAlert,
    loading,
    error,
    saving,
    posting,
    resetting,
    hasChanges,
    updateConfig,
    save,
    postPrompt,
    reset,
    refresh
  } = useVerification(guildId, showToast);

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const selectedRole = roles.find(r => r.id === config.verifiedRoleId);
  const isHierarchyError = selectedRole?.isAboveBot;
  
  const isSaveDisabled = !config.channelId || !config.verifiedRoleId || isHierarchyError || saving || posting;

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] animate-in fade-in zoom-in-[0.98] duration-500">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/5 text-center space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Unable to load configuration</h2>
          <p className="text-sm text-slate-400">Failed to load Verification configuration.</p>
          <button onClick={refresh} className="mt-4 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
        <div className="h-32 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            <div className="h-64 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
            <div className="h-48 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
          </div>
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="h-96 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto animate-in fade-in duration-500 pb-32">
      <VerificationHeader 
        enabled={config.enabled} 
        onToggle={(val) => updateConfig("enabled", val)} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          <AccessSetup 
            guildId={guildId}
            config={config}
            updateConfig={updateConfig}
            channels={channels}
            roles={roles}
            staleRoleAlert={staleRoleAlert}
          />

          <VerificationMethod 
            config={config}
            updateConfig={updateConfig}
          />

          <VerificationMessageEditor 
            guildId={guildId}
            config={config}
            updateConfig={updateConfig}
          />

          {/* Action Bar */}
          <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={resetting || saving || posting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold transition-colors disabled:opacity-50"
            >
              Reset Configuration
            </button>

            <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={save}
                disabled={isSaveDisabled || !hasChanges}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-colors disabled:opacity-50 border border-white/5"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
              
              <button
                onClick={postPrompt}
                disabled={isSaveDisabled}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {posting ? "Publishing..." : "Publish Verification Prompt"}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4">
          <VerificationPreview 
            config={config}
            roles={roles}
            botInfo={botInfo}
          />
        </div>
      </div>

      <ConfirmDialog 
        open={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={async () => {
          await reset();
          setShowResetConfirm(false);
        }}
        title="Reset Verification Configuration?"
        description={
          <>
            <p className="mb-4">
              This will remove the saved verification configuration and restore the default settings for this server.
            </p>
            <p>
              This does not mean the same thing as simply disabling Verification Gate.
            </p>
          </>
        }
        confirmText="Reset Configuration"
        cancelText="Cancel"
      />
    </div>
  );
}
