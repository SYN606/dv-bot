import React from "react";
import { useParams } from "react-router-dom";
import { useAdminAccess } from "../../hooks/admin-access";
import { PageError, PageSkeleton } from "../../components/ui";

// Components
import {
  AdminAccessHeader,
  ServerOwnerCard,
  AdminUsersPanel,
  AdminRolesPanel,
} from "../../components/admin-access";

export default function AdminRolesPage({ showToast }) {
  const { guildId } = useParams();
  
  const {
    roles,
    adminRoles,
    adminUsers,
    ownerId,
    ownerUser,
    loading,
    error,
    refresh,
    asyncStates,
    handleAddRole,
    handleRemoveRole,
    handleAddUser,
    handleRemoveUser,
  } = useAdminAccess(guildId, showToast);

  if (error) {
    return <PageError title="Unable to load Staff Access" onRetry={refresh} />;
  }

  if (loading) {
    return <PageSkeleton cards={2} rows={1} />;
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-16">
      <AdminAccessHeader />

      <ServerOwnerCard ownerUser={ownerUser} ownerId={ownerId} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <AdminUsersPanel 
          guildId={guildId}
          adminUsers={adminUsers}
          ownerId={ownerId}
          onAddUser={handleAddUser}
          onRemoveUser={handleRemoveUser}
          addingUserId={asyncStates.addingUserId}
          removingUserId={asyncStates.removingUserId}
        />
        
        <AdminRolesPanel 
          guildId={guildId}
          roles={roles}
          adminRoles={adminRoles}
          onAddRole={handleAddRole}
          onRemoveRole={handleRemoveRole}
          addingRoleId={asyncStates.addingRoleId}
          removingRoleId={asyncStates.removingRoleId}
        />
      </div>
    </div>
  );
}
