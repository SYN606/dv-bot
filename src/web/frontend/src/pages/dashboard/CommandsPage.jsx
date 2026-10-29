import React, { useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { useCommandRestrictions } from "../../hooks/commands";

import {
  CommandHeader,
  CommandScopeSelector,
  CommandStats,
  CommandToolbar,
  CommandModule,
} from "../../components/commands";
import { ConfirmDialog, PageError, PageSkeleton, EmptyState, Button } from "../../components/ui";

export default function CommandsPage({ showToast }) {
  const { guildId } = useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [confirmBulk, setConfirmBulk] = useState({ open: false, enable: true });
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [confirmResetChannel, setConfirmResetChannel] = useState(false);

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
    handleResetAll,
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
    return <PageError title="Unable to load Commands" onRetry={refresh} />;
  }

  if (loading && commands.length === 0) {
    return <PageSkeleton cards={2} rows={2} />;
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-24">
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
        onResetChannel={isChannelScope ? () => setConfirmResetChannel(true) : null}
        onResetAll={() => setConfirmResetAll(true)}
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
          <EmptyState
            title="No commands found"
            description={
              searchQuery || statusFilter !== "all" || selectedCategory !== "all"
                ? "Try adjusting your search query, status filter, or category."
                : "No commands are registered in this server."
            }
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                  setStatusFilter("all");
                }}
              >
                Clear Filters
              </Button>
            }
          />
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
            />
          ))
        )}
      </div>

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
              }? Protected core commands (like /help) will remain accessible.`
        }
        confirmText={confirmBulk.enable ? "Enable All" : "Disable All"}
      />

      {/* Reset ALL to Defaults Confirmation Dialog (Wipes all database records) */}
      <ConfirmDialog
        open={confirmResetAll}
        onClose={() => setConfirmResetAll(false)}
        onConfirm={async () => {
          setConfirmResetAll(false);
          await handleResetAll();
        }}
        isPending={isBulkPending}
        isDestructive={true}
        title="Reset All Commands to Default?"
        description="This will permanently delete all custom command disables and channel restrictions from the database. All commands across all channels will be restored to enabled by default."
        confirmText="Reset Everything to Default"
      />

      {/* Reset Channel Overrides Confirmation Dialog */}
      <ConfirmDialog
        open={confirmResetChannel}
        onClose={() => setConfirmResetChannel(false)}
        onConfirm={async () => {
          setConfirmResetChannel(false);
          await handleResetChannel();
        }}
        isPending={isBulkPending}
        isDestructive={true}
        title="Reset Channel Restrictions?"
        description="This will remove all channel-specific overrides from this channel and revert it to match your server-wide policy."
        confirmText="Reset Channel"
      />
    </div>
  );
}
