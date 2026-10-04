import { useState, useEffect, useCallback, useMemo } from "react";
import { getWarningPunishments, addWarningPunishment, removeWarningPunishment } from "../../api/client";
import {
  findNextUnusedThreshold,
  getPunishmentType,
  MIN_WARNING_THRESHOLD,
  MAX_WARNING_THRESHOLD
} from "../../utils/warning-punishments/punishment";

export function useWarningPunishments(guildId, showToast) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add-form state
  const [warnCount, setWarnCount] = useState(3);
  const [actionType, setActionType] = useState("timeout");
  const [duration, setDuration] = useState(3600);
  const [adding, setAdding] = useState(false);

  // Delete state
  const [deletingWarnCount, setDeletingWarnCount] = useState(null);

  const sortedRules = useMemo(
    () => [...rules].sort((a, b) => a.warn_count - b.warn_count),
    [rules]
  );

  const fetchRules = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getWarningPunishments(guildId);
      setRules(data?.configs || []);
    } catch (err) {
      console.error(err);
      setError(err);
      showToast?.({ title: "Error", message: "Failed to load warning punishments.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [guildId, showToast]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = useCallback(async () => {
    const count = parseInt(warnCount, 10);
    if (!count || count < MIN_WARNING_THRESHOLD || count > MAX_WARNING_THRESHOLD) return false;
    if (rules.find((r) => r.warn_count === count)) return false;

    const pType = getPunishmentType(actionType);
    setAdding(true);
    try {
      await addWarningPunishment(guildId, {
        warnCount: count,
        actionType,
        duration: pType?.requiresDuration ? parseInt(duration, 10) : null,
      });
      showToast?.({
        title: "Success",
        message: `Punishment rule for ${count} warnings added!`,
        type: "success",
      });

      // Refresh and auto-advance to next free threshold
      const data = await getWarningPunishments(guildId);
      const updatedRules = data?.configs || [];
      setRules(updatedRules);
      const nextThreshold = findNextUnusedThreshold(updatedRules, count);
      if (nextThreshold !== null) {
        setWarnCount(nextThreshold);
      }
      return true;
    } catch (err) {
      console.error(err);
      showToast?.({
        title: "Error",
        message: err.message || "Failed to add punishment rule.",
        type: "error",
      });
      return false;
    } finally {
      setAdding(false);
    }
  }, [guildId, warnCount, actionType, duration, rules, showToast]);

  const deleteRule = useCallback(
    async (warnCountToDelete) => {
      setDeletingWarnCount(warnCountToDelete);
      try {
        await removeWarningPunishment(guildId, warnCountToDelete);
        showToast?.({
          title: "Success",
          message: `Punishment rule for ${warnCountToDelete} warnings removed.`,
          type: "success",
        });
        setRules((prev) => prev.filter((r) => r.warn_count !== warnCountToDelete));
        return true;
      } catch (err) {
        console.error(err);
        showToast?.({
          title: "Error",
          message: err.message || "Failed to remove punishment rule.",
          type: "error",
        });
        return false;
      } finally {
        setDeletingWarnCount(null);
      }
    },
    [guildId, showToast]
  );

  return {
    // List data
    rules: sortedRules,
    loading,
    error,
    refresh: fetchRules,
    // Delete
    deletingWarnCount,
    deleteRule,
    // Add-form state
    warnCount,
    setWarnCount,
    actionType,
    setActionType,
    duration,
    setDuration,
    adding,
    addRule,
  };
}
