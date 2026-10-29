import React, { useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { useVerification } from "../../hooks/verification";
import { ConfirmDialog, PageError, PageSkeleton } from "../../components/ui";

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
    return <PageError title="Unable to load configuration" description="Failed to load Verification configuration." onRetry={refresh} />;
  }

  if (loading) {
    return <PageSkeleton cards={2} rows={0} />;
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-32">
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
