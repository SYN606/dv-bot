import { useState, useEffect, useCallback } from "react";
import { getGuildMeta, getAutoRoleConfig, setAutoRoleConfig } from "../../api/client";

const DEFAULT_CONFIG = {
  enabled: 0,
  announcement_channel_id: "",
  top_chat_role_1: "",
  top_chat_role_2: "",
  top_chat_role_3: "",
  top_vc_role_1: "",
  top_vc_role_2: "",
  top_vc_role_3: "",
};

export function useAutoRoleRewards(guildId, showToast) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState(DEFAULT_CONFIG);
  
  const [blacklist, setBlacklist] = useState([]);
  const [originalBlacklist, setOriginalBlacklist] = useState([]);
  
  const [roles, setRoles] = useState([]);
  const [channels, setChannels] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const [meta, data] = await Promise.all([
        getGuildMeta(guildId),
        getAutoRoleConfig(guildId)
      ]);
      setRoles(meta.roles || []);
      setChannels(meta.channels || []);
      
      if (data) {
        const loadedConfig = { ...DEFAULT_CONFIG, ...(data.config || {}) };
        setConfig(loadedConfig);
        setOriginalConfig(loadedConfig);
        
        const loadedBlacklist = data.blacklist || [];
        setBlacklist(loadedBlacklist);
        setOriginalBlacklist(loadedBlacklist);
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err);
      showToast?.({ title: "Error", message: "Failed to load Auto-Role configuration.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [guildId, showToast]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateBlacklist = (newBlacklist) => {
    setBlacklist(newBlacklist);
  };

  const resetChanges = () => {
    setConfig(originalConfig);
    setBlacklist(originalBlacklist);
  };

  const hasUnsavedChanges = 
    JSON.stringify(config) !== JSON.stringify(originalConfig) ||
    JSON.stringify(blacklist) !== JSON.stringify(originalBlacklist);

  const saveConfig = async () => {
    if (!hasUnsavedChanges) return;
    setSaving(true);
    try {
      const toAdd = blacklist.filter(id => !originalBlacklist.includes(id));
      const toRemove = originalBlacklist.filter(id => !blacklist.includes(id));
      
      await setAutoRoleConfig(guildId, {
        config,
        blacklist,
        blacklist_add: toAdd,
        blacklist_remove: toRemove
      });
      
      setOriginalConfig(config);
      setOriginalBlacklist(blacklist);
      showToast?.({ title: "Success", message: "Auto-Role Rewards configuration saved!", type: "success" });
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to save configuration.", type: "error" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    config,
    blacklist,
    roles,
    channels,
    loading,
    error,
    saving,
    hasUnsavedChanges,
    updateConfig,
    updateBlacklist,
    resetChanges,
    saveConfig,
    refresh: fetchConfig
  };
}
