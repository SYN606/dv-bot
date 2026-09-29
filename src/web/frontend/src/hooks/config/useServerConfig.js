import { useState, useEffect, useCallback } from "react";
import { getGuildMeta, getConfig, saveConfig } from "../../api/client";

const DEFAULT_CONFIG = {
  modLogChannelId: "",
  vcRoleId: "",
  tempbanRoleId: "",
};

export function useServerConfig(guildId, showToast) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState(DEFAULT_CONFIG);
  
  const [roles, setRoles] = useState([]);
  const [channels, setChannels] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const [meta, serverConfig] = await Promise.all([
        getGuildMeta(guildId),
        getConfig(guildId)
      ]);
      setRoles(meta.roles || []);
      setChannels(meta.channels || []);
      
      if (serverConfig) {
        const loadedConfig = {
          modLogChannelId: serverConfig.modLogChannelId || "",
          vcRoleId: serverConfig.vcRoleId || "",
          tempbanRoleId: serverConfig.tempbanRoleId || "",
        };
        setConfig(loadedConfig);
        setOriginalConfig(loadedConfig);
      }
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err);
      showToast?.({ title: "Error", message: "Failed to load server configuration.", type: "error" });
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

  const reset = () => {
    setConfig(originalConfig);
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  const save = async () => {
    if (!hasChanges) return;
    setSaving(true);
    try {
      await saveConfig(guildId, config);
      setOriginalConfig(config);
      showToast?.({ title: "Success", message: "Server configurations saved successfully!", type: "success" });
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
    roles,
    channels,
    loading,
    error,
    saving,
    hasChanges,
    updateConfig,
    save,
    reset,
    refresh: fetchConfig
  };
}
