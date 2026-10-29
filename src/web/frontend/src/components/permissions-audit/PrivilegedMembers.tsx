import React, { useState, useMemo, useEffect } from "react";
import Badge from "../ui/Badge";
import Pagination from "../ui/Pagination";
import { getRiskLabel, getRiskVariant } from "../../utils/permissions-audit";
import { getDiscordAvatarUrl } from "../../utils/discord";
import { Search, ShieldAlert, Bot, User, Crown, ArrowUpDown, ExternalLink, Filter } from "lucide-react";

export default function PrivilegedMembers({ members = [], onInspect }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("all"); // "all", "critical", "elevated", "moderate"
  const [actorFilter, setActorFilter] = useState("all"); // "all", "human", "bot"
  const [sort, setSort] = useState("threatDesc");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [members, searchQuery, riskFilter, actorFilter, sort, itemsPerPage]);

  const filteredMembers = useMemo(() => {
    let arr = [...members];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      arr = arr.filter(
        (m) =>
          m.username?.toLowerCase().includes(q) ||
          m.id?.includes(q) ||
          m.permissions?.some((p) => (p.name || p.permission)?.toLowerCase().includes(q))
      );
    }

    // Risk level filter
    if (riskFilter !== "all") {
      arr = arr.filter((m) => getRiskLabel(m.threatLevel).toLowerCase() === riskFilter.toLowerCase());
    }

    // Actor type filter
    if (actorFilter === "human") {
      arr = arr.filter((m) => !m.bot);
    } else if (actorFilter === "bot") {
      arr = arr.filter((m) => m.bot);
    }

    // Sort
    if (sort === "threatDesc") {
      arr.sort((a, b) => (b.threatScore || 0) - (a.threatScore || 0));
    } else if (sort === "threatAsc") {
      arr.sort((a, b) => (a.threatScore || 0) - (b.threatScore || 0));
    } else if (sort === "nameAsc") {
      arr.sort((a, b) => (a.username || "").localeCompare(b.username || ""));
    }

    return arr;
  }, [members, searchQuery, riskFilter, actorFilter, sort]);

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage) || 1;
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/5 flex flex-col space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">Privileged Members Directory</h3>
            <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
              {filteredMembers.length} found
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Accounts holding administrative, management, or destructive permissions.
          </p>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 w-full lg:w-72">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by name, ID, or permission..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Risk Level Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Risk:
          </span>
          {[
            { id: "all", label: "All" },
            { id: "critical", label: "Critical" },
            { id: "elevated", label: "Elevated" },
            { id: "moderate", label: "Moderate" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setRiskFilter(item.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors border ${
                riskFilter === item.id
                  ? "bg-white/15 text-white border-white/20"
                  : "bg-slate-900 text-slate-400 border-white/5 hover:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Actor Pills (Humans vs Bots) & Sorting */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-white/5">
            {[
              { id: "all", label: "All Actors" },
              { id: "human", label: "Humans" },
              { id: "bot", label: "Bots" },
            ].map((actor) => (
              <button
                key={actor.id}
                onClick={() => setActorFilter(actor.id)}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  actorFilter === actor.id ? "bg-white/15 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {actor.label}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-2.5 py-1 bg-slate-900 border border-white/10 rounded-lg text-[11px] text-slate-300 focus:outline-none"
          >
            <option value="threatDesc">Highest Threat Score ▼</option>
            <option value="threatAsc">Lowest Threat Score ▲</option>
            <option value="nameAsc">Alphabetical A-Z</option>
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

      {/* Directory List */}
      {paginatedMembers.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-dashed border-white/5">
          <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-bold text-white mb-1">No matching members found</p>
          <p className="text-xs text-slate-400">Try adjusting your search query or risk filters.</p>
        </div>
      ) : (
        <div className="space-y-2.5 flex-1">
          {paginatedMembers.map((m) => {
            const riskLabel = getRiskLabel(m.threatLevel);
            const riskVariant = getRiskVariant(m.threatLevel);
            const avatarUrl = getDiscordAvatarUrl(m);

            // Extract dangerous permissions tags
            const dangerousPerms = (m.permissions || []).slice(0, 3);
            const remainingPermsCount = Math.max(0, (m.permissions?.length || 0) - 3);

            return (
              <div
                key={m.id}
                className="p-3.5 sm:p-4 rounded-xl bg-slate-900/50 border border-white/5 hover:border-white/15 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group"
              >
                {/* Member Identity */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    <img
                      src={avatarUrl}
                      alt={m.username}
                      className="w-10 h-10 rounded-full border border-white/10 object-cover"
                      onError={(e) => {
                        e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png";
                      }}
                    />
                    {m.isOwner && (
                      <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow" title="Server Owner">
                        <Crown className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-white truncate">{m.username}</span>
                      {m.bot && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded font-semibold border border-indigo-500/30">
                          BOT
                        </span>
                      )}
                      {m.isOwner && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded font-semibold border border-amber-500/30">
                          OWNER
                        </span>
                      )}
                      <Badge variant={riskVariant} className="text-[10px] px-2 py-0.5">
                        {riskLabel}
                      </Badge>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">ID: {m.id}</div>
                  </div>
                </div>

                {/* Key Permissions Tags */}
                <div className="flex items-center gap-1.5 flex-wrap flex-1 md:max-w-md md:justify-center">
                  {dangerousPerms.map((p, pIdx) => {
                    const isCrit = p.level === "red" || p.level === "critical";
                    return (
                      <span
                        key={pIdx}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                          isCrit
                            ? "bg-brand-crimson/10 text-rose-300 border-brand-crimson/20"
                            : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                        }`}
                      >
                        {p.name || p.permission}
                      </span>
                    );
                  })}
                  {remainingPermsCount > 0 && (
                    <span className="text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                      +{remainingPermsCount} more
                    </span>
                  )}
                </div>

                {/* Threat Score & Inspect Button */}
                <div className="flex items-center justify-between md:justify-end gap-5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-mono uppercase">Threat Score</div>
                    <div className="text-sm font-bold text-white font-mono">{m.threatScore || 0}</div>
                  </div>

                  <button
                    onClick={() => onInspect(m.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white text-xs font-semibold transition-all border border-white/10 group-hover:border-white/20"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  </button>
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
