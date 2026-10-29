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
      const response = await saveAutoresponder(guildId, ruleData);
      const savedRule = response?.responder || response?.rule || (response?.id ? response : null);
      if (savedRule && (savedRule.id || savedRule.responder_id)) {
        const targetId = String(savedRule.id || savedRule.responder_id);
        setRules((prev) => {
          const exists = prev.find((r) => String(r.id || r.responder_id) === targetId);
          if (exists) {
            return prev.map((r) => (String(r.id || r.responder_id) === targetId ? { ...r, ...savedRule } : r));
          }
          return [...prev, savedRule];
        });
      }
      await fetchRules();
      showToast?.({ title: "Success", message: "Autoresponder saved successfully", type: "success" });
      return true;
    } catch (err) {
      console.error("Save error:", err);
      showToast?.({ title: "Error", message: "Failed to save autoresponder", type: "error" });
      return false;
    }
  };

  const toggleRule = async (ruleId, currentEnabled) => {
    const targetId = String(ruleId);
    try {
      await toggleAutoresponder(guildId, ruleId, !currentEnabled);
      setRules((prev) =>
        prev.map((r) => (String(r.id || r.responder_id) === targetId ? { ...r, enabled: !currentEnabled } : r))
      );
      return true;
    } catch (err) {
      showToast?.({ title: "Error", message: "Failed to toggle rule", type: "error" });
      return false;
    }
  };

  const deleteRule = async (ruleId) => {
    const targetId = String(ruleId);
    try {
      await deleteAutoresponder(guildId, ruleId);
      setRules((prev) => prev.filter((r) => String(r.id || r.responder_id) !== targetId));
      showToast?.({ title: "Success", message: "Rule deleted", type: "success" });
      return true;
    } catch (err) {
      showToast?.({ title: "Error", message: "Failed to delete rule", type: "error" });
      return false;
    }
  };

  return { rules, loading, error, refresh: fetchRules, saveRule, toggleRule, deleteRule };
}
