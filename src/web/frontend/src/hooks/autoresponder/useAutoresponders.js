import { useState, useEffect, useCallback } from "react";
import { getAutoresponders, saveAutoresponder, toggleAutoresponder, deleteAutoresponder } from "../../api/client";

export function useAutoresponders(guildId, showToast) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRules = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const data = await getAutoresponders(guildId);
      setRules(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error("Failed to load autoresponders:", err);
      setError(err);
      showToast?.({ title: "Error", message: "Failed to load rules", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [guildId, showToast]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const saveRule = async (ruleData) => {
    try {
      const updatedRule = await saveAutoresponder(guildId, ruleData);
      setRules((prev) => {
        const exists = prev.find((r) => r.id === updatedRule.id);
        if (exists) {
          return prev.map((r) => (r.id === updatedRule.id ? updatedRule : r));
        }
        return [...prev, updatedRule];
      });
      showToast?.({ title: "Success", message: "Autoresponder saved successfully", type: "success" });
      return true;
    } catch (err) {
      console.error("Save error:", err);
      showToast?.({ title: "Error", message: "Failed to save autoresponder", type: "error" });
      return false;
    }
  };

  const toggleRule = async (ruleId, currentEnabled) => {
    try {
      await toggleAutoresponder(guildId, ruleId, !currentEnabled);
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, enabled: !currentEnabled } : r))
      );
      return true;
    } catch (err) {
      showToast?.({ title: "Error", message: "Failed to toggle rule", type: "error" });
      return false;
    }
  };

  const deleteRule = async (ruleId) => {
    try {
      await deleteAutoresponder(guildId, ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      showToast?.({ title: "Success", message: "Rule deleted", type: "success" });
      return true;
    } catch (err) {
      showToast?.({ title: "Error", message: "Failed to delete rule", type: "error" });
      return false;
    }
  };

  return { rules, loading, error, refresh: fetchRules, saveRule, toggleRule, deleteRule };
}
