import { useState, useEffect, useCallback } from "react";
import { getGuildEmojis } from "../../api/client";

export function useGuildEmojis(guildId) {
  const [emojis, setEmojis] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchEmojis = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const data = await getGuildEmojis(guildId);
      setEmojis(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error("Failed to load guild emojis:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    fetchEmojis();
  }, [fetchEmojis]);

  return { emojis, loading, error, refresh: fetchEmojis };
}
