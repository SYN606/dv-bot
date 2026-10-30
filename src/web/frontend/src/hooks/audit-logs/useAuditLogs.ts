import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  getAuditLogs,
  getAuditLogConfig,
  updateAuditLogConfig,
  sendTestAuditLog,
  getGuildMeta,
} from "../../api/client";

// High Impact Actions: Bans, Kicks, Deletions, Role/Guild Deletions
const HIGH_IMPACT_ACTIONS = [
  20, // MemberKick
  21, // MemberPrune
  22, // MemberBanAdd
  23, // MemberBanRemove
  12, // ChannelDelete
  15, // ChannelOverwriteDelete
  32, // RoleDelete
  73, // MessageBulkDelete
  142, // AutoModRuleDelete
  143, // AutoModBlockMessage
];

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
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Loading & Async
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modern Filter States (not traditional options)
  const [category, setCategory] = useState("all");
  const [preset, setPreset] = useState("all"); // "all", "high_impact", "moderation_only", "staff_activity", "channel_perms", "deletions"
  const [timeWindow, setTimeWindow] = useState("all"); // "all", "1h", "24h", "7d"
  const [actionType, setActionType] = useState("all");
  const [executorId, setExecutorId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [hideBots, setHideBots] = useState(false);
  const [limit, setLimit] = useState(50);

  // Auto-refresh with Tab Visibility Awareness
  const [autoRefresh, setAutoRefresh] = useState(false);
  const autoRefreshTimerRef = useRef(null);

  // Moderation Log Config
  const [modLogConfig, setModLogConfig] = useState({ modLogChannelId: "", enabled: false, eventsConfig: {} });
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingLog, setTestingLog] = useState(false);

  // Fetch Core Audit Logs (Rate-Limit Shielded)
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

          if (res.rateLimited) {
            setIsRateLimited(true);
            showToast?.({
              title: "Rate-Limit Shield Active",
              message: "Discord audit API is cooling down. Serving fast cached snapshot.",
              type: "warning",
            });
          } else {
            setIsRateLimited(false);
          }
        }
      } catch (err) {
        console.error("Failed to load audit logs:", err);
        setError(err.message || "Failed to load audit logs");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [guildId, limit, actionType, executorId, showToast]
  );

  // Initial Bootstrap: Logs + Channels + ModLog Config
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
          setIsRateLimited(Boolean(logsRes.rateLimited));
        }

        if (configRes) {
          setModLogConfig({
            modLogChannelId: configRes.modLogChannelId || "",
            enabled: Boolean(configRes.enabled),
            eventsConfig: configRes.eventsConfig || {},
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

  // Server-side refetch on parameter changes
  useEffect(() => {
    if (!loading) {
      fetchLogs();
    }
  }, [fetchLogs]);

  // Handle Tab-Visibility Aware Auto-Refresh (Pauses when user changes browser tabs)
  useEffect(() => {
    if (!autoRefresh) {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
      return;
    }

    const startTimer = () => {
      if (!autoRefreshTimerRef.current) {
        autoRefreshTimerRef.current = setInterval(() => {
          if (document.visibilityState === "visible") {
            fetchLogs(true);
          }
        }, 20000);
      }
    };

    const stopTimer = () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current);
        autoRefreshTimerRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchLogs(true);
        startTimer();
      } else {
        stopTimer();
      }
    };

    startTimer();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopTimer();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [autoRefresh, fetchLogs]);

  // Parse Omnisearch Tokens (by:username, target:name, reason:text, action:kick)
  const parsedSearch = useMemo(() => {
    const raw = searchQuery.trim();
    if (!raw) return { terms: [], tokens: {} };

    const tokens = {};
    const terms = [];

    // Match prefixes like by:name, target:general, reason:spam, action:kick, type:danger
    const tokenRegex = /(\b(?:by|mod|target|for|reason|action|act|type|level):[^\s]+)/gi;
    const parts = raw.split(tokenRegex);

    for (const part of parts) {
      if (!part) continue;
      const match = part.match(/^([a-z]+):(.*)$/i);
      if (match) {
        const key = match[1].toLowerCase();
        const val = match[2].toLowerCase();
        if (["by", "mod"].includes(key)) tokens.by = val;
        else if (["target", "for"].includes(key)) tokens.target = val;
        else if (["reason"].includes(key)) tokens.reason = val;
        else if (["action", "act"].includes(key)) tokens.action = val;
        else if (["type", "level"].includes(key)) tokens.level = val;
      } else {
        const trimmed = part.trim().toLowerCase();
        if (trimmed) terms.push(trimmed);
      }
    }

    return { terms, tokens };
  }, [searchQuery]);

  // Client-Side Filtered & Processed Entries with Time Window, Presets & Tokenized Search
  const filteredEntries = useMemo(() => {
    const now = Date.now();
    const { terms, tokens } = parsedSearch;

    return entries.filter((entry) => {
      // 1. Time Window Filter
      if (timeWindow !== "all") {
        const entryTime = entry.createdTimestamp || new Date(entry.createdAt).getTime();
        const elapsed = now - entryTime;
        if (timeWindow === "1h" && elapsed > 60 * 60 * 1000) return false;
        if (timeWindow === "24h" && elapsed > 24 * 60 * 60 * 1000) return false;
        if (timeWindow === "7d" && elapsed > 7 * 24 * 60 * 60 * 1000) return false;
      }

      // 2. Smart Presets Filter
      if (preset === "high_impact") {
        if (!HIGH_IMPACT_ACTIONS.includes(entry.action)) return false;
      } else if (preset === "moderation_only") {
        if (entry.category !== "moderation") return false;
      } else if (preset === "staff_activity") {
        if (!["members", "roles"].includes(entry.category)) return false;
      } else if (preset === "channel_perms") {
        if (entry.category !== "channels") return false;
      } else if (preset === "deletions") {
        if (entry.category !== "messages" && !entry.actionName.toLowerCase().includes("delete")) return false;
      }

      // 3. Category Filter
      if (category !== "all" && entry.category !== category) {
        return false;
      }

      // 4. Hide Bots Filter
      if (hideBots && entry.executor?.bot) {
        return false;
      }

      // 5. Tokenized Search Filters
      if (tokens.by) {
        const byMatch =
          entry.executor?.username?.toLowerCase().includes(tokens.by) ||
          entry.executor?.tag?.toLowerCase().includes(tokens.by) ||
          entry.executor?.id?.includes(tokens.by);
        if (!byMatch) return false;
      }

      if (tokens.target) {
        const targetMatch =
          entry.target?.name?.toLowerCase().includes(tokens.target) ||
          entry.target?.id?.includes(tokens.target);
        if (!targetMatch) return false;
      }

      if (tokens.reason) {
        if (!entry.reason?.toLowerCase().includes(tokens.reason)) return false;
      }

      if (tokens.action) {
        if (!entry.actionName.toLowerCase().includes(tokens.action)) return false;
      }

      if (tokens.level) {
        if (entry.severity.toLowerCase() !== tokens.level) return false;
      }

      // 6. Free text terms (must match all free terms)
      if (terms.length > 0) {
        const executorStr = `${entry.executor?.username || ""} ${entry.executor?.tag || ""} ${entry.executor?.id || ""}`.toLowerCase();
        const targetStr = `${entry.target?.name || ""} ${entry.target?.id || ""}`.toLowerCase();
        const actionStr = entry.actionName?.toLowerCase() || "";
        const reasonStr = entry.reason?.toLowerCase() || "";
        const changesStr = (entry.changes || [])
          .map((c) => `${c.key} ${c.old} ${c.new}`)
          .join(" ")
          .toLowerCase();

        const combinedHaystack = `${executorStr} ${targetStr} ${actionStr} ${reasonStr} ${changesStr}`;

        for (const term of terms) {
          if (!combinedHaystack.includes(term)) {
            return false;
          }
        }
      }

      return true;
    });
  }, [entries, category, preset, timeWindow, hideBots, parsedSearch]);

  // Save Moderation & Event Log Config (Caches in apiCache on backend)
  const saveModLogConfig = async (newChannelId, newEventsConfig) => {
    setSavingConfig(true);
    try {
      const payloadEvents = newEventsConfig !== undefined ? newEventsConfig : (modLogConfig.eventsConfig || {});
      const res = await updateAuditLogConfig(guildId, {
        modLogChannelId: newChannelId,
        enabled: Boolean(newChannelId) || Object.keys(payloadEvents).length > 0,
        eventsConfig: payloadEvents,
      });
      setModLogConfig({
        modLogChannelId: newChannelId,
        enabled: Boolean(newChannelId) || Object.keys(payloadEvents).length > 0,
        eventsConfig: res?.eventsConfig || payloadEvents,
      });
      showToast?.({
        title: "Configuration Saved",
        message: "Log channels & event routing configuration updated successfully.",
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
  const testModLog = async (testPayload = {}) => {
    setTestingLog(true);
    try {
      const res = await sendTestAuditLog(guildId, testPayload);
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

  // Quick Helper to inject tokens into Omnisearch
  const appendSearchToken = useCallback((prefix, value) => {
    setSearchQuery((prev) => {
      const cleanVal = String(value).replace(/\s+/g, "");
      const token = `${prefix}:${cleanVal}`;
      if (prev.includes(token)) return prev;
      return prev ? `${prev.trim()} ${token}` : token;
    });
  }, []);

  // Export to JSON
  const exportToJson = useCallback(() => {
    try {
      const exportData = {
        guildId,
        exportedAt: new Date().toISOString(),
        totalEntries: filteredEntries.length,
        filters: { category, preset, timeWindow, actionType, executorId, hideBots, searchQuery },
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
  }, [guildId, filteredEntries, category, preset, timeWindow, actionType, executorId, hideBots, searchQuery, showToast]);

  // Export to CSV
  const exportToCsv = useCallback(() => {
    try {
      const headers = ["Timestamp", "Action", "Category", "Severity", "Executor Tag", "Executor ID", "Target Name", "Target ID", "Reason", "Changes Count"];
      const rows = filteredEntries.map((e) => [
        `"${e.createdAt}"`,
        `"${e.actionName}"`,
        `"${e.category}"`,
        `"${e.severity}"`,
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
    isRateLimited,
    loading,
    refreshing,
    error,
    // Modern Filter States & Setters
    category,
    setCategory,
    preset,
    setPreset,
    timeWindow,
    setTimeWindow,
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
    // Omnisearch token helper
    appendSearchToken,
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
