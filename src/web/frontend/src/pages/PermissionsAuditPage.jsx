import React, { useState, useEffect } from "react";
import BaseLayout from "../components/layout/Base";
import { fetchApi } from "../api/client";
import { ShieldAlert, Key, Search, User as UserIcon, AlertTriangle, ShieldCheck } from "lucide-react";

export default function PermissionsAuditPage({ user, botInfo, showToast }) {
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState({ roles: [], members: [] });
  const [search, setSearch] = useState("");
  const [memberPerms, setMemberPerms] = useState(null);
  const [searchingMember, setSearchingMember] = useState(false);

  const guildId = window.location.pathname.split("/")[2];

  useEffect(() => {
    fetchApi(`/guilds/${guildId}/permissions/audit`)
      .then((data) => {
        if (data && data.roles && data.members) {
          setAuditData(data);
        } else {
          setAuditData({ roles: [], members: [] });
          if (data && data.error) showToast(data.error, "error");
        }
      })
      .catch((err) => {
        setAuditData({ roles: [], members: [] });
        showToast("Failed to fetch permissions audit.", "error");
      })
      .finally(() => setLoading(false));
  }, [guildId]);

  const handleSearchMember = async (e) => {
    e.preventDefault();
    if (!search) return;
    
    setSearchingMember(true);
    setMemberPerms(null);
    try {
      const data = await fetchApi(`/guilds/${guildId}/permissions/member/${search}`);
      if (data.error) {
        showToast(data.error, "error");
      } else {
        setMemberPerms(data);
      }
    } catch (err) {
      showToast("Could not find member or fetch permissions.", "error");
    }
    setSearchingMember(false);
  };

  return (
    <BaseLayout user={user} botInfo={botInfo}>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-rose-400" />
            Permissions Audit
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Scan your server for members and roles possessing dangerous administrative permissions.
          </p>
        </div>

        {/* Member Search */}
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-400" />
            Individual Member Scan
          </h2>
          <form onSubmit={handleSearchMember} className="flex items-center gap-3 mb-6">
            <input
              type="text"
              placeholder="Enter Discord User ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
            <button
              type="submit"
              disabled={searchingMember || !search}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
            >
              {searchingMember ? "Scanning..." : "Audit User"}
            </button>
          </form>

          {memberPerms && (
            <div className="bg-slate-950/50 border border-white/5 rounded-xl p-5 flex flex-col md:flex-row gap-6 items-start">
              <div className="flex items-center gap-4 min-w-[200px]">
                <img src={memberPerms.user?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} alt="avatar" className="w-14 h-14 rounded-full ring-2 ring-indigo-500/30" />
                <div>
                  <h3 className="text-slate-200 font-bold">{memberPerms.user?.username || "Unknown"}</h3>
                  <p className="text-xs text-slate-500">{memberPerms.user?.id || search}</p>
                </div>
              </div>
              <div className="flex-1 space-y-4">
                {/* Dangerous Permissions */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    {memberPerms.permissions?.dangerous?.length > 0 ? (
                      <><AlertTriangle className="w-4 h-4 text-amber-500" /> Dangerous Perms ({memberPerms.permissions.dangerous.length})</>
                    ) : (
                      <><ShieldCheck className="w-4 h-4 text-emerald-500" /> Safe (No Dangerous Perms)</>
                    )}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {memberPerms.permissions?.dangerous?.length > 0 ? memberPerms.permissions.dangerous.map(p => (
                      <span key={p} className="px-2 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-md text-xs font-medium">
                        {p}
                      </span>
                    )) : null}
                  </div>
                </div>

                {/* Roles */}
                <div className="pt-2 border-t border-white/5">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Roles ({memberPerms.user?.roles?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {memberPerms.user?.roles?.length > 0 ? memberPerms.user.roles.map(r => (
                      <span key={r.id} className="text-xs px-2 py-1 rounded bg-slate-800/50 text-slate-300 border border-white/5 flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.hexColor !== "#000000" ? r.hexColor : "#99aab5" }} />
                        {r.name}
                      </span>
                    )) : (
                      <span className="text-xs text-slate-500">No roles</span>
                    )}
                  </div>
                </div>

                {/* All Permissions */}
                <div className="pt-2 border-t border-white/5">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    All Active Permissions ({memberPerms.permissions?.all?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar pr-2">
                    {memberPerms.permissions?.all?.length > 0 ? memberPerms.permissions.all.map(p => (
                      <span key={p} className="text-[10px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                        {p}
                      </span>
                    )) : (
                      <span className="text-xs text-slate-500">No permissions</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Server Audit */}
        <div className="flex items-center justify-between mt-8 mb-4">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            Full Server Permissions Audit
          </h2>
          <button
            onClick={() => {
              setLoading(true);
              fetchApi(`/guilds/${guildId}/permissions/audit`)
                .then((data) => {
                  if (data && data.roles && data.members) {
                    setAuditData(data);
                  } else {
                    setAuditData({ roles: [], members: [] });
                    if (data && data.error) showToast(data.error, "error");
                  }
                })
                .catch((err) => {
                  setAuditData({ roles: [], members: [] });
                  showToast("Failed to refresh permissions audit.", "error");
                })
                .finally(() => setLoading(false));
            }}
            disabled={loading}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? "Scanning..." : "Refresh Scan"}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 bg-slate-900/50 border border-white/5 rounded-2xl">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Roles with dangerous perms */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                Dangerous Roles ({auditData?.roles?.length || 0})
              </h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {auditData?.roles?.map(role => (
                  <div key={role.id} className="bg-slate-950/50 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.color !== "#000000" ? role.color : "#99aab5" }} />
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-200">{role.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{role.id}</span>
                        </div>
                      </div>
                      {role.isManaged && <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full uppercase font-bold">Bot/Integration</span>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {role.permissions?.map(p => (
                        <span key={p} className="text-[10px] bg-rose-500/10 text-rose-300 px-1.5 py-0.5 rounded uppercase font-semibold">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {(!auditData?.roles || auditData.roles.length === 0) && (
                  <div className="text-slate-400 text-sm text-center py-6">No roles have dangerous permissions!</div>
                )}
              </div>
            </div>

            {/* Members with dangerous perms */}
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-rose-400" />
                Privileged Members ({auditData?.members?.length || 0})
              </h2>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {auditData?.members?.map(member => (
                  <div key={member.id} className="bg-slate-950/50 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <img src={member.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-8 h-8 rounded-full" alt="av" />
                      <div className="flex-1 flex flex-col">
                        <span className="font-semibold text-slate-200 flex items-center gap-2">
                          {member.username}
                          {member.bot && <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded uppercase font-bold">BOT</span>}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{member.id}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {member.permissions?.map(p => (
                        <span key={p} className="text-[10px] bg-rose-500/10 text-rose-300 px-1.5 py-0.5 rounded uppercase font-semibold">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {(!auditData?.members || auditData.members.length === 0) && (
                  <div className="text-slate-400 text-sm text-center py-6">No members have dangerous permissions!</div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </BaseLayout>
  );
}
