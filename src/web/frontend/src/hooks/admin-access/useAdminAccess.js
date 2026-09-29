import { useState, useEffect, useCallback } from "react";
import {
  getGuildMeta,
  getAdminRoles,
  addAdminRole,
  deleteAdminRole,
  addAdminUser,
  deleteAdminUser,
  getGuildMembers,
} from "../../api/client";

export function useAdminAccess(guildId, showToast) {
  const [data, setData] = useState({
    roles: [],
    adminRoles: [],
    adminUsers: [],
    ownerId: "",
    ownerUser: null,
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Async states
  const [addingUserId, setAddingUserId] = useState(null);
  const [removingUserId, setRemovingUserId] = useState(null);
  const [addingRoleId, setAddingRoleId] = useState(null);
  const [removingRoleId, setRemovingRoleId] = useState(null);

  const fetchAdminData = useCallback(async () => {
    if (!guildId) return;
    setLoading(true);
    try {
      const [meta, adminData] = await Promise.all([
        getGuildMeta(guildId),
        getAdminRoles(guildId),
      ]);

      let ownerUser = null;
      const detectedOwnerId = adminData.ownerId || meta?.guild?.ownerId || "";

      if (detectedOwnerId) {
        ownerUser = (adminData.adminUsers || []).find((u) => u.id === detectedOwnerId);
        if (!ownerUser) {
          try {
            const mList = await getGuildMembers(guildId, detectedOwnerId);
            const found = mList.find((m) => m.id === detectedOwnerId);
            if (found) ownerUser = found;
          } catch (e) {
            console.error("Failed to fetch owner details", e);
          }
        }
      }

      setData({
        roles: meta.roles || [],
        adminRoles: adminData.adminRoles || [],
        adminUsers: adminData.adminUsers || [],
        ownerId: detectedOwnerId,
        ownerUser,
      });
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err);
      showToast?.({ title: "Error", message: "Failed to load staff permissions data.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [guildId, showToast]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const handleAddRole = async (roleId) => {
    setAddingRoleId(roleId);
    try {
      await addAdminRole(guildId, roleId);
      const roleObj = data.roles.find((r) => r.id === roleId);
      if (roleObj) {
        setData(prev => ({
          ...prev,
          adminRoles: [...prev.adminRoles, roleObj],
        }));
      } else {
        await fetchAdminData();
      }
      showToast?.({ title: "Success", message: "Staff role authorized", type: "success" });
      return true;
    } catch (err) {
      showToast?.({ title: "Error", message: "Failed to add role.", type: "error" });
      return false;
    } finally {
      setAddingRoleId(null);
    }
  };

  const handleRemoveRole = async (roleId) => {
    setRemovingRoleId(roleId);
    try {
      await deleteAdminRole(guildId, roleId);
      setData(prev => ({
        ...prev,
        adminRoles: prev.adminRoles.filter((r) => r.id !== roleId),
      }));
      showToast?.({ title: "Success", message: "Staff role revoked", type: "success" });
      return true;
    } catch (err) {
      showToast?.({ title: "Error", message: "Failed to remove role.", type: "error" });
      return false;
    } finally {
      setRemovingRoleId(null);
    }
  };

  const handleAddUser = async (userId) => {
    setAddingUserId(userId);
    try {
      await addAdminUser(guildId, userId);
      await fetchAdminData(); // Refresh to get proper member details if we only had ID
      showToast?.({ title: "Success", message: "Admin user authorized", type: "success" });
      return true;
    } catch (err) {
      showToast?.({ title: "Error", message: "Failed to add admin user.", type: "error" });
      return false;
    } finally {
      setAddingUserId(null);
    }
  };

  const handleRemoveUser = async (userId) => {
    setRemovingUserId(userId);
    try {
      await deleteAdminUser(guildId, userId);
      setData(prev => ({
        ...prev,
        adminUsers: prev.adminUsers.filter((u) => u.id !== userId),
      }));
      showToast?.({ title: "Success", message: "Admin access revoked", type: "success" });
      return true;
    } catch (err) {
      showToast?.({ title: "Error", message: "Failed to remove user.", type: "error" });
      return false;
    } finally {
      setRemovingUserId(null);
    }
  };

  return {
    ...data,
    loading,
    error,
    refresh: fetchAdminData,
    asyncStates: {
      addingUserId,
      removingUserId,
      addingRoleId,
      removingRoleId,
    },
    handleAddRole,
    handleRemoveRole,
    handleAddUser,
    handleRemoveUser,
  };
}
