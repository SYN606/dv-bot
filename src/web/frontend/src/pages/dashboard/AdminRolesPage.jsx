import React from "react";
import { useParams } from "react-router-dom";
import { useAdminAccess } from "../../hooks/admin-access";

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
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] animate-in fade-in zoom-in-[0.98] duration-500">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/5 text-center space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Unable to load Staff Access</h2>
          <p className="text-sm text-slate-400">Failed to connect to the backend.</p>
          <button onClick={refresh} className="mt-4 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
        <div className="h-24 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        <div className="h-32 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-100 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
          <div className="h-100 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
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
