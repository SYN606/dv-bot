import React, { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useCommandRestrictions } from "../../hooks/commands";

import {
  CommandHeader,
  CommandScopeSelector,
  CommandStats,
  CommandToolbar,
  CommandModule,
  CommandChannelRuleModal,
} from "../../components/commands";
import ConfirmDialog from "../../components/ui/ConfirmDialog";

export default function CommandsPage({ showToast }) {
  const { guildId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmBulk, setConfirmBulk] = useState({ open: false, enable: true });
  const [channelRuleModal, setChannelRuleModal] = useState({ open: false, target: null, isCategory: false });

  const {
    channels,
    selectedChannel,
    setSelectedChannel,
    commands,
    disabled,
    guildDisabled,
    channelDisabled,
    modules,
    stats,
    loading,
    error,
    pendingCommands,
    pendingModules,
    isBulkPending,
    refresh,
    handleToggleCommand,
    handleToggleModule,
    handleBulkToggle,
    handleResetChannel,
    handleSaveChannelRule,
  } = useCommandRestrictions(guildId, showToast);

  const isChannelScope = selectedChannel !== "global";

  // Group commands by category preserving scope data
  const categoriesMap = useMemo(() => {
    if (modules && modules.length > 0) {
      return modules;
    }

    const map = new Map();
    commands.forEach((cmd) => {
      const cat = cmd.category || "General";
      if (!map.has(cat)) {
        map.set(cat, {
          id: cat,
          name: cat.charAt(0).toUpperCase() + cat.slice(1),
          commands: [],
        });
      }
      map.get(cat).commands.push(cmd);
    });
    return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [modules, commands]);

  // Toolbar category filter options with command counts
  const categoryFilters = useMemo(() => {
    return [
      { id: "all", label: "All Modules", count: commands.length },
      ...categoriesMap.map((c) => ({
        id: c.id,
        label: c.name || c.id.charAt(0).toUpperCase() + c.id.slice(1),
        count: c.commands.length,
      })),
    ];
  }, [categoriesMap, commands]);

  // Filter commands by Category, Status (Active/Disabled), and Search Query
  const visibleCategories = useMemo(() => {
    let filtered = categoriesMap;

    // 1. Category Filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter((c) => c.id === selectedCategory);
    }

    // 2. Status & Search Query Filtering
    const query = searchQuery.trim().toLowerCase();

    return filtered
      .map((cat) => {
        const filteredCmds = cat.commands.filter((cmd) => {
          // Status filter
          if (statusFilter === "active" && cmd.disabled) return false;
          if (statusFilter === "disabled" && !cmd.disabled) return false;

          // Search query matching name, description, or aliases
          if (query) {
            const matchesName = cmd.name.toLowerCase().includes(query);
            const matchesDesc = cmd.description?.toLowerCase().includes(query);
            const matchesAlias = cmd.aliases?.some((a) => a.toLowerCase().includes(query));
            if (!matchesName && !matchesDesc && !matchesAlias) return false;
          }

          return true;
        });

        return {
          ...cat,
          commands: filteredCmds,
        };
      })
      .filter((cat) => cat.commands.length > 0);
  }, [categoriesMap, selectedCategory, statusFilter, searchQuery]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] animate-in fade-in zoom-in-[0.98] duration-500">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/5 text-center space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Unable to load Commands</h2>
          <p className="text-sm text-slate-400">Failed to connect to the backend.</p>
          <button
            onClick={refresh}
            className="mt-4 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading && commands.length === 0) {
    return (
      <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
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
    <div className="w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-500 pb-24">
      <CommandHeader
        totalCommands={stats?.total || 0}
        activeCommands={stats?.active || 0}
      />

      <CommandScopeSelector
        guildId={guildId}
        channels={channels}
        selectedChannel={selectedChannel}
        setSelectedChannel={setSelectedChannel}
        channelDisabledCount={channelDisabled.length}
        guildDisabledCount={guildDisabled.length}
        onResetChannel={isChannelScope ? handleResetChannel : null}
        isResetPending={isBulkPending}
      />

      <CommandStats stats={stats} />

      <CommandToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categories={categoryFilters}
        totalActive={stats?.active || 0}
        totalDisabled={stats?.disabled || 0}
        onOpenBulkConfirm={(enable) => setConfirmBulk({ open: true, enable })}
        isBulkPending={isBulkPending}
      />

      <div className="space-y-6">
        {visibleCategories.length === 0 ? (
          <div className="text-center py-16 px-6 glass-panel rounded-3xl border border-dashed border-white/5">
            <h3 className="text-lg font-bold text-white mb-2">No commands found</h3>
            <p className="text-sm text-slate-400">
              {searchQuery || statusFilter !== "all" || selectedCategory !== "all"
                ? "Try adjusting your search query, status filter, or category."
                : "No commands are registered in this server."}
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setStatusFilter("all");
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          visibleCategories.map((cat) => (
            <CommandModule
              key={cat.id}
              module={cat}
              isChannelScope={isChannelScope}
              disabledCommands={disabled}
              pendingCommands={pendingCommands}
              pendingModules={pendingModules}
              onToggleCommand={handleToggleCommand}
              onToggleModule={handleToggleModule}
              onUnlockGlobal={(cmdName) => handleToggleCommand(cmdName, true, true)}
              onOpenChannelRules={(target, isCat) =>
                setChannelRuleModal({ open: true, target, isCategory: isCat })
              }
            />
          ))
        )}
      </div>

      {/* Interactive Channel Availability Rule Modal ("Enable only in" / "Disable only in") */}
      <CommandChannelRuleModal
        isOpen={channelRuleModal.open}
        onClose={() => setChannelRuleModal({ open: false, target: null, isCategory: false })}
        target={channelRuleModal.target}
        isCategory={channelRuleModal.isCategory}
        channels={channels}
        onSave={handleSaveChannelRule}
        isPending={isBulkPending}
      />

      {/* Global Bulk Enable / Disable Confirmation Dialog */}
      <ConfirmDialog
        open={confirmBulk.open}
        onClose={() => setConfirmBulk({ open: false, enable: true })}
        onConfirm={async () => {
          const enable = confirmBulk.enable;
          setConfirmBulk({ open: false, enable: true });
          await handleBulkToggle(enable);
        }}
        isPending={isBulkPending}
        isDestructive={!confirmBulk.enable}
        title={confirmBulk.enable ? "Enable All Commands?" : "Disable All Commands?"}
        description={
          confirmBulk.enable
            ? `Are you sure you want to enable all configurable commands ${
                isChannelScope ? "for this channel" : "server-wide"
              }? Non-administrators will be able to execute these commands.`
            : `Are you sure you want to disable all configurable commands ${
                isChannelScope ? "for this channel" : "server-wide"
              }? Protected core commands (like /help, /command) will remain accessible.`
        }
        confirmText={confirmBulk.enable ? "Enable All" : "Disable All"}
      />
    </div>
  );
}
