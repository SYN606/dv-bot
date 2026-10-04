import React, { useState, useMemo, useEffect } from "react";
import Badge from "../ui/Badge";
import Pagination from "../ui/Pagination";
import { getRiskLabel, getRiskVariant } from "../../utils/permissions-audit";
import { getDiscordAvatarUrl } from "../../utils/discord";
import { Search } from "lucide-react";

export default function PrivilegedMembers({ members, onInspect }) {
  const [sort, setSort] = useState("threatDesc");
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when data or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [members, sort, itemsPerPage]);

  const sortedMembers = useMemo(() => {
    const arr = [...(members || [])];
    if (sort === "threatDesc") {
      arr.sort((a, b) => b.threatScore - a.threatScore);
    } else if (sort === "threatAsc") {
      arr.sort((a, b) => a.threatScore - b.threatScore);
    }
    return arr;
  }, [members, sort]);

  const totalPages = Math.ceil(sortedMembers.length / itemsPerPage) || 1;
  const paginatedMembers = sortedMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (!members || members.length === 0) {
    return (
      <div className="glass-panel p-8 rounded-3xl border border-dashed border-white/5 text-center">
        <Search className="w-8 h-8 text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-white mb-2">No Privileged Members</h3>
        <p className="text-sm text-slate-400">No members with elevated permission findings detected.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Privileged Members</h3>
          <p className="text-xs text-slate-400">Members identified with potentially dangerous permissions.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="threatDesc">Highest Risk ▼</option>
            <option value="threatAsc">Lowest Risk ▲</option>
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
        {paginatedMembers.map(m => {
          const riskLabel = getRiskLabel(m.threatLevel);
          const riskVariant = getRiskVariant(m.threatLevel);
          const avatarUrl = getDiscordAvatarUrl(m);

          return (
            <div key={m.id} className="p-4 rounded-2xl bg-slate-900/50 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img 
                  src={avatarUrl} 
                  alt={m.username} 
                  className="w-10 h-10 rounded-full border border-white/10" 
                  onError={(e) => { e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png"; }}
                />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-sm text-white">{m.username}</span>
                    <Badge variant={riskVariant}>{riskLabel}</Badge>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">{m.id}</div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-1/2">
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-0.5">Threat Score</div>
                  <div className="text-sm font-black text-white">{m.threatScore}</div>
                </div>
                <button
                  onClick={() => onInspect(m.id)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors shrink-0"
                >
                  Inspect
                </button>
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
