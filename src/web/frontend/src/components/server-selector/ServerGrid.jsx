import React from "react";
import ServerCard from "./ServerCard";
import { Server, Search } from "lucide-react";

export default function ServerGrid({
  servers,
  search,
  filterMode,
  onRequestAccess,
  onRefresh,
  setFilterMode,
  totalCount = 0,
  manageableCount = 0
}) {
  if (servers.length === 0) {
    return (
      <div className="glass-panel p-12 rounded-3xl border border-dashed border-white/5 text-center flex flex-col items-center justify-center min-h-75">
        {search ? (
          <>
            <Search className="w-10 h-10 text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No servers found</h3>
            <p className="text-sm text-slate-400 max-w-md">No servers match "{search}". Try adjusting your search term.</p>
            {filterMode === "manageable" && totalCount > 0 && (
              <button
                onClick={() => setFilterMode?.("all")}
                className="mt-5 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-white border border-white/10 transition-colors"
              >
                Search in All Servers ({totalCount})
              </button>
            )}
          </>
        ) : filterMode === "manageable" ? (
          <>
            <Server className="w-10 h-10 text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No manageable servers</h3>
            <p className="text-sm text-slate-400 max-w-md mb-4">You need Owner, Administrator, or Manage Server access to configure a server.</p>
            {totalCount > 0 && (
              <button
                onClick={() => setFilterMode?.("all")}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-semibold text-white border border-white/10 transition-colors"
              >
                View All Servers ({totalCount})
              </button>
            )}
          </>
        ) : (
          <>
            <Server className="w-10 h-10 text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Discord servers found</h3>
            <p className="text-sm text-slate-400 max-w-md mb-6">Sync your Discord session or verify that the correct Discord account is connected.</p>
            <button
              onClick={onRefresh}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors shadow-lg shadow-indigo-600/20"
            >
              Sync Servers
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {servers.map((guild) => (
        <ServerCard 
          key={guild.id} 
          guild={guild} 
          onRequestAccess={onRequestAccess}
        />
      ))}
    </div>
  );
}
