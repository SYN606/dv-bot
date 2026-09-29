import { useState, useEffect, useCallback, useMemo } from "react";
import { getGuildMeta, getSticky, saveSticky, deleteSticky } from "../../api/client";

const DEFAULT_EDITOR = {
  channelId: "",
  content: "",
  postNow: true,
};

export function useStickyNotices(guildId, showToast) {
  const [notices, setNotices] = useState([]);
  const [channels, setChannels] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [saving, setSaving] = useState(false);
  const [deletingChannelId, setDeletingChannelId] = useState(null);

  // Editor State
  const [editor, setEditor] = useState(DEFAULT_EDITOR);
  const [editingNotice, setEditingNotice] = useState(null);

  const loadData = useCallback(async (refreshNoticesOnly = false) => {
    if (!guildId) return;
    
    if (!refreshNoticesOnly) {
      setLoading(true);
    }
    setError(null);

    try {
      if (refreshNoticesOnly) {
        const stickyRes = await getSticky(guildId);
        setNotices(stickyRes?.stickyList || []);
      } else {
        const [meta, stickyRes] = await Promise.all([
          getGuildMeta(guildId),
          getSticky(guildId)
        ]);
        setChannels(meta.channels || []);
        setNotices(stickyRes?.stickyList || []);
      }
    } catch (err) {
      console.error(err);
      setError(err);
      showToast?.({ title: "Error", message: "Failed to load sticky notices.", type: "error" });
    } finally {
      if (!refreshNoticesOnly) {
        setLoading(false);
      }
    }
  }, [guildId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync editor state when a notice is selected to edit
  useEffect(() => {
    if (editingNotice) {
      setEditor({
        channelId: editingNotice.channel_id,
        content: editingNotice.content || "",
        postNow: true, // Default to true when editing to ensure updates trigger
      });
    }
  }, [editingNotice]);

  const updateEditor = (field, value) => {
    setEditor(prev => ({ ...prev, [field]: value }));
  };

  const resetEditor = () => {
    setEditingNotice(null);
    setEditor(DEFAULT_EDITOR);
  };

  const hasChanges = useMemo(() => {
    if (!editingNotice) {
      return editor.channelId !== "" || editor.content !== "";
    }
    return editor.channelId !== editingNotice.channel_id || 
           editor.content !== editingNotice.content ||
           !editor.postNow; // if postNow is toggled off, it's a change of behavior
  }, [editor, editingNotice]);

  const createOrUpdate = async () => {
    if (!editor.channelId || !editor.content.trim()) return false;
    
    setSaving(true);
    try {
      await saveSticky(guildId, {
        channelId: editor.channelId,
        content: editor.content.trim(),
        post_now: editor.postNow,
      });
      
      showToast?.({ 
        title: "Success", 
        message: editor.postNow ? "Sticky notice deployed!" : "Sticky notice saved.", 
        type: "success" 
      });
      
      await loadData(true);
      resetEditor();
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to save sticky notice.", type: "error" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteNotice = async (channelId) => {
    setDeletingChannelId(channelId);
    try {
      await deleteSticky(guildId, channelId);
      showToast?.({ title: "Success", message: "Sticky notice removed.", type: "success" });
      
      setNotices(prev => prev.filter(n => n.channel_id !== channelId));
      if (editor.channelId === channelId) {
        resetEditor();
      }
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to remove notice.", type: "error" });
      return false;
    } finally {
      setDeletingChannelId(null);
    }
  };

  const editNotice = (notice) => {
    setEditingNotice(notice);
  };

  const totalRepins = useMemo(() => {
    return notices.reduce((acc, curr) => acc + (curr.repins || 0), 0);
  }, [notices]);

  return {
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
    refresh: () => loadData(true)
  };
}
