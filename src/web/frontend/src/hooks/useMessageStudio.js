import { useState, useEffect, useCallback } from "react";
import {
  getMessageStudioChannels,
  getMessageStudioDrafts,
  saveMessageStudioDraft,
  deleteMessageStudioDraft,
  getMessageStudioTemplates,
  createMessageStudioTemplate,
  updateMessageStudioTemplate,
  duplicateMessageStudioTemplate,
  deleteMessageStudioTemplate,
  publishMessageStudioMessage,
  getMessageStudioHistory,
  editMessageStudioPublishedMessage,
  deleteMessageStudioPublishedMessage,
} from "../api/client";

export function useMessageStudio(guildId, showToast) {
  const [channels, setChannels] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    setError(null);

    try {
      const [channelsData, draftsData, templatesData, historyData] = await Promise.all([
        getMessageStudioChannels(guildId).catch(() => []),
        getMessageStudioDrafts(guildId).catch(() => []),
        getMessageStudioTemplates(guildId).catch(() => []),
        getMessageStudioHistory(guildId, { limit: 50 }).catch(() => []),
      ]);

      setChannels(Array.isArray(channelsData) ? channelsData : []);
      setDrafts(Array.isArray(draftsData) ? draftsData : []);
      setTemplates(Array.isArray(templatesData) ? templatesData : []);
      setHistory(Array.isArray(historyData) ? historyData : []);
    } catch (err) {
      console.error("[useMessageStudio] Failed to load message studio data:", err);
      setError(err?.message || "Failed to load Message Studio data.");
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Draft Mutations
  const handleSaveDraft = async (payload) => {
    try {
      const result = await saveMessageStudioDraft(guildId, payload);
      if (result?.conflict) {
        return result;
      }
      // Update local drafts list
      const updatedDraft = result?.draft || result;
      setDrafts((prev) => {
        const idx = prev.findIndex((d) => d.id === updatedDraft.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updatedDraft;
          return next;
        }
        return [updatedDraft, ...prev];
      });
      return { draft: updatedDraft, ...result };
    } catch (err) {
      showToast?.(err?.message || "Failed to save draft.", "error");
      throw err;
    }
  };

  const handleDeleteDraft = async (draftId) => {
    try {
      await deleteMessageStudioDraft(guildId, draftId);
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      showToast?.("Draft deleted.", "success");
    } catch (err) {
      showToast?.(err?.message || "Failed to delete draft.", "error");
    }
  };

  // Template Mutations
  const handleCreateTemplate = async (payload) => {
    try {
      const created = await createMessageStudioTemplate(guildId, payload);
      setTemplates((prev) => [created, ...prev]);
      return created;
    } catch (err) {
      showToast?.(err?.message || "Failed to save template.", "error");
      throw err;
    }
  };

  const handleUpdateTemplate = async (templateId, payload) => {
    try {
      const updated = await updateMessageStudioTemplate(guildId, templateId, payload);
      setTemplates((prev) => prev.map((t) => (t.id === templateId ? updated : t)));
      return updated;
    } catch (err) {
      showToast?.(err?.message || "Failed to update template.", "error");
      throw err;
    }
  };

  const handleDuplicateTemplate = async (templateId) => {
    try {
      const duplicated = await duplicateMessageStudioTemplate(guildId, templateId);
      setTemplates((prev) => [duplicated, ...prev]);
      showToast?.(`Duplicated template "${duplicated.name}".`, "success");
      return duplicated;
    } catch (err) {
      showToast?.(err?.message || "Failed to duplicate template.", "error");
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    try {
      await deleteMessageStudioTemplate(guildId, templateId);
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      showToast?.("Template deleted.", "success");
    } catch (err) {
      showToast?.(err?.message || "Failed to delete template.", "error");
    }
  };

  // Publishing
  const handlePublishMessage = async (publishPayload) => {
    try {
      const result = await publishMessageStudioMessage(guildId, publishPayload);
      // Refresh history
      const freshHistory = await getMessageStudioHistory(guildId, { limit: 50 }).catch(() => null);
      if (Array.isArray(freshHistory)) {
        setHistory(freshHistory);
      }
      return result;
    } catch (err) {
      showToast?.(err?.message || "Failed to publish message.", "error");
      throw err;
    }
  };

  const handleEditPublishedMessage = async (messageId, channelId, payload) => {
    try {
      const result = await editMessageStudioPublishedMessage(guildId, messageId, {
        channel_id: channelId,
        payload,
      });
      // Refresh history
      const freshHistory = await getMessageStudioHistory(guildId, { limit: 50 }).catch(() => null);
      if (Array.isArray(freshHistory)) {
        setHistory(freshHistory);
      }
      showToast?.("Live Discord message edited successfully.", "success");
      return result;
    } catch (err) {
      showToast?.(err?.message || "Failed to edit live message.", "error");
      throw err;
    }
  };

  const handleDeletePublishedMessage = async (messageId, channelId) => {
    try {
      await deleteMessageStudioPublishedMessage(guildId, messageId, channelId);
      // Mark as deleted in local history
      setHistory((prev) =>
        prev.map((h) =>
          h.message_id === messageId ? { ...h, status: "deleted" } : h
        )
      );
      showToast?.("Live message deleted from Discord.", "success");
    } catch (err) {
      showToast?.(err?.message || "Failed to delete live message.", "error");
    }
  };

  return {
    channels,
    drafts,
    templates,
    history,
    loading,
    error,
    saveDraft: handleSaveDraft,
    deleteDraft: handleDeleteDraft,
    createTemplate: handleCreateTemplate,
    updateTemplate: handleUpdateTemplate,
    duplicateTemplate: handleDuplicateTemplate,
    deleteTemplate: handleDeleteTemplate,
    publishMessage: handlePublishMessage,
    editPublishedMessage: handleEditPublishedMessage,
    deletePublishedMessage: handleDeletePublishedMessage,
    refresh: fetchAll,
  };
}
