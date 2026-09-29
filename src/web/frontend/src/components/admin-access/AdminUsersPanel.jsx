import React, { useState } from "react";
import { UserSelector } from "../discord";
import AdminUserItem from "./AdminUserItem";
import { Users, Loader2 } from "lucide-react";

export default function AdminUsersPanel({ guildId, adminUsers, ownerId, onAddUser, onRemoveUser, addingUserId, removingUserId }) {
  const [selectedUser, setSelectedUser] = useState("");

  const handleAdd = async () => {
    if (!selectedUser) return;
    const success = await onAddUser(selectedUser);
    if (success) {
      setSelectedUser("");
    }
  };

  const filteredUsers = adminUsers.filter(u => u.id !== ownerId);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-400" />
          Admin Users
        </h2>
        <span className="text-xs font-mono text-slate-400 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">
          {filteredUsers.length} users
        </span>
      </div>
      <p className="text-sm text-slate-400 mb-6">
        Grant individual members permission to manage the bot without requiring a staff role.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <UserSelector 
            guildId={guildId}
            value={selectedUser}
            onChange={setSelectedUser}
            placeholder="Search member to authorize..."
            excludeIds={[...adminUsers.map(u => u.id), ownerId]}
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!selectedUser || addingUserId}
          className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center min-w-[140px]"
        >
          {addingUserId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Admin"}
        </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-2 scrollbar-thin">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-8 text-sm text-slate-500 border border-dashed border-white/5 rounded-xl">
            No individual admin users authorized yet.
          </div>
        ) : (
          filteredUsers.map((u) => (
            <AdminUserItem 
              key={u.id}
              user={u}
              isRemoving={removingUserId === u.id}
              onRemove={onRemoveUser}
            />
          ))
        )}
      </div>
    </div>
  );
}
