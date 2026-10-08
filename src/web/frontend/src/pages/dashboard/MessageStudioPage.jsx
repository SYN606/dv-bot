import React from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { useMessageStudio } from "../../hooks/useMessageStudio";
import MessageComposer from "../../components/message-studio/MessageComposer";

export default function MessageStudioPage({ showToast }) {
  const { guildId } = useParams();
  const { botInfo } = useOutletContext() || {};

  const {
    channels,
    drafts,
    templates,
    history,
    loading,
    error,
    saveDraft,
    deleteDraft,
    createTemplate,
    updateTemplate,
    duplicateTemplate,
    deleteTemplate,
    publishMessage,
    editPublishedMessage,
    deletePublishedMessage,
    refresh,
  } = useMessageStudio(guildId, showToast);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] p-6 animate-in fade-in duration-300">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/5 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
            <span className="text-xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">
            Unable to load Message Studio
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={refresh}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (loading && channels.length === 0) {
    return (
      <div className="w-full space-y-4 animate-pulse pb-16">
        <div className="h-20 glass-panel rounded-3xl border border-white/5 bg-slate-900/50" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[650px]">
          <div className="lg:col-span-3 glass-panel rounded-3xl border border-white/5 bg-slate-900/40" />
          <div className="lg:col-span-5 glass-panel rounded-3xl border border-white/5 bg-slate-900/40" />
          <div className="lg:col-span-4 glass-panel rounded-3xl border border-white/5 bg-slate-900/40" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col animate-in fade-in duration-300 pb-16">
      <MessageComposer
        guildId={guildId}
        botInfo={botInfo}
        channels={channels}
        drafts={drafts}
        templates={templates}
        history={history}
        onSaveDraft={saveDraft}
        onDeleteDraft={deleteDraft}
        onCreateTemplate={createTemplate}
        onUpdateTemplate={updateTemplate}
        onDuplicateTemplate={duplicateTemplate}
        onDeleteTemplate={deleteTemplate}
        onPublishMessage={publishMessage}
        onEditPublishedMessage={editPublishedMessage}
        onDeletePublishedMessage={deletePublishedMessage}
        showToast={showToast}
      />
    </div>
  );
}
