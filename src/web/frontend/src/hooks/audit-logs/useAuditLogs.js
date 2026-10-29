import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getAuditLogs,
  getAuditLogConfig,
  updateAuditLogConfig,
  sendTestAuditLog,
  getGuildMeta,
} from "../../api/client";

export function useAuditLogs(guildId, showToast) {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    moderation: 0,
    members: 0,
    channels: 0,
    roles: 0,
    messages: 0,
    server: 0,
    other: 0,
  });
  const [executors, setExecutors] = useState([]);
  const [availableActions, setAvailableActions] = useState([]);
  const [channels, setChannels] = useState([]);
  const [missingPermission, setMissingPermission] = useState(false);

  // Loading & Async
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [category, setCategory] = useState("all");
  const [actionType, setActionType] = useState("all");
  const [executorId, setExecutorId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hideBots, setHideBots] = useState(false);
  const [limit, setLimit] = useState(50);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshTimerRef = useRef(null);

  // Moderation Log Config
  const [modLogConfig, setModLogConfig] = useState({ modLogChannelId: "", enabled: false });
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingLog, setTestingLog] = useState(false);

  // Fetch Core Audit Logs
  const fetchLogs = useCallback(
    async (isBackground = false) => {
      if (!guildId) return;
      if (!isBackground) setRefreshing(true);

      try {
        const res = await getAuditLogs(guildId, {
          limit,
          action: actionType !== "all" ? actionType : null,
          executorId: executorId !== "all" ? executorId : null,
        });

        if (res.missingPermission) {
          setMissingPermission(true);
          setEntries([]);
          setError(res.error || "Missing View Audit Log permission");
        } else {
          setMissingPermission(false);
          setEntries(res.entries || []);
          setStats(res.stats || {});
          setExecutors(res.executors || []);
          setAvailableActions(res.availableActions || []);
          setError(null);
        }
      } catch (err) {
        console.error("Failed to load audit logs:", err);
        setError(err.message || "Failed to load audit logs");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [guildId, limit, actionType, executorId]
  );

  // Initial Load + Guild Metadata & Mod Log Config
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      getAuditLogs(guildId, { limit }),
      getAuditLogConfig(guildId).catch(() => null),
      getGuildMeta(guildId).catch(() => null),
    ])
      .then(([logsRes, configRes, metaRes]) => {
        if (!mounted) return;

        if (logsRes?.missingPermission) {
          setMissingPermission(true);
          setError(logsRes.error);
        } else if (logsRes) {
          setEntries(logsRes.entries || []);
          setStats(logsRes.stats || {});
          setExecutors(logsRes.executors || []);
          setAvailableActions(logsRes.availableActions || []);
        }

        if (configRes) {
          setModLogConfig({
            modLogChannelId: configRes.modLogChannelId || "",
            enabled: Boolean(configRes.enabled),
          });
        }

        if (metaRes?.channels) {
          setChannels(metaRes.channels || []);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || "Failed to load audit data");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [guildId, limit]);

  // Handle dynamic filter changes that require server-side re-query
  useEffect(() => {
    if (!loading) {
      fetchLogs();
    }
  }, [fetchLogs]);

  // Handle Auto-Refresh Timer
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshTimerRef.current = setInterval(() => {
        fetchLogs(true);
      }, 20000); // Poll every 20 seconds
    } else if (autoRefreshTimerRef.current) {
      clearInterval(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }

    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
      }
    };
  }, [autoRefresh, fetchLogs]);

  // Client-side Filtered Entries (category, search, hideBots)
  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return entries.filter((entry) => {
      // 1. Category Filter
      if (category !== "all" && entry.category !== category) {
        return false;
      }

      // 2. Hide Bots Filter
      if (hideBots && entry.executor?.bot) {
        return false;
      }

      // 3. Search Query Filter
      if (q) {
        const executorMatch =
          entry.executor?.username?.toLowerCase().includes(q) ||
          entry.executor?.tag?.toLowerCase().includes(q) ||
          entry.executor?.id?.includes(q);

        const targetMatch =
          entry.target?.name?.toLowerCase().includes(q) ||
          entry.target?.id?.includes(q);

        const actionMatch = entry.actionName?.toLowerCase().includes(q);
        const reasonMatch = entry.reason?.toLowerCase().includes(q);

        const changeKeyMatch = entry.changes?.some((ch) =>
          ch.key?.toLowerCase().includes(q)
        );

        if (!executorMatch && !targetMatch && !actionMatch && !reasonMatch && !changeKeyMatch) {
          return false;
        }
      }

      return true;
    });
  }, [entries, category, hideBots, searchQuery]);

  // Save Moderation Log Config
  const saveModLogConfig = async (newChannelId) => {
    setSavingConfig(true);
    try {
      await updateAuditLogConfig(guildId, {
        modLogChannelId: newChannelId,
        enabled: Boolean(newChannelId),
      });
      setModLogConfig({
        modLogChannelId: newChannelId,
        enabled: Boolean(newChannelId),
      });
      showToast?.({
        title: "Configuration Saved",
        message: newChannelId
          ? "Moderation audit log channel updated successfully."
          : "Moderation logging disabled.",
        type: "success",
      });
      return true;
    } catch (err) {
      showToast?.({
        title: "Save Failed",
        message: err.message || "Could not update audit log channel.",
        type: "error",
      });
      return false;
    } finally {
      setSavingConfig(false);
    }
  };

  // Dispatch Test Log
  const testModLog = async () => {
    setTestingLog(true);
    try {
      const res = await sendTestAuditLog(guildId);
      showToast?.({
        title: "Test Sent",
        message: res.message || "Test audit log dispatched to channel!",
        type: "success",
      });
      return true;
    } catch (err) {
      showToast?.({
        title: "Dispatch Failed",
        message: err.message || "Could not dispatch test log to channel.",
        type: "error",
      });
      return false;
    } finally {
      setTestingLog(false);
    }
  };

  // Export to JSON
  const exportToJson = useCallback(() => {
    try {
      const exportData = {
        guildId,
        exportedAt: new Date().toISOString(),
        totalEntries: filteredEntries.length,
        filters: { category, actionType, executorId, hideBots, searchQuery },
        entries: filteredEntries,
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `audit-logs-${guildId}-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast?.({
        title: "Export Successful",
        message: `Exported ${filteredEntries.length} audit entries to JSON.`,
        type: "success",
      });
    } catch (err) {
      showToast?.({
        title: "Export Failed",
        message: err.message,
        type: "error",
      });
    }
  }, [guildId, filteredEntries, category, actionType, executorId, hideBots, searchQuery, showToast]);

  // Export to CSV
  const exportToCsv = useCallback(() => {
    try {
      const headers = ["Timestamp", "Action", "Category", "Executor Tag", "Executor ID", "Target Name", "Target ID", "Reason", "Changes Count"];
      const rows = filteredEntries.map((e) => [
        `"${e.createdAt}"`,
        `"${e.actionName}"`,
        `"${e.category}"`,
        `"${e.executor?.tag || e.executor?.username || 'Unknown'}"`,
        `"${e.executor?.id || ''}"`,
        `"${e.target?.name || ''}"`,
        `"${e.target?.id || ''}"`,
        `"${(e.reason || '').replace(/"/g, '""')}"`,
        e.changes?.length || 0,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `audit-logs-${guildId}-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      showToast?.({
        title: "Export Successful",
        message: `Exported ${filteredEntries.length} audit entries to CSV.`,
        type: "success",
      });
    } catch (err) {
      showToast?.({
        title: "Export Failed",
        message: err.message,
        type: "error",
      });
    }
  }, [guildId, filteredEntries, showToast]);

  return {
    // Data
    entries: filteredEntries,
    rawCount: entries.length,
    stats,
    executors,
    availableActions,
    channels,
    missingPermission,
    loading,
    refreshing,
    error,
    // Filters & Setters
    category,
    setCategory,
    actionType,
    setActionType,
    executorId,
    setExecutorId,
    searchQuery,
    setSearchQuery,
    hideBots,
    setHideBots,
    limit,
    setLimit,
    // Auto-refresh
    autoRefresh,
    setAutoRefresh,
    // Mod Log Config
    modLogConfig,
    savingConfig,
    testingLog,
    saveModLogConfig,
    testModLog,
    // Actions
    refresh: () => fetchLogs(),
    exportToJson,
    exportToCsv,
  };
}
