import { useState, useEffect, useCallback } from "react";
import { getGuildMeta, getMediaOnly, addMediaOnly, deleteMediaOnly } from "../../api/client";

export function useMediaOnly(guildId, showToast) {
  const [rules, setRules] = useState([]);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [creating, setCreating] = useState(false);
  const [deletingChannelId, setDeletingChannelId] = useState(null);

  const fetchRules = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const [meta, mediaData] = await Promise.all([
        getGuildMeta(guildId),
        getMediaOnly(guildId)
      ]);
      setChannels(meta.channels || []);
      setRoles(meta.roles || []);
      setRules(mediaData || []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err);
      showToast?.({ title: "Error", message: "Failed to load media rules.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [guildId, showToast]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const createRule = async (ruleConfig) => {
    setCreating(true);
    try {
      await addMediaOnly(guildId, {
        channel_id: ruleConfig.channelId,
        image_only: ruleConfig.imageOnly,
        whitelist_role_id: ruleConfig.whitelistRoleId || null,
        nsfw_bypass: ruleConfig.allowNsfw,
        auto_mute: ruleConfig.autoMute,
        post_sticky_notice: ruleConfig.postStickyNotice,
      });
      showToast?.({ title: "Success", message: "Media rule created successfully!", type: "success" });
      await fetchRules(); // Refresh rules to get new data
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to configure media rule.", type: "error" });
      return false;
    } finally {
      setCreating(false);
    }
  };

  const deleteRule = async (channelId) => {
    setDeletingChannelId(channelId);
    try {
      await deleteMediaOnly(guildId, channelId);
      showToast?.({ title: "Success", message: "Media restriction removed.", type: "success" });
      
      // Optimistic update
      setRules(prev => prev.filter(r => r.channel_id !== channelId));
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to remove media restriction.", type: "error" });
      return false;
    } finally {
      setDeletingChannelId(null);
    }
  };

  return {
    rules,
    channels,
    roles,
    loading,
    error,
    creating,
    deletingChannelId,
    refresh: fetchRules,
    createRule,
    deleteRule
  };
}
