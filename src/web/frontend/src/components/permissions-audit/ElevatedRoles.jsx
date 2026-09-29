import React, { useState, useMemo, useEffect } from "react";
import Badge from "../ui/Badge";
import Pagination from "../ui/Pagination";
import { getRiskLabel, getRiskVariant } from "../../utils/permissions-audit";
import { ShieldCheck } from "lucide-react";

export default function ElevatedRoles({ roles }) {
  const [sort, setSort] = useState("posDesc");
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [roles, sort, itemsPerPage]);

  const sortedRoles = useMemo(() => {
    const arr = [...(roles || [])];
    if (sort === "posDesc") {
      arr.sort((a, b) => b.position - a.position);
    } else if (sort === "posAsc") {
      arr.sort((a, b) => a.position - b.position);
    } else if (sort === "membersDesc") {
      arr.sort((a, b) => (b.memberCount || 0) - (a.memberCount || 0));
    }
    return arr;
  }, [roles, sort]);

  const totalPages = Math.ceil(sortedRoles.length / itemsPerPage) || 1;
  const paginatedRoles = sortedRoles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (!roles || roles.length === 0) {
    return (
      <div className="glass-panel p-8 rounded-3xl border border-dashed border-white/5 text-center h-full flex flex-col justify-center">
        <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-bold text-white mb-2">No Elevated Roles</h3>
        <p className="text-sm text-slate-400">No roles with elevated permission findings detected.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Elevated Roles</h3>
          <p className="text-xs text-slate-400">Roles granting potentially dangerous server permissions.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="posDesc">Highest Hierarchy ▼</option>
            <option value="posAsc">Lowest Hierarchy ▲</option>
            <option value="membersDesc">Most Members ▼</option>
          </select>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value={5}>5 rows</option>
            <option value={10}>10 rows</option>
            <option value={20}>20 rows</option>
          </select>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {paginatedRoles.map(r => {
          const colorStyle = r.color ? { backgroundColor: r.color } : { backgroundColor: '#475569' };
          
          return (
            <div key={r.id} className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shadow-sm" style={colorStyle}></div>
                  <span className="font-bold text-sm text-white truncate max-w-37.5 sm:max-w-50">@{r.name}</span>
                </div>
                <div className="text-xs text-slate-400 font-semibold bg-white/5 px-2 py-1 rounded-md">
                  {r.memberCount || 0} members
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                {(r.permissions || []).map((p, idx) => {
                  const pRisk = getRiskLabel(p.level);
                  const pVariant = getRiskVariant(p.level);
                  return (
                    <div key={idx} className="flex items-center justify-between bg-slate-950/50 px-3 py-1.5 rounded-lg border border-white/5">
                      <span className="text-xs font-semibold text-slate-300 truncate mr-2">{p.name}</span>
                      <Badge variant={pVariant}>{pRisk}</Badge>
                    </div>
                  );
                })}
              </div>

              <div className="text-[10px] text-slate-500 font-mono mt-1 pt-2 border-t border-white/5">
                Role ID: {r.id}
              </div>
            </div>
          );
        })}
      </div>

      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
