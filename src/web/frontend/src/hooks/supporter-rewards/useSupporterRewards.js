import { useState, useEffect, useCallback, useMemo } from "react";
import { getGuildMeta, getSupporterConfig, setSupporterConfig } from "../../api/client";

const DEFAULT_CONFIG = {
  enabled: false,
  vanity_text: "",
  vanity_role_id: "",
  vanity_channel_id: "",
  vanity_message: "",
  clan_role_id: "",
  clan_channel_id: "",
  clan_message: ""
};

export function useSupporterRewards(guildId, showToast) {
  const [baselineConfig, setBaselineConfig] = useState(DEFAULT_CONFIG);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    try {
      const [meta, conf] = await Promise.all([
        getGuildMeta(guildId),
        getSupporterConfig(guildId)
      ]);
      setChannels(meta.channels || []);
      setRoles(meta.roles || []);
      
      const loadedConf = conf || DEFAULT_CONFIG;
      setBaselineConfig(loadedConf);
      setConfig(loadedConf);
    } catch (err) {
      console.error(err);
      setError(err);
      showToast?.({ title: "Error", message: "Failed to load supporter configuration.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [guildId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateConfig = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(baselineConfig) !== JSON.stringify(config);
  }, [baselineConfig, config]);

  const save = async () => {
    setSaving(true);
    try {
      await setSupporterConfig(guildId, config);
      setBaselineConfig(config);
      showToast?.({ title: "Success", message: "Supporter Rewards configuration saved!", type: "success" });
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to save configuration.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setConfig(baselineConfig);
  };

  return {
    config,
    channels,
    roles,
    loading,
    error,
    saving,
    hasChanges,
    updateConfig,
    save,
    reset,
    refresh: loadData
  };
}
