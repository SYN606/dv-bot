import { useState, useEffect, useCallback } from "react";
import {
  getGuildMeta,
  getCommands,
  toggleCommand,
  toggleCommandModule,
  bulkToggleCommands,
  resetChannelRestrictions,
  resetAllCommandRestrictions,
  setCommandChannelRule,
  clearCommandChannelRule,
} from "../../api/client";

export function useCommandRestrictions(guildId, showToast) {
  const [selectedChannel, setSelectedChannel] = useState("global");
  const [channels, setChannels] = useState([]);
  const [data, setData] = useState({
    commands: [],
    disabled: [],
    guildDisabled: [],
    channelDisabled: [],
    channelRules: {},
    modules: [],
    scope: "guild",
    stats: { total: 0, active: 0, disabled: 0, protected: 0, guildDisabledCount: 0, channelDisabledCount: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCommands, setPendingCommands] = useState(new Set());
  const [pendingModules, setPendingModules] = useState(new Set());
  const [isBulkPending, setIsBulkPending] = useState(false);

  // 1. Fetch Channels
  useEffect(() => {
    if (!guildId) return;
    getGuildMeta(guildId)
      .then((meta) => {
        const textChannels = (meta.channels || []).filter((ch) => ch.type === 0 || ch.type === 5 || ch.type === undefined);
        setChannels(textChannels.length > 0 ? textChannels : meta.channels || []);
      })
      .catch((err) => {
        console.error("Failed to load channels:", err);
      });
  }, [guildId]);

  // 2. Fetch Commands
  const fetchCommands = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const res = await getCommands(guildId, selectedChannel);
      setData({
        commands: res.commands || [],
        disabled: res.disabled || [],
        guildDisabled: res.guildDisabled || [],
        channelDisabled: res.channelDisabled || [],
        channelRules: res.channelRules || {},
        modules: res.modules || [],
        scope: res.scope || (selectedChannel === "global" ? "guild" : "channel"),
        channelId: res.channelId || null,
        stats: res.stats || {
          total: (res.commands || []).length,
          active: Math.max(0, (res.commands || []).length - (res.disabled || []).length),
          disabled: (res.disabled || []).length,
          protected: (res.commands || []).filter((c) => c.isProtected).length,
          guildDisabledCount: (res.guildDisabled || []).length,
          channelDisabledCount: (res.channelDisabled || []).length,
        },
      });
      setError(null);
    } catch (err) {
      console.error("Failed to fetch commands:", err);
      setError(err);
      showToast?.({ title: "Error", message: "Failed to load command restrictions.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [guildId, selectedChannel, showToast]);

  useEffect(() => {
    fetchCommands();
  }, [fetchCommands]);

  // Toggle single command (supports forceGlobal = true to enable/disable globally even in channel view)
  const handleToggleCommand = async (commandName, currentlyDisabled, forceGlobal = false) => {
    const nextEnable = currentlyDisabled;
    setPendingCommands((prev) => new Set(prev).add(commandName));

    const targetChannel = forceGlobal ? null : (selectedChannel === "global" ? null : selectedChannel);

    try {
      const res = await toggleCommand(guildId, {
        channelId: targetChannel,
        commandName,
        enable: nextEnable,
      });

      if (res && res.commands) {
        setData({
          commands: res.commands || [],
          disabled: res.disabled || [],
          guildDisabled: res.guildDisabled || [],
          channelDisabled: res.channelDisabled || [],
          modules: res.modules || [],
          scope: res.scope || (selectedChannel === "global" ? "guild" : "channel"),
          channelId: res.channelId || null,
          stats: res.stats || data.stats,
        });
      } else {
        await fetchCommands();
      }

      showToast?.({
        title: "Success",
        message: `Command /${commandName} ${nextEnable ? "enabled" : "disabled"} ${targetChannel ? "in channel" : "server-wide"}.`,
        type: "success",
      });
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to update command.", type: "error" });
      return false;
    } finally {
      setPendingCommands((prev) => {
        const next = new Set(prev);
        next.delete(commandName);
        return next;
      });
    }
  };

  // Toggle entire category
  const handleToggleModule = async (moduleId, shouldEnableAll) => {
    setPendingModules((prev) => new Set(prev).add(moduleId));

    const targetChannel = selectedChannel === "global" ? null : selectedChannel;

    try {
      const res = await toggleCommandModule(guildId, {
        channelId: targetChannel,
        category: moduleId,
        enable: shouldEnableAll,
      });

      if (res && res.commands) {
        setData({
          commands: res.commands || [],
          disabled: res.disabled || [],
          guildDisabled: res.guildDisabled || [],
          channelDisabled: res.channelDisabled || [],
          modules: res.modules || [],
          scope: res.scope || (selectedChannel === "global" ? "guild" : "channel"),
          channelId: res.channelId || null,
          stats: res.stats || data.stats,
        });
      } else {
        await fetchCommands();
      }

      showToast?.({
        title: "Success",
        message: `Category ${moduleId.toUpperCase()} ${shouldEnableAll ? "enabled" : "disabled"} ${targetChannel ? "in channel" : "server-wide"}.`,
        type: "success",
      });
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to update category.", type: "error" });
      return false;
    } finally {
      setPendingModules((prev) => {
        const next = new Set(prev);
        next.delete(moduleId);
        return next;
      });
    }
  };

  // Bulk toggle all commands
  const handleBulkToggle = async (shouldEnableAll) => {
    setIsBulkPending(true);
    const targetChannel = selectedChannel === "global" ? null : selectedChannel;

    try {
      const res = await bulkToggleCommands(guildId, {
        channelId: targetChannel,
        enable: shouldEnableAll,
      });

      if (res && res.commands) {
        setData({
          commands: res.commands || [],
          disabled: res.disabled || [],
          guildDisabled: res.guildDisabled || [],
          channelDisabled: res.channelDisabled || [],
          modules: res.modules || [],
          scope: res.scope || (selectedChannel === "global" ? "guild" : "channel"),
          channelId: res.channelId || null,
          stats: res.stats || data.stats,
        });
      } else {
        await fetchCommands();
      }

      showToast?.({
        title: "Success",
        message: `All commands ${shouldEnableAll ? "enabled" : "disabled"} ${targetChannel ? "in channel" : "server-wide"}.`,
        type: "success",
      });
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed bulk update.", type: "error" });
      return false;
    } finally {
      setIsBulkPending(false);
    }
  };

  // Reset channel overrides back to global policy
  const handleResetChannel = async () => {
    if (!selectedChannel || selectedChannel === "global") return false;
    setIsBulkPending(true);

    try {
      const res = await resetChannelRestrictions(guildId, selectedChannel);

      if (res && res.commands) {
        setData({
          commands: res.commands || [],
          disabled: res.disabled || [],
          guildDisabled: res.guildDisabled || [],
          channelDisabled: res.channelDisabled || [],
          modules: res.modules || [],
          scope: res.scope || "channel",
          channelId: selectedChannel,
          stats: res.stats || data.stats,
        });
      } else {
        await fetchCommands();
      }

      showToast?.({
        title: "Channel Overrides Cleared",
        message: "Channel restrictions have been reset to match server-wide policy.",
        type: "success",
      });
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to reset channel.", type: "error" });
      return false;
    } finally {
      setIsBulkPending(false);
    }
  };

  // Reset ALL permissions & restrictions across the entire server, wiping all DB entries
  const handleResetAll = async () => {
    setIsBulkPending(true);
    try {
      const res = await resetAllCommandRestrictions(guildId);
      if (res && res.commands) {
        setData({
          commands: res.commands || [],
          disabled: res.disabled || [],
          guildDisabled: res.guildDisabled || [],
          channelDisabled: res.channelDisabled || [],
          channelRules: res.channelRules || {},
          modules: res.modules || [],
          scope: res.scope || (selectedChannel === "global" ? "guild" : "channel"),
          channelId: res.channelId || null,
          stats: res.stats || data.stats,
        });
      } else {
        await fetchCommands();
      }

      showToast?.({
        title: "All Permissions Reset",
        message: "All command restrictions and custom toggles have been removed from the database.",
        type: "success",
      });
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to reset all permissions.", type: "error" });
      return false;
    } finally {
      setIsBulkPending(false);
    }
  };

  // Set "enable only in" or "disable only in" channel rule for command or category
  const handleSaveChannelRule = async (feature, mode, channelList) => {
    setIsBulkPending(true);
    try {
      const res = await setCommandChannelRule(guildId, {
        feature,
        mode,
        channels: channelList,
        channelId: selectedChannel === "global" ? null : selectedChannel,
      });

      if (res && res.commands) {
        setData({
          commands: res.commands || [],
          disabled: res.disabled || [],
          guildDisabled: res.guildDisabled || [],
          channelDisabled: res.channelDisabled || [],
          channelRules: res.channelRules || {},
          modules: res.modules || [],
          scope: res.scope || (selectedChannel === "global" ? "guild" : "channel"),
          channelId: res.channelId || null,
          stats: res.stats || data.stats,
        });
      } else {
        await fetchCommands();
      }

      const label = feature.startsWith("category:")
        ? `Category ${feature.replace("category:", "").toUpperCase()}`
        : `/${feature}`;
      const modeText =
        mode === "enable_only"
          ? "restricted to enabled channels only"
          : mode === "disable_only"
          ? "disabled in selected channels"
          : "reset to all channels";

      showToast?.({
        title: "Channel Rule Updated",
        message: `${label} is now ${modeText}.`,
        type: "success",
      });
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to update channel rules.", type: "error" });
      return false;
    } finally {
      setIsBulkPending(false);
    }
  };

  // Clear channel rule for command or category
  const handleClearChannelRule = async (feature) => {
    setIsBulkPending(true);
    try {
      const res = await clearCommandChannelRule(guildId, feature);
      if (res && res.commands) {
        setData({
          commands: res.commands || [],
          disabled: res.disabled || [],
          guildDisabled: res.guildDisabled || [],
          channelDisabled: res.channelDisabled || [],
          channelRules: res.channelRules || {},
          modules: res.modules || [],
          scope: res.scope || (selectedChannel === "global" ? "guild" : "channel"),
          channelId: res.channelId || null,
          stats: res.stats || data.stats,
        });
      } else {
        await fetchCommands();
      }

      const label = feature.startsWith("category:")
        ? `Category ${feature.replace("category:", "").toUpperCase()}`
        : `/${feature}`;

      showToast?.({
        title: "Channel Rules Reset",
        message: `Restrictions for ${label} have been reset to default.`,
        type: "success",
      });
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to reset channel rules.", type: "error" });
      return false;
    } finally {
      setIsBulkPending(false);
    }
  };

  return {
    channels,
    selectedChannel,
    setSelectedChannel,
    ...data,
    loading,
    error,
    pendingCommands,
    pendingModules,
    isBulkPending,
    refresh: fetchCommands,
    handleToggleCommand,
    handleToggleModule,
    handleBulkToggle,
    handleResetChannel,
    handleResetAll,
    handleSaveChannelRule,
    handleClearChannelRule,
  };
}
