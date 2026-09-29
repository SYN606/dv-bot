import { useState, useEffect, useCallback } from "react";
import { getAnalytics } from "../../api/client";

export function useAnalytics(guildId, timeframe) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAnalytics = useCallback(async (forced = false) => {
    if (!guildId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getAnalytics(guildId, timeframe);
      setData(res);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [guildId, timeframe]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return { data, loading, error, refresh: () => fetchAnalytics(true) };
}
