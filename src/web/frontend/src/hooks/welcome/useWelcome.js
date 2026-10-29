import { useState, useEffect, useCallback, useMemo } from "react";
import { getGuildMeta, getWelcomeConfig, updateWelcomeConfig, sendTestWelcomeMessage } from "../../api/client";

const DEFAULT_WELCOME_CONFIG = {
  welcome_enabled: false,
  welcome_channel_id: "",
  welcome_message: "Hey {user}, welcome to **{server}**! Glad to have you here. You are member #{memberCount}! 🎉",
  welcome_is_embed: true,
  welcome_embed_title: "Welcome to {server}!",
  welcome_embed_color: "#6366F1",
  welcome_embed_footer: "Member #{memberCount}",
  welcome_show_thumbnail: true,
  welcome_image_url: "",
  welcome_ping_user: true,
  welcome_delete_seconds: 0,
  dm_enabled: false,
  dm_message: "Welcome to **{server}**, {username}! Please check out our rules and enjoy your stay.",
  leave_enabled: false,
  leave_channel_id: "",
  leave_message: "{username} has left the server. We are down to {memberCount} members.",
  leave_is_embed: false,
  leave_embed_title: "Goodbye!",
  leave_embed_color: "#F43F5E",
  autorole_enabled: false,
  join_role_ids: [],
  bot_role_id: "",
};

export function useWelcome(guildId, showToast) {
  const [config, setConfig] = useState(DEFAULT_WELCOME_CONFIG);
  const [baselineConfig, setBaselineConfig] = useState(DEFAULT_WELCOME_CONFIG);

  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [guildMeta, setGuildMeta] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    try {
      const [meta, welcome] = await Promise.all([
        getGuildMeta(guildId),
        getWelcomeConfig(guildId),
      ]);

      setChannels(meta.channels || []);
      setRoles(meta.roles || []);
      setGuildMeta(meta);

      if (welcome) {
        const parsed = {
          welcome_enabled: Boolean(welcome.welcome_enabled),
          welcome_channel_id: welcome.welcome_channel_id || "",
          welcome_message: welcome.welcome_message ?? DEFAULT_WELCOME_CONFIG.welcome_message,
          welcome_is_embed: Boolean(welcome.welcome_is_embed),
          welcome_embed_title: welcome.welcome_embed_title ?? DEFAULT_WELCOME_CONFIG.welcome_embed_title,
          welcome_embed_color: welcome.welcome_embed_color || DEFAULT_WELCOME_CONFIG.welcome_embed_color,
          welcome_embed_footer: welcome.welcome_embed_footer ?? DEFAULT_WELCOME_CONFIG.welcome_embed_footer,
          welcome_show_thumbnail: Boolean(welcome.welcome_show_thumbnail),
          welcome_image_url: welcome.welcome_image_url || "",
          welcome_ping_user: Boolean(welcome.welcome_ping_user),
          welcome_delete_seconds: Number(welcome.welcome_delete_seconds || 0),

          dm_enabled: Boolean(welcome.dm_enabled),
          dm_message: welcome.dm_message ?? DEFAULT_WELCOME_CONFIG.dm_message,

          leave_enabled: Boolean(welcome.leave_enabled),
          leave_channel_id: welcome.leave_channel_id || "",
          leave_message: welcome.leave_message ?? DEFAULT_WELCOME_CONFIG.leave_message,
          leave_is_embed: Boolean(welcome.leave_is_embed),
          leave_embed_title: welcome.leave_embed_title ?? DEFAULT_WELCOME_CONFIG.leave_embed_title,
          leave_embed_color: welcome.leave_embed_color || DEFAULT_WELCOME_CONFIG.leave_embed_color,

          autorole_enabled: Boolean(welcome.autorole_enabled),
          join_role_ids: Array.isArray(welcome.join_role_ids) ? welcome.join_role_ids : [],
          bot_role_id: welcome.bot_role_id || "",
        };

        setConfig(parsed);
        setBaselineConfig(parsed);
      }
    } catch (err) {
      console.error("[useWelcome error]:", err);
      setError(err);
      showToast?.({ title: "Error", message: "Failed to load Welcome configuration", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [guildId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateConfig = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(baselineConfig) !== JSON.stringify(config);
  }, [baselineConfig, config]);

  const save = async () => {
    setSaving(true);
    try {
      await updateWelcomeConfig(guildId, config);
      setBaselineConfig(config);
      showToast?.({
        title: "Configuration Saved",
        message: "Welcome and Leave settings applied successfully!",
        type: "success",
      });
      return true;
    } catch (err) {
      console.error("[useWelcome save error]:", err);
      showToast?.({
        title: "Save Failed",
        message: err.message || "Failed to update Welcome settings.",
        type: "error",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = useCallback(() => {
    setConfig(baselineConfig);
  }, [baselineConfig]);

  const sendTest = async (type = "channel") => {
    setTesting(true);
    try {
      const res = await sendTestWelcomeMessage(guildId, { type });
      if (res?.success) {
        showToast?.({
          title: "Test Dispatched",
          message: res.message || "Test message sent successfully!",
          type: "success",
        });
      } else {
        showToast?.({
          title: "Dispatch Failed",
          message: res?.message || "Failed to deliver test message.",
          type: "error",
        });
      }
    } catch (err) {
      showToast?.({
        title: "Error",
        message: err.message || "Failed to dispatch test message.",
        type: "error",
      });
    } finally {
      setTesting(false);
    }
  };

  const insertVariable = (field, variableTag) => {
    setConfig((prev) => {
      const currentVal = prev[field] || "";
      return {
        ...prev,
        [field]: currentVal ? `${currentVal} ${variableTag}` : variableTag,
      };
    });
  };

  return {
    config,
    baselineConfig,
    channels,
    roles,
    guildMeta,
    loading,
    saving,
    testing,
    error,
    hasChanges,
    updateConfig,
    save,
    discardChanges,
    sendTest,
    insertVariable,
    refresh: loadData,
  };
}
