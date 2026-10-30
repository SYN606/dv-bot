import { useState, useEffect, useCallback, useMemo } from "react";
import { getGuildMeta, getWelcomeConfig, updateWelcomeConfig, sendTestWelcomeMessage } from "../../api/client";

const DEFAULT_WELCOME_CONFIG = {
  welcome_enabled: false,
  welcome_channel_id: "",
  welcome_message: "Hey {user}, welcome to **{server}**! Glad to have you here. You are member #{memberCount}! 🎉",
  welcome_is_embed: true,
  welcome_embed_title: "Welcome to {server}!",
  welcome_embed_title_url: "",
  welcome_embed_author: "",
  welcome_embed_author_icon: "",
  welcome_embed_author_url: "",
  welcome_embed_color: "#6366F1",
  welcome_embed_footer: "Member #{memberCount}",
  welcome_embed_footer_icon: "",
  welcome_embed_fields: [],
  welcome_show_thumbnail: true,
  welcome_thumbnail_type: "user_avatar",
  welcome_thumbnail_custom: "",
  welcome_image_url: "",
  welcome_ping_user: true,
  welcome_delete_seconds: 0,
  welcome_show_timestamp: true,

  dm_enabled: false,
  dm_message: "Welcome to **{server}**, {username}! Please check out our rules and enjoy your stay.",
  dm_is_embed: false,
  dm_embed_title: "Welcome to {server}!",
  dm_embed_color: "#10B981",
  dm_embed_footer: "{server}",
  dm_show_thumbnail: true,

  leave_enabled: false,
  leave_channel_id: "",
  leave_message: "{username} has left the server. We are down to {memberCount} members.",
  leave_is_embed: false,
  leave_embed_title: "Goodbye!",
  leave_embed_color: "#F43F5E",
  leave_embed_footer: "Remaining: {memberCount} members",
  leave_show_thumbnail: true,
  leave_image_url: "",

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
        let parsedFields = [];
        try {
          parsedFields = typeof welcome.welcome_embed_fields === "string"
            ? JSON.parse(welcome.welcome_embed_fields || "[]")
            : (welcome.welcome_embed_fields || []);
        } catch (_) {
          parsedFields = [];
        }

        const parsed = {
          welcome_enabled: Boolean(welcome.welcome_enabled),
          welcome_channel_id: welcome.welcome_channel_id || "",
          welcome_message: welcome.welcome_message ?? DEFAULT_WELCOME_CONFIG.welcome_message,
          welcome_is_embed: Boolean(welcome.welcome_is_embed),
          welcome_embed_title: welcome.welcome_embed_title ?? DEFAULT_WELCOME_CONFIG.welcome_embed_title,
          welcome_embed_title_url: welcome.welcome_embed_title_url || "",
          welcome_embed_author: welcome.welcome_embed_author || "",
          welcome_embed_author_icon: welcome.welcome_embed_author_icon || "",
          welcome_embed_author_url: welcome.welcome_embed_author_url || "",
          welcome_embed_color: welcome.welcome_embed_color || DEFAULT_WELCOME_CONFIG.welcome_embed_color,
          welcome_embed_footer: welcome.welcome_embed_footer ?? DEFAULT_WELCOME_CONFIG.welcome_embed_footer,
          welcome_embed_footer_icon: welcome.welcome_embed_footer_icon || "",
          welcome_embed_fields: Array.isArray(parsedFields) ? parsedFields : [],
          welcome_show_thumbnail: Boolean(welcome.welcome_show_thumbnail ?? true),
          welcome_thumbnail_type: welcome.welcome_thumbnail_type || "user_avatar",
          welcome_thumbnail_custom: welcome.welcome_thumbnail_custom || "",
          welcome_image_url: welcome.welcome_image_url || "",
          welcome_ping_user: Boolean(welcome.welcome_ping_user ?? true),
          welcome_delete_seconds: Number(welcome.welcome_delete_seconds || 0),
          welcome_show_timestamp: Boolean(welcome.welcome_show_timestamp ?? true),

          dm_enabled: Boolean(welcome.dm_enabled),
          dm_message: welcome.dm_message ?? DEFAULT_WELCOME_CONFIG.dm_message,
          dm_is_embed: Boolean(welcome.dm_is_embed),
          dm_embed_title: welcome.dm_embed_title ?? DEFAULT_WELCOME_CONFIG.dm_embed_title,
          dm_embed_color: welcome.dm_embed_color || DEFAULT_WELCOME_CONFIG.dm_embed_color,
          dm_embed_footer: welcome.dm_embed_footer ?? DEFAULT_WELCOME_CONFIG.dm_embed_footer,
          dm_show_thumbnail: Boolean(welcome.dm_show_thumbnail ?? true),

          leave_enabled: Boolean(welcome.leave_enabled),
          leave_channel_id: welcome.leave_channel_id || "",
          leave_message: welcome.leave_message ?? DEFAULT_WELCOME_CONFIG.leave_message,
          leave_is_embed: Boolean(welcome.leave_is_embed),
          leave_embed_title: welcome.leave_embed_title ?? DEFAULT_WELCOME_CONFIG.leave_embed_title,
          leave_embed_color: welcome.leave_embed_color || DEFAULT_WELCOME_CONFIG.leave_embed_color,
          leave_embed_footer: welcome.leave_embed_footer ?? DEFAULT_WELCOME_CONFIG.leave_embed_footer,
          leave_show_thumbnail: Boolean(welcome.leave_show_thumbnail ?? true),
          leave_image_url: welcome.leave_image_url || "",

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

  const sendTest = async (optionsOrType: any = "channel", customChannelId: any = null, customAutoDelete: any = 0) => {
    let type = "channel";
    let channelId = customChannelId;
    let autoDeleteSeconds = customAutoDelete;
    let overrideConfig = null;

    if (typeof optionsOrType === "string") {
      type = optionsOrType;
    } else if (optionsOrType && typeof optionsOrType === "object") {
      type = optionsOrType.type || "channel";
      channelId = optionsOrType.channelId ?? customChannelId;
      autoDeleteSeconds = optionsOrType.autoDeleteSeconds ?? customAutoDelete;
      overrideConfig = optionsOrType.config ?? null;
    }

    const activeCfg = overrideConfig || config;
    if (type === "channel" && !channelId && !activeCfg?.welcome_channel_id) {
      showToast?.({
        title: "No Channel Selected",
        message: "Please select a Welcome Channel in the settings below first, or choose a sandbox channel in the test dialog.",
        type: "error",
      });
      return false;
    }
    if (type === "leave" && !channelId && !activeCfg?.leave_channel_id) {
      showToast?.({
        title: "No Channel Selected",
        message: "Please select a Goodbye Channel in the settings below first, or choose a sandbox channel in the test dialog.",
        type: "error",
      });
      return false;
    }

    setTesting(true);
    try {
      const res = await sendTestWelcomeMessage(guildId, {
        type,
        channelId,
        autoDeleteSeconds,
        config: activeCfg,
      });
      if (res?.success) {
        showToast?.({
          title: "Test Dispatched",
          message: res.message || "Test message sent successfully!",
          type: "success",
        });
        return true;
      } else {
        showToast?.({
          title: "Dispatch Failed",
          message: res?.message || "Failed to deliver test message.",
          type: "error",
        });
        return false;
      }
    } catch (err: any) {
      showToast?.({
        title: "Error",
        message: err.message || "Failed to dispatch test message.",
        type: "error",
      });
      return false;
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
