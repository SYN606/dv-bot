import React, { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useCommandRestrictions } from "../../hooks/commands";

import {
  CommandHeader,
  CommandScopeSelector,
  CommandStats,
  CommandToolbar,
  CommandModule
} from "../../components/commands";

export default function CommandsPage({ showToast }) {
  const { guildId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const {
    channels,
    selectedChannel,
    setSelectedChannel,
    commands,
    disabled,
    modules,
    stats,
    loading,
    error,
    pendingCommands,
    pendingModules,
    refresh,
    handleToggleCommand,
    handleToggleModule
  } = useCommandRestrictions(guildId, showToast);

  // Group commands by category
  const categoriesMap = useMemo(() => {
    const map = new Map();
    commands.forEach(cmd => {
      const cat = cmd.category || "General";
      if (!map.has(cat)) map.set(cat, { id: cat, commands: [] });
      map.get(cat).commands.push(cmd);
    });
    return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [commands]);

  // Toolbar filters
  const categoryFilters = useMemo(() => {
    return [
      { id: "all", label: "All Modules" },
      ...categoriesMap.map(c => ({ id: c.id, label: c.id.charAt(0).toUpperCase() + c.id.slice(1) }))
    ];
  }, [categoriesMap]);

  // Apply search and category filter
  const visibleCategories = useMemo(() => {
    let filtered = categoriesMap;
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter(c => c.id === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.map(cat => ({
        ...cat,
        commands: cat.commands.filter(c => 
          c.name.toLowerCase().includes(query) || 
          c.description?.toLowerCase().includes(query)
        )
      })).filter(cat => cat.commands.length > 0);
    }
    
    return filtered;
  }, [categoriesMap, selectedCategory, searchQuery]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] animate-in fade-in zoom-in-[0.98] duration-500">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/5 text-center space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Unable to load Commands</h2>
          <p className="text-sm text-slate-400">Failed to connect to the backend.</p>
          <button onClick={refresh} className="mt-4 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (loading && commands.length === 0) {
    return (
      <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
        <div className="h-24 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        <div className="h-32 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        <div className="h-32 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        <div className="space-y-4">
          <div className="h-64 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
          <div className="h-64 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto animate-in fade-in duration-500 pb-24">
      <CommandHeader />

      <CommandScopeSelector 
        guildId={guildId}
        channels={channels}
        selectedChannel={selectedChannel}
        setSelectedChannel={setSelectedChannel}
      />

      <CommandStats stats={stats} />

      <CommandToolbar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categoryFilters}
      />

      <div className="space-y-6">
        {visibleCategories.length === 0 ? (
          <div className="text-center py-16 px-6 glass-panel rounded-3xl border border-dashed border-white/5">
            <h3 className="text-lg font-bold text-white mb-2">No commands found</h3>
            <p className="text-sm text-slate-400">Try adjusting your search or category filter.</p>
            <button 
              onClick={() => { setSearchQuery(""); setSelectedCategory("all"); }}
              className="mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          visibleCategories.map(cat => (
            <CommandModule 
              key={cat.id}
              module={cat}
              isChannelScope={selectedChannel !== "global"}
              disabledCommands={disabled}
              pendingCommands={pendingCommands}
              pendingModules={pendingModules}
              onToggleCommand={handleToggleCommand}
              onToggleModule={handleToggleModule}
            />
          ))
        )}
      </div>
    </div>
  );
}
