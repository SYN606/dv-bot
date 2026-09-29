import React, { useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { useStickyNotices } from "../../hooks/sticky";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

import {
  StickyHeader,
  StickyEditor,
  StickyPreview,
  StickyNoticeList
} from "../../components/sticky";

export default function StickyPage({ showToast }) {
  const { guildId } = useParams();
  const { botInfo } = useOutletContext() || {};

  const {
    notices,
    channels,
    loading,
    error,
    saving,
    deletingChannelId,
    editor,
    editingNotice,
    hasChanges,
    totalRepins,
    updateEditor,
    resetEditor,
    createOrUpdate,
    deleteNotice,
    editNotice,
    refresh
  } = useStickyNotices(guildId, showToast);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // If a user selects a channel that already has a sticky, switch to edit mode
  const handleEditorUpdate = (field, value) => {
    updateEditor(field, value);

    if (field === "channelId") {
      const existingNotice = notices.find(n => n.channel_id === value);
      if (existingNotice && (!editingNotice || editingNotice.channel_id !== value)) {
        editNotice(existingNotice);
      } else if (!existingNotice && editingNotice) {
        // Switched away to a channel with no notice
        resetEditor();
        updateEditor("channelId", value); // re-apply the chosen channel since reset clears it
      }
    }
  };

  const handleEditRequest = (notice) => {
    editNotice(notice);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] animate-in fade-in zoom-in-[0.98] duration-500">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/5 text-center space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Unable to load sticky notices</h2>
          <p className="text-sm text-slate-400">Failed to connect to the backend.</p>
          <button onClick={refresh} className="mt-4 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (loading && channels.length === 0) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
        <div className="h-24 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
          <div className="h-96 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        </div>
        <div className="h-40 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
      </div>
    );
  }

  const selectedChannelName = channels.find(c => c.id === editor.channelId)?.name;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto animate-in fade-in duration-500 pb-32">
      <StickyHeader activeCount={notices.length} totalRepins={totalRepins} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch mb-12">
        <StickyEditor 
          guildId={guildId}
          channels={channels}
          editor={editor}
          updateEditor={handleEditorUpdate}
          hasChanges={hasChanges}
          isEditing={!!editingNotice}
          onSave={createOrUpdate}
          saving={saving}
          onReset={resetEditor}
        />

        <StickyPreview 
          channelName={selectedChannelName}
          content={editor.content}
          botInfo={botInfo}
        />
      </div>

      <StickyNoticeList 
        notices={notices}
        channels={channels}
        onEdit={handleEditRequest}
        onDelete={(id) => setConfirmDeleteId(id)}
        deletingChannelId={deletingChannelId}
      />

      <ConfirmDialog 
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={async () => {
          if (confirmDeleteId) {
            await deleteNotice(confirmDeleteId);
            setConfirmDeleteId(null);
          }
        }}
        title="Remove sticky notice?"
        description={
          <p>
            The persistent notice in <strong className="text-white">#{channels.find(c => c.id === confirmDeleteId)?.name || "this channel"}</strong> will be removed and automatic reposting will stop.
          </p>
        }
        confirmText="Remove Notice"
        cancelText="Cancel"
      />
    </div>
  );
}
