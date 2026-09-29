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
    const rawGuilds = user?.guilds || [];
    return rawGuilds.map(guild => ({
      ...guild,
      access: getGuildAccess(guild),
      botPresent: isBotInGuild(guild, botGuildIds)
    }));
  }, [user?.guilds, botGuildIds]);

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
      const aManage = a.access.canManage;
      const bManage = b.access.canManage;
      const aBot = a.botPresent;
      const bBot = b.botPresent;

      const getGroup = (manage, bot) => {
        if (manage && bot) return 1;
        if (manage && !bot) return 2;
        if (!manage && bot) return 3;
        return 4;
      };

      const groupA = getGroup(aManage, aBot);
      const groupB = getGroup(bManage, bBot);

      if (groupA !== groupB) return groupA - groupB;

      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [servers]);

  const filteredServers = useMemo(() => {
    return sortedServers.filter((g) => {
      if (search && !g.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (filterMode === "manageable" && !g.access.canManage) {
        return false;
      }
      return true;
    });
  }, [sortedServers, search, filterMode]);

  const manageableCount = servers.filter(g => g.access.canManage).length;
  const totalCount = servers.length;

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
