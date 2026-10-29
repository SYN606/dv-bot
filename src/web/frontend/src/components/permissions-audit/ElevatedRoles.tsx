import React, { useState, useMemo, useEffect } from "react";
import Badge from "../ui/Badge";
import Pagination from "../ui/Pagination";
import { getRiskLabel, getRiskVariant } from "../../utils/permissions-audit";
import { ShieldCheck, Search, Filter, Key, Users, AlertTriangle } from "lucide-react";

export default function ElevatedRoles({ roles = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [permFilter, setPermFilter] = useState("all");
  const [sort, setSort] = useState("posDesc");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [roles, searchQuery, permFilter, sort, itemsPerPage]);

  const filteredRoles = useMemo(() => {
    let arr = [...roles];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      arr = arr.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.id?.includes(q) ||
          r.permissions?.some((p) => (p.name || p.permission)?.toLowerCase().includes(q))
      );
    }

    // Permission filter
    if (permFilter !== "all") {
      arr = arr.filter((r) =>
        r.permissions?.some((p) => {
          const name = (p.name || p.permission || "").toLowerCase();
          if (permFilter === "admin") return name.includes("administrator");
          if (permFilter === "roles") return name.includes("manage roles");
          if (permFilter === "server") return name.includes("manage server") || name.includes("manage guild");
          if (permFilter === "mod") return name.includes("ban") || name.includes("kick") || name.includes("timeout") || name.includes("moderate");
          return true;
        })
      );
    }

    // Sort
    if (sort === "posDesc") {
      arr.sort((a, b) => (b.position || 0) - (a.position || 0));
    } else if (sort === "posAsc") {
      arr.sort((a, b) => (a.position || 0) - (b.position || 0));
    } else if (sort === "membersDesc") {
      arr.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
    } else if (sort === "permsDesc") {
      arr.sort((a, b) => (b.permissions?.length || 0) - (a.permissions?.length || 0));
    }

    return arr;
  }, [roles, searchQuery, permFilter, sort]);

  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage) || 1;
  const paginatedRoles = filteredRoles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/5 flex flex-col space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Elevated Roles Matrix</h3>
            <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
              {filteredRoles.length} detected
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Roles that confer administrative, server modification, or moderation capabilities.
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 w-full lg:w-72">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search role name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter by:
          </span>
          {[
            { id: "all", label: "All Roles" },
            { id: "admin", label: "Administrator" },
            { id: "roles", label: "Manage Roles" },
            { id: "server", label: "Manage Server" },
            { id: "mod", label: "Ban / Kick / Mod" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPermFilter(item.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors border ${
                permFilter === item.id
                  ? "bg-white/15 text-white border-white/20"
                  : "bg-slate-900 text-slate-400 border-white/5 hover:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-2.5 py-1 bg-slate-900 border border-white/10 rounded-lg text-[11px] text-slate-300 focus:outline-none"
          >
            <option value="posDesc">Highest Hierarchy ▼</option>
            <option value="posAsc">Lowest Hierarchy ▲</option>
            <option value="membersDesc">Most Members ▼</option>
            <option value="permsDesc">Most Permissions ▼</option>
          </select>

          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-2.5 py-1 bg-slate-900 border border-white/10 rounded-lg text-[11px] text-slate-300 focus:outline-none"
          >
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
          </select>
        </div>
      </div>

      {/* Roles List */}
      {paginatedRoles.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-dashed border-white/5">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-white mb-1">No elevated roles match criteria</p>
          <p className="text-xs text-slate-400">All filtered roles appear to have minimal permissions.</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {paginatedRoles.map((r) => {
            const rawColor = r.hexColor || r.color;
            const roleColor = rawColor && rawColor !== "#000000" ? rawColor : "#818cf8";
            const isAdminRole = r.permissions?.some(
              (p) => p.name === "Administrator" || p.permission === "Administrator"
            );

            return (
              <div
                key={r.id}
                className={`p-4 rounded-xl bg-slate-900/50 border transition-all flex flex-col gap-3 ${
                  isAdminRole ? "border-brand-crimson/30 hover:border-brand-crimson/50" : "border-white/5 hover:border-white/15"
                }`}
              >
                {/* Role Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm ring-2 ring-white/10"
                      style={{ backgroundColor: roleColor }}
                    />
                    <span className="font-bold text-sm sm:text-base text-white truncate">@{r.name}</span>
                    {isAdminRole && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-brand-crimson/20 text-rose-300 border border-brand-crimson/30">
                        ADMINISTRATOR
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs shrink-0">
                    <span className="font-mono text-[11px] bg-white/5 text-slate-300 px-2.5 py-1 rounded-md border border-white/5">
                      Hierarchy #{r.position}
                    </span>
                    <span
                      className={`font-mono text-[11px] px-2.5 py-1 rounded-md border ${
                        r.memberCount > 50 && isAdminRole
                          ? "bg-brand-crimson/20 text-rose-300 border-brand-crimson/30 font-bold"
                          : "bg-white/5 text-slate-300 border-white/5"
                      }`}
                    >
                      <Users className="w-3 h-3 inline mr-1 opacity-70" />
                      {r.memberCount || 0} members
                    </span>
                  </div>
                </div>

                {/* Granted Permissions Tags */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {(r.permissions || []).map((p, idx) => {
                    const isCrit = p.level === "red" || p.level === "critical";
                    const pRisk = getRiskLabel(p.level);

                    return (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                          isCrit
                            ? "bg-brand-crimson/10 text-rose-300 border-brand-crimson/20"
                            : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                        <span>{p.name || p.permission}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Role ID Footer */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-white/5">
                  <span>Role ID: {r.id}</span>
                  {r.memberCount > 50 && isAdminRole && (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Large member pool with Administrator access
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pt-2">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      )}
    </div>
  );
}
