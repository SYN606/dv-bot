import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getGuildMeta,
  getConfessionConfig,
  updateConfessionConfig,
  testConfessionFilter,
  sendConfessionPanel,
} from "../../api/client";

export const DEFAULT_CONFESSION_CONFIG = {
  enabled: false,
  channel_id: "",
  review_channel_id: "",
  reviewer_role_ids: [],
  show_author_in_review: true,
  allow_anonymous: true,
  require_approval: true,
  auto_thread: true,
  cooldown_seconds: 60,
  banned_words: "",
  regex_filter: "",
  regex_filter_enabled: false,
};

export function useConfessions(guildId: string, showToast?: any) {
  const [config, setConfig] = useState<any>(DEFAULT_CONFESSION_CONFIG);
  const [initialConfig, setInitialConfig] = useState<any>(DEFAULT_CONFESSION_CONFIG);
  const [channels, setChannels] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingPanel, setSendingPanel] = useState(false);
  const [testingFilter, setTestingFilter] = useState(false);
  const [filterTestResult, setFilterTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    setError(null);

    try {
      const [meta, configRes] = await Promise.all([
        getGuildMeta(guildId),
        getConfessionConfig(guildId),
      ]);

      const textChannels = (meta?.channels || []).filter(
        (ch: any) => ch.type === 0 || ch.type === 5 || ch.type === undefined
      );

      setChannels(textChannels.length > 0 ? textChannels : meta?.channels || []);
      setRoles(meta?.roles || []);

      const safeConfig = {
        ...DEFAULT_CONFESSION_CONFIG,
        ...(configRes || {}),
        channel_id: configRes?.channel_id || "",
        review_channel_id: configRes?.review_channel_id || "",
        reviewer_role_ids: Array.isArray(configRes?.reviewer_role_ids) ? configRes.reviewer_role_ids : [],
      };

      setConfig(safeConfig);
      setInitialConfig(safeConfig);
    } catch (err: any) {
      console.error("[CONFESSION HOOK ERROR]:", err);
      setError(err.message || "Failed to load confession settings.");
      showToast?.("Failed to load confession configuration", "error");
    } finally {
      setLoading(false);
    }
  }, [guildId, showToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateConfig = useCallback((key: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const hasChanges = useMemo(() => {
    return JSON.stringify(config) !== JSON.stringify(initialConfig);
  }, [config, initialConfig]);

  const save = useCallback(async () => {
    if (!guildId) return;
    setSaving(true);

    try {
      const res = await updateConfessionConfig(guildId, config);
      const updated = {
        ...DEFAULT_CONFESSION_CONFIG,
        ...(res?.config || config),
        channel_id: res?.config?.channel_id || config.channel_id,
        review_channel_id: res?.config?.review_channel_id || config.review_channel_id,
        reviewer_role_ids: res?.config?.reviewer_role_ids || config.reviewer_role_ids,
      };

      setConfig(updated);
      setInitialConfig(updated);
      showToast?.("Confession settings saved successfully!", "success");
      return updated;
    } catch (err: any) {
      console.error("[CONFESSION SAVE ERROR]:", err);
      showToast?.(err.message || "Failed to save confession settings", "error");
      throw err;
    } finally {
      setSaving(false);
    }
  }, [guildId, config, showToast]);

  const discardChanges = useCallback(() => {
    setConfig(initialConfig);
    showToast?.("Unsaved changes discarded", "info");
  }, [initialConfig, showToast]);

  const testFilter = useCallback(
    async (sampleText: string) => {
      if (!guildId || !sampleText.trim()) {
        setFilterTestResult(null);
        return;
      }
      setTestingFilter(true);
      try {
        const res = await testConfessionFilter(guildId, {
          text: sampleText,
          banned_words: config.banned_words,
          regex_filter: config.regex_filter,
        });
        setFilterTestResult(res);
      } catch (err: any) {
        setFilterTestResult({
          flagged: true,
          matched: "Error",
          reason: err.message,
        });
      } finally {
        setTestingFilter(false);
      }
    },
    [guildId, config.banned_words, config.regex_filter]
  );

  const sendPanel = useCallback(async () => {
    if (!guildId) return;
    if (!config.channel_id) {
      showToast?.("Please choose and save a public confession channel first.", "error");
      return;
    }

    setSendingPanel(true);
    try {
      const res = await sendConfessionPanel(guildId);
      showToast?.(res.message || "Confession button panel posted to channel!", "success");
    } catch (err: any) {
      showToast?.(err.message || "Failed to send confession panel", "error");
    } finally {
      setSendingPanel(false);
    }
  }, [guildId, config.channel_id, showToast]);

  return {
    config,
    channels,
    roles,
    loading,
    saving,
    sendingPanel,
    hasChanges,
    testingFilter,
    filterTestResult,
    error,
    updateConfig,
    save,
    discardChanges,
    testFilter,
    sendPanel,
    refresh: fetchAll,
  };
}
