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
      .then(data => setAuditData(data))
      .catch(err => showToast(err.message, "error"))
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
    } finally {
      setSearchingMember(false);
    }
  };

  const getRiskColor = (level) => {
    if (level === "red") return "text-rose-500 bg-rose-500/10 border-rose-500/20";
    if (level === "yellow") return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  };

  return (
    <BaseLayout user={user} botInfo={botInfo}>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-rose-500" />
            Permissions Audit
          </h1>
          <p className="text-slate-400 mt-1">
            Detect and manage members holding dangerous permissions.
          </p>
        </div>

        {/* Member Search */}
        <section>
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
                <div className="flex-1 space-y-4 w-full">
                  {/* Categorized Permissions */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
                      {memberPerms.permissions?.length > 0 ? (
                        <><AlertTriangle className="w-4 h-4 text-amber-500" /> Detected Elevated Permissions</>
                      ) : (
                        <><ShieldCheck className="w-4 h-4 text-emerald-500" /> Safe (No Dangerous Perms)</>
                      )}
                    </h4>
                    
                    {memberPerms.permissions?.length > 0 && (
                      <div className="flex flex-col gap-4">
                        {["red", "yellow", "green"].map(level => {
                          const levelPerms = memberPerms.permissions.filter(p => p.level === level);
                          if (levelPerms.length === 0) return null;
                          
                          const emoji = level === "red" ? "🔴" : level === "yellow" ? "🟡" : "🟢";
                          const title = level === "red" ? "RED RISK" : level === "yellow" ? "YELLOW RISK" : "GREEN RISK";
                          
                          return (
                            <div key={level} className="flex flex-col gap-2">
                              <h5 className={`text-sm font-bold flex items-center gap-2 ${getRiskColor(level).split(' ')[0]}`}>
                                {emoji} {title}
                              </h5>
                              <div className="space-y-2">
                                {levelPerms.map((p, i) => (
                                  <div key={i} className="pl-6 border-l-2 border-white/10 ml-2">
                                    <div className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                                      {emoji} {p.permission}
                                    </div>
                                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                                      └ Sources: <span className="text-slate-300">{p.roles.join(" • ")}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Global Audit */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              Server-Wide Audit
            </h2>
            <button
              onClick={() => {
                setLoading(true);
                fetchApi(`/guilds/${guildId}/permissions/audit`).then(setAuditData).finally(() => setLoading(false));
              }}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
            >
              Refresh Scan
            </button>
          </div>

          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Members with dangerous perms */}
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-rose-400" />
                  Privileged Members ({auditData?.members?.length || 0})
                </h2>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {auditData?.members?.map(member => (
                    <div key={member.id} className="bg-slate-950/50 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img src={member.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-8 h-8 rounded-full" alt="av" />
                          <div className="flex-1 flex flex-col">
                            <span className="font-semibold text-slate-200 flex items-center gap-2">
                              {member.username}
                              {member.bot && <span className="text-[10px] bg-indigo-500 text-white px-1.5 py-0.5 rounded uppercase font-bold">BOT</span>}
                              {member.isOwner && <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded uppercase font-bold">OWNER</span>}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">{member.id}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSearch(member.id);
                            setTimeout(() => {
                              document.querySelector("form").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
                            }, 50);
                          }}
                          className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-xs font-bold transition-colors"
                        >
                          Audit
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {member.redCount > 0 && (
                          <span className="text-xs font-bold text-rose-400">
                            🔴 {member.redCount} High Risk
                          </span>
                        )}
                        {member.redCount > 0 && member.yellowCount > 0 && (
                          <span className="text-xs text-slate-600">|</span>
                        )}
                        {member.yellowCount > 0 && (
                          <span className="text-xs font-bold text-amber-400">
                            🟡 {member.yellowCount} Medium Risk
                          </span>
                        )}
                        {member.redCount === 0 && member.yellowCount === 0 && (
                          <span className="text-xs font-bold text-emerald-400">
                            🟢 Safe (Low Risk Only)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {auditData?.members?.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      No members found with elevated permissions.
                    </div>
                  )}
                </div>
              </div>

              {/* Roles with dangerous perms */}
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
                <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" />
                  Elevated Roles ({auditData?.roles?.length || 0})
                </h2>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {auditData?.roles?.map(role => (
                    <div key={role.id} className="bg-slate-950/50 border border-white/5 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: role.hexColor !== '#000000' ? role.hexColor : '#99aab5' }} />
                          <span className="font-semibold text-slate-200">{role.name}</span>
                        </div>
                        <span className="text-xs text-slate-500">{role.memberCount} members</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {role.permissions.map((p, i) => (
                          <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskColor(p.level)}`}>
                            {p.level === "red" ? "🔴" : p.level === "yellow" ? "🟡" : "🟢"} {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {auditData?.roles?.length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">
                      No roles found with elevated permissions.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </section>

      </div>
    </BaseLayout>
  );
}
