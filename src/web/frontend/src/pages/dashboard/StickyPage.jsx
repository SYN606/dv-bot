import React, { useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { useStickyNotices } from "../../hooks/sticky";
import { useModuleStatus } from "../../hooks/useModuleStatus";
import { ConfirmDialog, PageError, PageSkeleton } from "../../components/ui";

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
  const { enabled: moduleEnabled, toggle: toggleModule } = useModuleStatus(guildId, "sticky", showToast);

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
      <PageError
        title="Unable to load sticky notices"
        onRetry={refresh}
      />
    );
  }

  if (loading && channels.length === 0) {
    return <PageSkeleton cards={2} rows={2} />;
  }

  const selectedChannelName = channels.find(c => c.id === editor.channelId)?.name;

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-32">
      <StickyHeader 
        activeCount={notices.length} 
        totalRepins={totalRepins} 
        enabled={moduleEnabled}
        onToggle={toggleModule}
      />

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
