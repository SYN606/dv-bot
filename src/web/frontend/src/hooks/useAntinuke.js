import { useState, useEffect, useCallback } from "react";
import {
  getAntinukeData,
  updateAntinukeSettings,
  addAntinukeTrustee,
  deleteAntinukeTrustee,
  toggleAntinukeLockdown,
  rollbackAntinukeIncident,
  setModuleStatus,
} from "../api/client";

export function useAntinuke(guildId, showToast) {
  const [data, setData] = useState({
    settings: null,
    trustees: [],
    incidents: [],
    roles: [],
    channels: [],
    members: [],
    topologyStats: { channelsCount: 0, rolesCount: 0, lastSynced: Date.now(), inMemoryActive: false },
    lockdownActive: false,
  });

  const [localSettings, setLocalSettings] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(
    async (silent = false) => {
      if (!guildId) return;
      if (!silent) setLoading(true);

      try {
        const res = await getAntinukeData(guildId);
        if (res && res.success) {
          setData(res);
          setLocalSettings(res.settings);
          setHasChanges(false);
          setError(null);
        } else {
          setError(res?.error || "Failed to load Anti-Nuke state");
        }
      } catch (err) {
        setError(err.message || "Failed to load Anti-Nuke state");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [guildId]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update a single key or multiple keys in local settings
  const updateLocal = useCallback((updates) => {
    setLocalSettings((prev) => {
      const next = { ...prev, ...updates };
      setHasChanges(true);
      return next;
    });
  }, []);

  // Save modified settings
  const save = useCallback(async () => {
    if (!localSettings || !guildId) return;
    setActionLoading(true);

    try {
      const res = await updateAntinukeSettings(guildId, localSettings);
      if (res && res.success) {
        setData((prev) => ({ ...prev, settings: res.settings }));
        setLocalSettings(res.settings);
        setHasChanges(false);
        if (showToast) showToast("Anti-Nuke settings saved successfully!", "success");
        return true;
      } else {
        if (showToast) showToast(res?.error || "Failed to save settings", "error");
        return false;
      }
    } catch (err) {
      if (showToast) showToast(err.message || "Failed to save settings", "error");
      return false;
    } finally {
      setActionLoading(false);
    }
  }, [guildId, localSettings, showToast]);

  // Reset local changes back to server state
  const reset = useCallback(() => {
    if (data.settings) {
      setLocalSettings(data.settings);
      setHasChanges(false);
    }
  }, [data.settings]);

  // Toggle Master Module Activation
  const toggleMasterEnabled = useCallback(
    async (nextEnabled) => {
      if (!guildId) return;
      setActionLoading(true);
      const val = Boolean(nextEnabled);

      // Optimistically update local state immediately
      setLocalSettings((prev) => (prev ? { ...prev, enabled: val } : prev));
      setData((prev) => (prev && prev.settings ? { ...prev, settings: { ...prev.settings, enabled: val } } : prev));
      setHasChanges(false);

      try {
        await Promise.all([
          setModuleStatus(guildId, "antinuke", val),
          updateAntinukeSettings(guildId, { enabled: val ? 1 : 0 }),
        ]);

        if (showToast) {
          showToast(
            val
              ? "Server Protection (Anti-Nuke) is now fully ENABLED and active!"
              : "Server Protection (Anti-Nuke) has been DISABLED. Commands and defenses are paused.",
            val ? "success" : "info"
          );
        }
        return true;
      } catch (err) {
        // Revert on failure
        setLocalSettings((prev) => (prev ? { ...prev, enabled: !val } : prev));
        setData((prev) => (prev && prev.settings ? { ...prev, settings: { ...prev.settings, enabled: !val } } : prev));
        if (showToast) showToast(err.message || "Failed to update module state", "error");
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [guildId, showToast]
  );

  // Toggle Panic Lockdown
  const toggleLockdown = useCallback(
    async (action, reason = "") => {
      if (!guildId) return;
      setActionLoading(true);

      try {
        const res = await toggleAntinukeLockdown(guildId, action, reason);
        if (res && res.success) {
          setData((prev) => ({
            ...prev,
            lockdownActive: res.lockdownActive,
            settings: prev.settings ? { ...prev.settings, emergency_lockdown_active: res.lockdownActive ? 1 : 0 } : prev.settings,
          }));
          if (showToast) {
            showToast(
              action === "engage"
                ? "DEFCON 1 Panic Lockdown Engaged! Channels locked down."
                : "Lockdown lifted. Normal permissions restored.",
              action === "engage" ? "error" : "success"
            );
          }
          return true;
        } else {
          if (showToast) showToast(res?.error || "Failed to alter lockdown state", "error");
          return false;
        }
      } catch (err) {
        if (showToast) showToast(err.message || "Failed to alter lockdown state", "error");
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [guildId, showToast]
  );

  // Add Trustee
  const addTrustee = useCallback(
    async (payload) => {
      if (!guildId) return;
      setActionLoading(true);

      try {
        const res = await addAntinukeTrustee(guildId, payload);
        if (res && res.success) {
          setData((prev) => ({ ...prev, trustees: res.trustees }));
          if (showToast) showToast("Trustee successfully added to whitelist!", "success");
          return true;
        } else {
          if (showToast) showToast(res?.error || "Failed to add trustee", "error");
          return false;
        }
      } catch (err) {
        if (showToast) showToast(err.message || "Failed to add trustee", "error");
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [guildId, showToast]
  );

  // Remove Trustee
  const removeTrustee = useCallback(
    async (trusteeId) => {
      if (!guildId) return;
      setActionLoading(true);

      try {
        const res = await deleteAntinukeTrustee(guildId, trusteeId);
        if (res && res.success) {
          setData((prev) => ({ ...prev, trustees: res.trustees }));
          if (showToast) showToast("Trustee removed from whitelist.", "info");
          return true;
        } else {
          if (showToast) showToast(res?.error || "Failed to remove trustee", "error");
          return false;
        }
      } catch (err) {
        if (showToast) showToast(err.message || "Failed to remove trustee", "error");
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [guildId, showToast]
  );

  // Rollback Incident Snapshot
  const rollbackIncident = useCallback(
    async (incidentId) => {
      if (!guildId) return;
      setActionLoading(true);

      try {
        const res = await rollbackAntinukeIncident(guildId, incidentId);
        if (res && res.success) {
          setData((prev) => ({ ...prev, incidents: res.incidents }));
          if (showToast) {
            showToast(
              `Restored ${res.restoredCount} asset(s) from incident snapshot!`,
              "success"
            );
          }
          return true;
        } else {
          if (showToast) showToast(res?.error || "Rollback failed", "error");
          return false;
        }
      } catch (err) {
        if (showToast) showToast(err.message || "Rollback failed", "error");
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [guildId, showToast]
  );

  return {
    data,
    settings: localSettings,
    hasChanges,
    loading,
    actionLoading,
    error,
    updateLocal,
    save,
    reset,
    toggleLockdown,
    toggleMasterEnabled,
    addTrustee,
    removeTrustee,
    rollbackIncident,
    refresh: () => fetchData(false),
  };
}
