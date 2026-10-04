import { useState, useMemo } from "react";
import { syncAuthSession } from "../../api/client";
import { getGuildAccess, isBotInGuild } from "../../utils/guildAccess";

export function useServerSelector(user, botInfo, onUserUpdate, showToast) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("manageable"); // "manageable" or "all"
  const [refreshing, setRefreshing] = useState(false);
  
  const [requestGuild, setRequestGuild] = useState(null);

  const botGuildIds = useMemo(() => new Set((botInfo?.guildIds || []).map(String)), [botInfo?.guildIds]);

  // Normalize server data once
  const servers = useMemo(() => {
    const rawGuilds = Array.isArray(user?.guilds) ? user.guilds : [];
    return rawGuilds.map((guild) => ({
      ...guild,
      access: getGuildAccess(guild, Boolean(user?.isSuperuser)),
      botPresent: isBotInGuild(guild, botGuildIds),
    }));
  }, [user?.guilds, user?.isSuperuser, botGuildIds]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await syncAuthSession();
      if (data?.guilds && onUserUpdate) {
        onUserUpdate(data);
        showToast?.({ title: "Success", message: "Servers synced successfully.", type: "success" });
      }
    } catch (err) {
      console.error("Failed to refresh guilds:", err);
      showToast?.({ title: "Error", message: err.message || "Failed to sync servers.", type: "error" });
    } finally {
      setRefreshing(false);
    }
  };

  // Sort intentionally:
  // 1. Manageable + bot active
  // 2. Manageable + bot not added
  // 3. Non-manageable + bot active
  // 4. Other servers
  // Within those groups, sort alphabetically.
  const sortedServers = useMemo(() => {
    const sorted = [...servers];
    sorted.sort((a, b) => {
      const aManage = Boolean(a.access?.canManage);
      const bManage = Boolean(b.access?.canManage);
      const aBot = Boolean(a.botPresent);
      const bBot = Boolean(b.botPresent);

      const getGroup = (manage, bot) => {
        if (manage && bot) return 1;
        if (manage && !bot) return 2;
        if (!manage && bot) return 3;
        return 4;
      };

      const groupA = getGroup(aManage, aBot);
      const groupB = getGroup(bManage, bBot);

      if (groupA !== groupB) return groupA - groupB;

      const nameA = a.name || "";
      const nameB = b.name || "";
      return nameA.localeCompare(nameB);
    });
    return sorted;
  }, [servers]);

  const filteredServers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sortedServers.filter((g) => {
      if (query && !(g.name || "").toLowerCase().includes(query)) {
        return false;
      }
      if (filterMode === "manageable" && !g.access?.canManage) {
        return false;
      }
      return true;
    });
  }, [sortedServers, search, filterMode]);

  const manageableCount = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return servers.filter((g) => g.access?.canManage).length;
    }
    return servers.filter((g) => g.access?.canManage && (g.name || "").toLowerCase().includes(query)).length;
  }, [servers, search]);

  const totalCount = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return servers.length;
    }
    return servers.filter((g) => (g.name || "").toLowerCase().includes(query)).length;
  }, [servers, search]);

  return {
    search,
    setSearch,
    filterMode,
    setFilterMode,
    refreshing,
    handleRefresh,
    filteredServers,
    manageableCount,
    totalCount,
    requestGuild,
    setRequestGuild
  };
}
