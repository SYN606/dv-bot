import { useState, useEffect, useCallback } from "react";

/**
 * Fetch module status directly without external transport dependency
 */
export async function getModuleStatus(guildId, moduleName) {
  try {
    const res = await fetch(`/api/guilds/${guildId}/modules/${moduleName}`, {
      credentials: "include",
    });
    if (!res.ok) return { enabled: true };
    return await res.json();
  } catch {
    return { enabled: true };
  }
}

/**
 * Update module status directly
 */
export async function setModuleStatus(guildId, moduleName, enabled) {
  const res = await fetch(`/api/guilds/${guildId}/modules/${moduleName}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ enabled }),
  });
  if (!res.ok) throw new Error("Failed to update module status");
  return await res.json();
}

export function useModuleStatus(guildId, moduleName, showToast) {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!guildId || !moduleName) return;

    setLoading(true);
    getModuleStatus(guildId, moduleName)
      .then((data) => {
        if (mounted && data && data.enabled !== undefined) {
          setEnabled(Boolean(data.enabled));
        }
      })
      .catch((err) => {
        console.warn(`[useModuleStatus] Failed to load status for ${moduleName}:`, err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [guildId, moduleName]);

  const toggle = useCallback(async () => {
    const next = !enabled;
    setEnabled(next); // optimistic update

    try {
      const res = await setModuleStatus(guildId, moduleName, next);
      if (res && res.success !== false) {
        showToast?.({
          title: "Module Updated",
          message: `Module is now ${next ? "enabled" : "disabled"}.`,
          type: "success",
        });
      } else {
        setEnabled(!next); // revert
        showToast?.({
          title: "Update Failed",
          message: "Could not update module state.",
          type: "error",
        });
      }
    } catch (err) {
      setEnabled(!next); // revert
      showToast?.({
        title: "Update Failed",
        message: err.message || "Failed to communicate with server.",
        type: "error",
      });
    }
  }, [enabled, guildId, moduleName, showToast]);

  return { enabled, setEnabled, toggle, loading };
}
