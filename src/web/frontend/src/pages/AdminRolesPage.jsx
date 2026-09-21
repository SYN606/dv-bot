import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getGuildMeta,
  getAdminRoles,
  addAdminRole,
  deleteAdminRole,
} from "../api/client";
import { Shield, Plus, Trash2, ShieldAlert } from "lucide-react";

export default function AdminRolesPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  const [roles, setRoles] = useState([]);
  const [adminRoleIds, setAdminRoleIds] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([getGuildMeta(guildId), getAdminRoles(guildId)])
      .then(([meta, adminData]) => {
        setRoles(meta.roles || []);
        setAdminRoleIds(adminData.roleIds || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!selectedRole) return;
    try {
      await addAdminRole(guildId, selectedRole);
      showToast("Staff admin role added successfully!");
      setSelectedRole("");
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to add admin role.", "error");
    }
  };

  const handleRemove = async (roleId) => {
    try {
      await deleteAdminRole(guildId, roleId);
      showToast("Staff admin role revoked.");
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to revoke admin role.", "error");
    }
  };

  const roleMap = new Map(roles.map((r) => [r.id, r]));

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Staff Admin Roles"]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-purple-400" />
            <span>Staff Admin Roles</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Designate custom Discord roles that receive full bot configuration privileges without requiring the Discord Administrator permission bit.
          </p>
        </div>

        {/* Add Role Card */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
          <h3 className="font-bold text-sm text-white">Add Staff Admin Role</h3>
          <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Select a role to grant bot administration...</option>
              {roles
                .filter((r) => !adminRoleIds.includes(r.id))
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    @{r.name}
                  </option>
                ))}
            </select>
            <button
              type="submit"
              disabled={!selectedRole}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Role</span>
            </button>
          </form>
        </div>

        {/* Active Roles List */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Active Staff Admin Roles</h3>
            <span className="text-xs text-slate-400 font-mono">
              {adminRoleIds.length} {adminRoleIds.length === 1 ? "Role" : "Roles"} Configured
            </span>
          </div>

          {adminRoleIds.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              <ShieldAlert className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              No custom admin roles added yet. Only server owners and Discord Administrators can currently configure the bot.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {adminRoleIds.map((roleId) => {
                const role = roleMap.get(roleId);
                return (
                  <div
                    key={roleId}
                    className="p-4 rounded-2xl bg-slate-900/70 border border-white/5 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            role?.color && role.color !== "#000000"
                              ? role.color
                              : "#818cf8",
                        }}
                      />
                      <div className="truncate">
                        <p className="font-semibold text-xs text-white truncate">
                          @{role ? role.name : roleId}
                        </p>
                        <p className="text-[10px] font-mono text-slate-500">
                          ID: {roleId}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(roleId)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                      title="Revoke Permissions"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
