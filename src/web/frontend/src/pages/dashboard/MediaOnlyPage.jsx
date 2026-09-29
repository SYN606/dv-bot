import React from "react";
import { useParams } from "react-router-dom";
import { useMediaOnly } from "../../hooks/media-only";

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

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] animate-in fade-in zoom-in-[0.98] duration-500">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/5 text-center space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Unable to load media rules</h2>
          <p className="text-sm text-slate-400">Failed to connect to the backend.</p>
          <button onClick={refresh} className="mt-4 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (loading && rules.length === 0) {
    return (
      <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
        <div className="h-24 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        <div className="h-96 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        <div className="space-y-4">
          <div className="h-32 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
          <div className="h-32 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto animate-in fade-in duration-500 pb-24">
      <MediaOnlyHeader activeCount={rules.length} />

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
