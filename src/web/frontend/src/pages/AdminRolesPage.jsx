import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getGuildMeta,
  getAdminRoles,
  addAdminRole,
  deleteAdminRole,
  addAdminUser,
  deleteAdminUser,
  getGuildMembers,
} from "../api/client";
import {
  Shield,
  Plus,
  Trash2,
  ShieldAlert,
  Crown,
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  X,
  UserCheck,
} from "lucide-react";

export default function AdminRolesPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  const [roles, setRoles] = useState([]);
  const [adminRoles, setAdminRoles] = useState([]);
  const [adminRoleIds, setAdminRoleIds] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUserIds, setAdminUserIds] = useState([]);
  const [ownerId, setOwnerId] = useState("");
  const [ownerUser, setOwnerUser] = useState(null);

  const [selectedRole, setSelectedRole] = useState("");
  const [isAddingRole, setIsAddingRole] = useState(false);

  // User search / input states
  const [userQuery, setUserQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const searchContainerRef = useRef(null);

  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [meta, adminData] = await Promise.all([
        getGuildMeta(guildId),
        getAdminRoles(guildId),
      ]);
      setRoles(meta.roles || []);
      setAdminRoles(adminData.adminRoles || []);
      setAdminRoleIds(adminData.roleIds || []);
      setAdminUsers(adminData.adminUsers || []);
      setAdminUserIds(adminData.userIds || []);

      const detectedOwnerId = adminData.ownerId || meta?.guild?.ownerId || "";
      setOwnerId(detectedOwnerId);

      if (detectedOwnerId) {
        const foundOwner = (adminData.adminUsers || []).find((u) => u.id === detectedOwnerId);
        if (foundOwner) {
          setOwnerUser(foundOwner);
        } else {
          // Fetch owner details
          getGuildMembers(guildId, detectedOwnerId)
            .then((mList) => {
              const owner = mList.find((m) => m.id === detectedOwnerId);
              if (owner) setOwnerUser(owner);
            })
            .catch(() => {});
        }
      }
    } catch (err) {
      console.error(err);
      showToast?.("Failed to load staff permissions data.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  // Click outside search dropdown listener
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search for members
  useEffect(() => {
    if (!userQuery || selectedMember) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await getGuildMembers(guildId, userQuery);
        setSearchResults(results.filter((m) => !m.isBot));
        setShowDropdown(true);
      } catch (err) {
        console.error("Member search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [userQuery, guildId, selectedMember]);

  // Handle adding Admin Role
  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!selectedRole) return;
    setIsAddingRole(true);
    try {
      await addAdminRole(guildId, selectedRole);
      showToast("Staff admin role added successfully!");
      setSelectedRole("");
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to add admin role.", "error");
    } finally {
      setIsAddingRole(false);
    }
  };

  // Handle removing Admin Role
  const handleRemoveRole = async (roleId) => {
    try {
      await deleteAdminRole(guildId, roleId);
      showToast("Staff admin role revoked.");
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to revoke admin role.", "error");
    }
  };

  // Handle adding Admin User
  const handleAddUser = async (e) => {
    e.preventDefault();
    const targetId = selectedMember?.id || userQuery.trim();
    if (!targetId) return;

    if (!/^\d{17,20}$/.test(targetId)) {
      showToast("Please provide a valid 17-20 digit Discord User ID.", "error");
      return;
    }

    setIsAddingUser(true);
    try {
      await addAdminUser(guildId, targetId);
      showToast("Staff admin user added successfully!");
      setSelectedMember(null);
      setUserQuery("");
      setShowDropdown(false);
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to add admin user.", "error");
    } finally {
      setIsAddingUser(false);
    }
  };

  // Handle removing Admin User
  const handleRemoveUser = async (userId) => {
    if (userId === ownerId) {
      showToast("Server Owner administration privileges cannot be revoked.", "error");
      return;
    }
    try {
      await deleteAdminUser(guildId, userId);
      showToast("Staff admin user revoked.");
      await loadData();
    } catch (err) {
      showToast(err.message || "Failed to revoke admin user.", "error");
    }
  };

  const roleMap = new Map(roles.map((r) => [r.id, r]));

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Staff & Admin Access"]}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500/30 to-orange-600/30 border border-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Shield className="w-6 h-6" />
            </div>
            <span>Staff & Admin Access</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Authorize custom Discord roles or individual members with full bot administrative privileges without requiring the Discord Administrator permission bit.
          </p>
        </div>

        {/* Server Owner Card */}
        {ownerId && (
          <div className="glass-card p-5 rounded-3xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative shrink-0">
                  {ownerUser?.avatar ? (
                    <img
                      src={ownerUser.avatar}
                      alt=""
                      className="w-11 h-11 rounded-2xl object-cover ring-2 ring-amber-500/50"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-sm ring-2 ring-amber-500/40">
                      👑
                    </div>
                  )}
                  <span
                    className="absolute -top-1.5 -right-1.5 p-1 bg-amber-500 rounded-full text-slate-950 shadow-md"
                    title="Server Owner"
                  >
                    <Crown className="w-3 h-3 stroke-[2.5]" />
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-white truncate">
                      {ownerUser?.displayName || ownerUser?.username || `Owner (${ownerId})`}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Server Owner
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-400">
                    ID: {ownerId}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-right">
                <span className="text-xs text-amber-200/80 font-medium bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
                  Permanent Supreme Authority
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ================= SECTION 1: ADMIN USERS ================= */}
          <div className="space-y-4">
            <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-sm text-white">Authorized Admin Users</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {adminUserIds.length} {adminUserIds.length === 1 ? "User" : "Users"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Grant individual server members full bot administrative authority directly, even without a specific staff role.
              </p>

              {/* Add User Form */}
              <form onSubmit={handleAddUser} className="space-y-3">
                <div ref={searchContainerRef} className="relative">
                  {selectedMember ? (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-indigo-500/40 text-xs text-white">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {selectedMember.avatar ? (
                          <img
                            src={selectedMember.avatar}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-indigo-600/30 text-indigo-300 flex items-center justify-center font-bold text-xs">
                            {selectedMember.username?.slice(0, 1) || "U"}
                          </div>
                        )}
                        <div className="truncate">
                          <span className="font-semibold text-white">
                            {selectedMember.displayName || selectedMember.username}
                          </span>
                          <span className="text-slate-400 font-mono text-xs ml-1.5">
                            ({selectedMember.id})
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMember(null);
                          setUserQuery("");
                        }}
                        className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={userQuery}
                        onChange={(e) => {
                          setUserQuery(e.target.value);
                          setShowDropdown(true);
                        }}
                        onFocus={() => {
                          if (searchResults.length > 0) setShowDropdown(true);
                        }}
                        placeholder="Search member name or paste Discord User ID..."
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      {isSearching && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-3.5 h-3.5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Autocomplete Dropdown */}
                  {showDropdown && !selectedMember && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-20 max-h-56 overflow-y-auto rounded-xl bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-md divide-y divide-white/5">
                      {searchResults.length > 0 ? (
                        searchResults.map((m) => {
                          const alreadyAdmin = adminUserIds.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              disabled={alreadyAdmin}
                              onClick={() => {
                                setSelectedMember(m);
                                setShowDropdown(false);
                              }}
                              className={`w-full p-2.5 flex items-center justify-between text-left transition-colors ${
                                alreadyAdmin
                                  ? "opacity-50 cursor-not-allowed bg-slate-800/30"
                                  : "hover:bg-indigo-600/20"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {m.avatar ? (
                                  <img
                                    src={m.avatar}
                                    alt=""
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
                                    {m.username?.slice(0, 1) || "U"}
                                  </div>
                                )}
                                <div className="truncate">
                                  <p className="text-xs font-semibold text-white truncate">
                                    {m.displayName || m.username}
                                  </p>
                                  <p className="text-xs font-mono text-slate-500">
                                    ID: {m.id}
                                  </p>
                                </div>
                              </div>
                              {alreadyAdmin ? (
                                <span className="text-xs text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10">
                                  Active Admin
                                </span>
                              ) : (
                                <span className="text-xs text-indigo-400 font-semibold">
                                  Select
                                </span>
                              )}
                            </button>
                          );
                        })
                      ) : userQuery && !isSearching ? (
                        <div className="p-3 text-center text-xs text-slate-400">
                          {/^\d{17,20}$/.test(userQuery.trim()) ? (
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-indigo-300">ID: {userQuery.trim()}</span>
                              <span className="text-xs text-slate-500">Ready to add as Snowflake</span>
                            </div>
                          ) : (
                            "No members found. You can enter a 17-20 digit Discord User ID."
                          )}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isAddingUser || (!selectedMember && !/^\d{17,20}$/.test(userQuery.trim()))}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isAddingUser ? "Adding..." : "Add Admin User"}</span>
                </button>
              </form>

              {/* Users List */}
              <div className="pt-2">
                {adminUsers.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    <ShieldAlert className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    No individual admin users designated yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {adminUsers.map((adminUser) => {
                      const isOwner = adminUser.id === ownerId || adminUser.isOwner;
                      return (
                        <div
                          key={adminUser.id}
                          className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {adminUser.avatar ? (
                              <img
                                src={adminUser.avatar}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs">
                                {adminUser.username?.slice(0, 1) || "U"}
                              </div>
                            )}
                            <div className="truncate">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-semibold text-xs text-white truncate">
                                  {adminUser.username}
                                </span>
                                {isOwner && (
                                  <span className="text-xs font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                                    Owner
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-mono text-slate-500">
                                ID: {adminUser.id}
                              </p>
                            </div>
                          </div>

                          {isOwner ? (
                            <span
                              className="p-2 text-amber-400/80 cursor-default"
                              title="Server Owner cannot be revoked"
                            >
                              <Crown className="w-4 h-4" />
                            </span>
                          ) : (
                            <button
                              onClick={() => handleRemoveUser(adminUser.id)}
                              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                              title="Revoke Admin Access"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================= SECTION 2: ADMIN ROLES ================= */}
          <div className="space-y-4">
            <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  <h3 className="font-bold text-sm text-white">Authorized Staff Roles</h3>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {adminRoleIds.length} {adminRoleIds.length === 1 ? "Role" : "Roles"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Designate custom server roles. Any member holding one of these roles will receive full bot configuration privileges.
              </p>

              {/* Add Role Form */}
              <form onSubmit={handleAddRole} className="space-y-3">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select a role to authorize...</option>
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
                  disabled={isAddingRole || !selectedRole}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingRole ? "Adding..." : "Add Staff Role"}</span>
                </button>
              </form>

              {/* Roles List */}
              <div className="pt-2">
                {adminRoleIds.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-500">
                    <ShieldAlert className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    No custom admin roles added yet.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {adminRoleIds.map((roleId) => {
                      const role = roleMap.get(roleId);
                      return (
                        <div
                          key={roleId}
                          className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5 flex items-center justify-between gap-3"
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
                              <p className="text-xs font-mono text-slate-500">
                                ID: {roleId}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveRole(roleId)}
                            className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                            title="Revoke Role Permissions"
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
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
