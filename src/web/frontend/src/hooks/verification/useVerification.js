import { useState, useEffect, useCallback, useMemo } from "react";
import { 
  getGuildMeta, 
  getVerification, 
  saveVerification, 
  postVerificationButton, 
  resetVerification 
} from "../../api/client";

const DEFAULT_CONFIG = {
  enabled: false,
  channelId: "",
  verifiedRoleId: "",
  unverifiedRoleId: "",
  logChannelId: "",
  mode: "button",
  minAccountAgeHours: 0,
  embedTitle: "Server Verification",
  embedDescription: "🛡️ Click the button below to verify and get access to the server.",
  buttonLabel: "Verify Access",
  buttonEmoji: "✅",
};

export function useVerification(guildId, showToast) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [baselineConfig, setBaselineConfig] = useState(DEFAULT_CONFIG);
  
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [staleRoleAlert, setStaleRoleAlert] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const loadData = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    try {
      const [meta, verif] = await Promise.all([
        getGuildMeta(guildId),
        getVerification(guildId)
      ]);
      
      setChannels(meta.channels || []);
      setRoles(meta.roles || []);
      
      if (verif) {
        setStaleRoleAlert(verif.roleExists === false && !!verif.verified_role_id);
        
        const loadedConfig = {
          enabled: Boolean(verif.enabled),
          channelId: verif.channelId || verif.verify_channel_id || "",
          verifiedRoleId: verif.verifiedRoleId || verif.verified_role_id || "",
          unverifiedRoleId: verif.unverifiedRoleId || verif.unverified_role_id || "",
          logChannelId: verif.logChannelId || verif.log_channel_id || "",
          mode: verif.mode === "captcha" ? "captcha" : "button",
          minAccountAgeHours: Number(verif.minAccountAgeHours || verif.min_account_age_hours || 0),
          embedTitle: verif.embedTitle || verif.embed_title || "Server Verification",
          embedDescription: verif.embedDescription || verif.embed_description || "🛡️ Click the button below to verify and get access to the server.",
          buttonLabel: verif.buttonLabel || verif.button_label || "Verify Access",
          buttonEmoji: verif.buttonEmoji || verif.button_emoji || "✅",
        };
        
        setConfig(loadedConfig);
        setBaselineConfig(loadedConfig);
      }
    } catch (err) {
      console.error(err);
      setError(err);
      showToast?.({ title: "Error", message: "Failed to load Verification configuration.", type: "error" });
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
      await saveVerification(guildId, config);
      setBaselineConfig(config);
      showToast?.({ title: "Success", message: "Verification settings saved!", type: "success" });
      setStaleRoleAlert(false);
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to save settings.", type: "error" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const postPrompt = async () => {
    setPosting(true);
    try {
      await postVerificationButton(guildId, config);
      showToast?.({ title: "Success", message: "Verification prompt sent/updated in channel!", type: "success" });
      setBaselineConfig(config);
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to post prompt.", type: "error" });
      return false;
    } finally {
      setPosting(false);
    }
  };

  const reset = async () => {
    setResetting(true);
    try {
      await resetVerification(guildId);
      setConfig(DEFAULT_CONFIG);
      setBaselineConfig(DEFAULT_CONFIG);
      setStaleRoleAlert(false);
      showToast?.({ title: "Success", message: "Verification configuration completely reset!", type: "success" });
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to reset config.", type: "error" });
    } finally {
      setResetting(false);
    }
  };

  return {
    config,
    channels,
    roles,
    staleRoleAlert,
    loading,
    error,
    saving,
    posting,
    resetting,
    hasChanges,
    updateConfig,
    save,
    postPrompt,
    reset,
    refresh: loadData
  };
}
