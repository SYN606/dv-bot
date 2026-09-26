import React, { useState, useEffect } from "react";
import BaseLayout from "../components/layout/Base";
import { fetchApi } from "../api/client";
import { ShieldAlert, Key, Search, User as UserIcon, AlertTriangle, ShieldCheck, RefreshCw, Activity } from "lucide-react";

export default function PermissionsAuditPage({ user, botInfo, showToast }) {
  const [loading, setLoading] = useState(true);
  const [auditData, setAuditData] = useState({ roles: [], members: [] });
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [memberPerms, setMemberPerms] = useState(null);
  const [searchingMember, setSearchingMember] = useState(false);

  // Pagination & Sorting States
  const [memberPage, setMemberPage] = useState(1);
  const [rolePage, setRolePage] = useState(1);
  const [memberSort, setMemberSort] = useState("threatDesc");
  const [roleSort, setRoleSort] = useState("posDesc");
  const itemsPerPage = 5;

  const guildId = window.location.pathname.split("/")[2];

  const loadAuditData = async () => {
    setLoading(true);
    try {
      const data = await fetchApi(`/api/guilds/${guildId}/permissions/audit`);
      if (data.error) {
        showToast(data.error, "error");
      } else {
        setAuditData(data || { roles: [], members: [] });
      }
    } catch (err) {
      showToast(err.message || "Failed to load audit data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditData();
  }, [guildId]);

  useEffect(() => {
    if (!search || search.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const data = await fetchApi(`/api/guilds/${guildId}/members?q=${search}&limit=5`);
        if (Array.isArray(data)) {
          setSearchResults(data);
          setShowDropdown(true);
        }
      } catch (e) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [search, guildId]);

  const handleSearchMember = async (targetId) => {
    const target = (typeof targetId === "string" ? targetId : search).trim();
    if (!target) return;
    
    setSearchingMember(true);
    setShowDropdown(false);
    setMemberPerms(null); // Clear previous results
    
    try {
      const data = await fetchApi(`/api/guilds/${guildId}/permissions/member/${target}`);
      if (data.error) {
        showToast(data.error, "error");
      } else if (!data.user) {
        showToast("Received malformed data from server.", "error");
      } else {
        setMemberPerms(data);
      }
    } catch (err) {
      showToast(err.message || "Could not find member or fetch permissions.", "error");
    } finally {
      setSearchingMember(false);
    }
  };

  const getRiskColor = (level) => {
    if (level === "red") return "text-rose-500 bg-rose-500/10 border-rose-500/20";
    if (level === "yellow") return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  };

  // Calculate Heatmap percentages
  const totalAudited = auditData?.members?.length || 0;
  const criticalCount = auditData?.members?.filter(m => m.threatLevel === 'Critical').length || 0;
  const highCount = auditData?.members?.filter(m => m.threatLevel === 'High').length || 0;
  const safePercent = totalAudited > 0 ? Math.max(0, 100 - ((criticalCount + highCount) / totalAudited * 100)) : 100;
  
  // Sorting
  const sortedMembers = [...(auditData?.members || [])].sort((a, b) => {
    if (memberSort === "threatDesc") return b.threatScore - a.threatScore;
    if (memberSort === "threatAsc") return a.threatScore - b.threatScore;
    return 0;
  });

  const sortedRoles = [...(auditData?.roles || [])].sort((a, b) => {
    if (roleSort === "posDesc") return b.position - a.position;
    if (roleSort === "memDesc") return b.memberCount - a.memberCount;
    return 0;
  });

  // Pagination
  const memberTotalPages = Math.ceil(sortedMembers.length / itemsPerPage) || 1;
  const roleTotalPages = Math.ceil(sortedRoles.length / itemsPerPage) || 1;
  
  const currentMembers = sortedMembers.slice((memberPage - 1) * itemsPerPage, memberPage * itemsPerPage);
  const currentRoles = sortedRoles.slice((rolePage - 1) * itemsPerPage, rolePage * itemsPerPage);

  return (
    <BaseLayout user={user} botInfo={botInfo}>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Heatmap Summary */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
              <ShieldAlert className="w-7 h-7 text-rose-500" />
              Permissions Audit
            </h1>
            <p className="text-slate-400 mt-1">
              Detect and manage members holding dangerous permissions.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 min-w-[250px]">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-400 font-semibold uppercase tracking-wider">Server Health</span>
              <span className="text-white font-bold">{Math.round(safePercent)}% Safe</span>
            </div>
            <div className="w-full bg-rose-500 h-2 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full transition-all" style={{ width: `${safePercent}%` }}></div>
              <div className="bg-amber-500 h-full transition-all" style={{ width: `${totalAudited ? (highCount/totalAudited)*100 : 0}%` }}></div>
            </div>
          </div>
        </div>

        {/* Member Search */}
        <section>
          <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-400" />
              Individual Member Scan
            </h2>
            <form onSubmit={(e) => { e.preventDefault(); handleSearchMember(); }} className="relative mb-6">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Enter Username or Discord User ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => { if(searchResults.length > 0) setShowDropdown(true); }}
                  className="flex-1 bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                <button
                  type="submit"
                  disabled={searchingMember || !search}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                >
                  {searchingMember ? "Scanning..." : "Audit User"}
                </button>
              </div>

              {/* Autocomplete Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-full max-w-md bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                  {searchResults.map((res) => (
                    <div 
                      key={res.id} 
                      onClick={() => {
                        setSearch(res.id);
                        handleSearchMember(res.id);
                      }}
                      className="flex items-center gap-3 p-3 hover:bg-slate-800 cursor-pointer border-b border-white/5 last:border-0 transition-colors"
                    >
                      <img src={res.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-8 h-8 rounded-full" alt="av" />
                      <div>
                        <p className="text-sm font-bold text-white flex items-center gap-1">
                          {res.displayName} 
                          {res.isBot && <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1 py-0.5 rounded uppercase">BOT</span>}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">{res.id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </form>

            {memberPerms && (
              <div className="bg-slate-900/50 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
                {/* Background glow based on threat level */}
                <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 pointer-events-none translate-x-1/2 -translate-y-1/2 ${
                   memberPerms.threatLevel === 'Critical' ? 'bg-rose-500' :
                   memberPerms.threatLevel === 'High' ? 'bg-amber-500' :
                   memberPerms.threatLevel === 'Moderate' ? 'bg-yellow-500' :
                   'bg-emerald-500'
                }`}></div>
                
                <div className="flex flex-col items-center gap-4 min-w-[200px] relative z-10">
                  <div className="relative">
                    <img src={memberPerms.user?.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} alt="avatar" className="w-20 h-20 rounded-full ring-4 ring-slate-800 shadow-xl" />
                    {memberPerms.user?.bot && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-slate-900">
                        BOT
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <h3 className="text-slate-100 font-bold text-lg">{memberPerms.user?.username || "Unknown"}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-1">{memberPerms.user?.id || search}</p>
                  </div>
                  
                  <div className="w-full flex flex-col gap-2 mt-2">
                    <div className={`w-full py-2 px-3 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                      memberPerms.threatLevel === 'Critical' ? 'bg-rose-500/10 border-rose-500/30' :
                      memberPerms.threatLevel === 'High' ? 'bg-amber-500/10 border-amber-500/30' :
                      memberPerms.threatLevel === 'Moderate' ? 'bg-yellow-500/10 border-yellow-500/30' :
                      'bg-emerald-500/10 border-emerald-500/30'
                    }`}>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Threat Level</span>
                      <span className={`text-base font-black uppercase ${
                        memberPerms.threatLevel === 'Critical' ? 'text-rose-400' :
                        memberPerms.threatLevel === 'High' ? 'text-amber-400' :
                        memberPerms.threatLevel === 'Moderate' ? 'text-yellow-400' :
                        'text-emerald-400'
                      }`}>{memberPerms.threatLevel}</span>
                    </div>
                    <div className="w-full py-1.5 px-3 rounded-lg bg-slate-950 border border-white/5 flex justify-between items-center">
                      <span className="text-xs text-slate-400 font-semibold">Total Score</span>
                      <span className="text-sm font-mono font-bold text-slate-200">{memberPerms.threatScore}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 space-y-5 w-full relative z-10">
                  {/* Categorized Permissions */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 pb-3 border-b border-white/5">
                      {memberPerms.permissions?.length > 0 ? (
                        <><AlertTriangle className="w-4 h-4 text-amber-500" /> Dangerous Permissions Detected</>
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
                  
                  {/* Punishment History */}
                  <div className="pt-5 border-t border-white/5 mt-5">
                    <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-500" /> Punishment History
                    </h4>
                    
                    {!memberPerms.history || memberPerms.history.length === 0 ? (
                      <div className="bg-slate-900/50 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5" /> This user has a clean record.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-xs text-slate-400 mb-2 font-semibold">Total Infractions: {memberPerms.history.length}</div>
                        {memberPerms.history.map((record, idx) => (
                          <div key={idx} className="bg-slate-900 border border-white/5 p-4 rounded-xl flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                  record.type === 'BAN' ? 'bg-rose-500/20 text-rose-400' :
                                  record.type === 'KICK' ? 'bg-orange-500/20 text-orange-400' :
                                  record.type === 'TEMPBAN' ? 'bg-amber-500/20 text-amber-400' :
                                  record.type === 'TIMEOUT' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {record.type === 'BAN' ? '🔨 ' : record.type === 'KICK' ? '👢 ' : record.type === 'TEMPBAN' ? '⏲️ ' : record.type === 'TIMEOUT' ? '⏳ ' : '⚠️ '}{record.type}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {new Date(record.date).toLocaleDateString()} {new Date(record.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-300 mt-1">{record.reason}</p>
                            <div className="text-[10px] text-slate-500 mt-1 font-mono">
                              Moderator ID: {record.moderator_id}
                            </div>
                          </div>
                        ))}
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const csvContent = "data:text/csv;charset=utf-8," 
                    + "Role ID,Role Name,Dangerous Perms\n"
                    + auditData.roles.map(r => `${r.id},"${r.name}","${r.permissions.map(p => p.name).join('; ')}"`).join("\n")
                    + "\n\nMember ID,Username,Threat Score,Threat Level\n"
                    + auditData.members.map(m => `${m.id},"${m.username}",${m.threatScore},${m.threatLevel}`).join("\n");
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement("a");
                  link.setAttribute("href", encodedUri);
                  link.setAttribute("download", `security_audit_${guildId}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
                title="Export to CSV"
              >
                Export Report
              </button>
              <button
                onClick={loadAuditData}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Scan
              </button>
            </div>
          </div>

          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Members with dangerous perms */}
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex flex-col h-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                  <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                    <UserIcon className="w-5 h-5 text-rose-400" />
                    Privileged Members ({auditData?.members?.length || 0})
                  </h2>
                  <select 
                    value={memberSort}
                    onChange={(e) => { setMemberSort(e.target.value); setMemberPage(1); }}
                    className="bg-slate-900 border border-white/10 text-xs text-slate-300 rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="threatDesc">Highest Threat</option>
                    <option value="threatAsc">Lowest Threat</option>
                  </select>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {currentMembers.length === 0 ? (
                    <div className="text-slate-400 text-sm text-center py-8">
                      No highly privileged members found.
                    </div>
                  ) : currentMembers.map(member => (
                    <div key={member.id} className={`bg-slate-950/50 border rounded-xl p-4 flex flex-col gap-3 transition-colors hover:bg-slate-900/50 ${
                      member.threatLevel === 'Critical' ? 'border-rose-500/20' : 
                      member.threatLevel === 'High' ? 'border-amber-500/20' : 
                      member.threatLevel === 'Moderate' ? 'border-yellow-500/20' :
                      'border-emerald-500/20'
                    }`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img src={member.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"} className="w-9 h-9 rounded-full ring-2 ring-white/10" alt="av" />
                          <div className="flex-1 flex flex-col">
                            <span className="font-semibold text-slate-200 flex items-center gap-2 text-sm">
                              {member.username}
                              {member.bot && <span className="text-[9px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded uppercase font-bold">BOT</span>}
                              {member.isOwner && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded uppercase font-bold">OWNER</span>}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">{member.id}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSearch(member.id);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            setTimeout(() => {
                              document.querySelector("form").dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
                            }, 50);
                          }}
                          className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-xs font-bold transition-colors"
                        >
                          Audit
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5 text-slate-400" />
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 ${
                            member.threatLevel === 'Critical' ? 'text-rose-400' :
                            member.threatLevel === 'High' ? 'text-amber-400' :
                            member.threatLevel === 'Moderate' ? 'text-yellow-400' :
                            'text-emerald-400'
                          }`}>
                            {member.threatLevel} Risk
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            {member.redCount > 0 && <span className="text-rose-400">🔴 {member.redCount}</span>}
                            {member.yellowCount > 0 && <span className="text-amber-400">🟡 {member.yellowCount}</span>}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono font-bold bg-slate-900 px-1.5 py-0.5 rounded-md ml-1 border border-white/5">
                            Score: {member.threatScore}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Pagination Controls */}
                {memberTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                    <button
                      onClick={() => setMemberPage(Math.max(1, memberPage - 1))}
                      disabled={memberPage === 1}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded text-xs font-semibold text-slate-300"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-slate-400 font-mono">
                      Page {memberPage} of {memberTotalPages}
                    </span>
                    <button
                      onClick={() => setMemberPage(Math.min(memberTotalPages, memberPage + 1))}
                      disabled={memberPage === memberTotalPages}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded text-xs font-semibold text-slate-300"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              {/* Roles with dangerous perms */}
              <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 flex flex-col h-full">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
                  <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                    <Key className="w-5 h-5 text-amber-400" />
                    Elevated Roles ({auditData?.roles?.length || 0})
                  </h2>
                  <select 
                    value={roleSort}
                    onChange={(e) => { setRoleSort(e.target.value); setRolePage(1); }}
                    className="bg-slate-900 border border-white/10 text-xs text-slate-300 rounded-lg px-2 py-1 focus:outline-none"
                  >
                    <option value="posDesc">Highest Hierarchy</option>
                    <option value="memDesc">Most Members</option>
                  </select>
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {currentRoles.length === 0 ? (
                    <div className="text-slate-400 text-sm text-center py-8">
                      No roles found with elevated permissions.
                    </div>
                  ) : currentRoles.map(role => (
                    <div key={role.id} className="bg-slate-950/50 border border-white/5 rounded-xl p-4 flex flex-col gap-3 transition-colors hover:bg-slate-900/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full ring-2 ring-white/10" style={{ backgroundColor: role.hexColor !== '#000000' ? role.hexColor : '#99aab5' }} />
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-200 text-sm">{role.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{role.id}</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-400 bg-slate-900 px-2 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
                          <UserIcon className="w-3 h-3" />
                          {role.memberCount}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                        {role.permissions.map((p, i) => (
                          <span key={i} className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskColor(p.level)} flex items-center gap-1`}>
                            {p.level === "red" ? "🔴" : p.level === "yellow" ? "🟡" : "🟢"} {p.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Pagination Controls */}
                {roleTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                    <button
                      onClick={() => setRolePage(Math.max(1, rolePage - 1))}
                      disabled={rolePage === 1}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded text-xs font-semibold text-slate-300"
                    >
                      Prev
                    </button>
                    <span className="text-xs text-slate-400 font-mono">
                      Page {rolePage} of {roleTotalPages}
                    </span>
                    <button
                      onClick={() => setRolePage(Math.min(roleTotalPages, rolePage + 1))}
                      disabled={rolePage === roleTotalPages}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded text-xs font-semibold text-slate-300"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

            </div>
          )}
        </section>

      </div>
    </BaseLayout>
  );
}
