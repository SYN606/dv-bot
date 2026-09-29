import { useState, useEffect, useCallback } from "react";
import { getGuildMeta, getCommands, toggleCommand, toggleCommandModule } from "../../api/client";

export function useCommandRestrictions(guildId, showToast) {
  const [selectedChannel, setSelectedChannel] = useState("global");
  const [channels, setChannels] = useState([]);
  const [data, setData] = useState({
    commands: [],
    disabled: [],
    modules: [],
    stats: { total: 0, active: 0, disabled: 0, protected: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingCommands, setPendingCommands] = useState(new Set());
  const [pendingModules, setPendingModules] = useState(new Set());

  // 1. Fetch Channels
  useEffect(() => {
    if (!guildId) return;
    getGuildMeta(guildId)
      .then((meta) => {
        const textChannels = (meta.channels || []).filter((ch) => ch.type === 0 || ch.type === undefined);
        setChannels(textChannels.length > 0 ? textChannels : meta.channels || []);
      })
      .catch((err) => {
        console.error("Failed to load channels:", err);
      });
  }, [guildId]);

  // 2. Fetch Commands
  const fetchCommands = useCallback(async () => {
    if (!guildId || !selectedChannel) return;
    setLoading(true);
    try {
      const res = await getCommands(guildId, selectedChannel);
      setData({
        commands: res.commands || [],
        disabled: res.disabled || [],
        modules: res.modules || [],
        stats: res.stats || {
          total: (res.commands || []).length,
          active: Math.max(0, (res.commands || []).length - (res.disabled || []).length),
          disabled: (res.disabled || []).length,
          protected: (res.commands || []).filter((c) => c.isProtected).length,
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

  const handleToggleCommand = async (commandName, currentlyDisabled) => {
    const nextEnable = currentlyDisabled;
    setPendingCommands(prev => new Set(prev).add(commandName));
    
    try {
      await toggleCommand(guildId, {
        channelId: selectedChannel === "global" ? null : selectedChannel,
        commandName,
        enable: nextEnable,
      });
      
      // Optimistic update
      setData(prev => {
        const nextDisabled = nextEnable 
          ? prev.disabled.filter(c => c !== commandName)
          : [...prev.disabled, commandName];
        
        return {
          ...prev,
          disabled: nextDisabled,
          stats: {
            ...prev.stats,
            active: Math.max(0, prev.commands.length - nextDisabled.length),
            disabled: nextDisabled.length
          }
        };
      });
      
      showToast?.({ 
        title: "Success", 
        message: `Command /${commandName} ${nextEnable ? "enabled" : "disabled"}`, 
        type: "success" 
      });
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to update command.", type: "error" });
      return false;
    } finally {
      setPendingCommands(prev => {
        const next = new Set(prev);
        next.delete(commandName);
        return next;
      });
    }
  };

  const handleToggleModule = async (moduleId, shouldEnableAll) => {
    setPendingModules(prev => new Set(prev).add(moduleId));
    
    try {
      const res = await toggleCommandModule(guildId, {
        channelId: selectedChannel === "global" ? null : selectedChannel,
        category: moduleId,
        enable: shouldEnableAll,
      });
      
      // Update from backend response to ensure accuracy
      setData(prev => ({
        ...prev,
        disabled: res.disabled || [],
        stats: res.stats || prev.stats
      }));
      
      showToast?.({ 
        title: "Success", 
        message: `Module ${moduleId} ${shouldEnableAll ? "enabled" : "disabled"}`, 
        type: "success" 
      });
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to update module.", type: "error" });
      return false;
    } finally {
      setPendingModules(prev => {
        const next = new Set(prev);
        next.delete(moduleId);
        return next;
      });
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
    refresh: fetchCommands,
    handleToggleCommand,
    handleToggleModule
  };
}
