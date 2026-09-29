import { useState, useEffect, useCallback } from "react";
import { fetchApi } from "../../api/client";

export function usePermissionsAudit(guildId, showToast) {
  const [auditData, setAuditData] = useState({ roles: [], members: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [selectedMember, setSelectedMember] = useState(null);
  const [memberAudit, setMemberAudit] = useState(null);
  const [memberAuditLoading, setMemberAuditLoading] = useState(false);

  const fetchAuditData = useCallback(async (isRefresh = false) => {
    if (!guildId) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchApi(`/api/guilds/${guildId}/permissions/audit`);
      if (data.error) {
        throw new Error(data.error);
      }
      setAuditData(data || { roles: [], members: [] });
    } catch (err) {
      console.error(err);
      setError(err);
      showToast?.({ title: "Error", message: err.message || "Failed to load permission audit.", type: "error" });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [guildId, showToast]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  const auditMember = async (memberId) => {
    if (!memberId || !guildId) return;
    
    setSelectedMember(memberId);
    setMemberAuditLoading(true);
    setMemberAudit(null);
    
    try {
      const data = await fetchApi(`/api/guilds/${guildId}/permissions/member/${memberId}`);
      if (data.error) {
        showToast?.({ title: "Error", message: data.error, type: "error" });
      } else if (!data.user) {
        showToast?.({ title: "Error", message: "Received malformed data from server.", type: "error" });
      } else {
        setMemberAudit(data);
      }
    } catch (err) {
      console.error(err);
      showToast?.({ title: "Error", message: err.message || "Failed to audit member.", type: "error" });
    } finally {
      setMemberAuditLoading(false);
    }
  };

  return {
    auditData,
    loading,
    refreshing,
    error,
    selectedMember,
    memberAudit,
    memberAuditLoading,
    setSelectedMember,
    refresh: () => fetchAuditData(true),
    auditMember
  };
}
