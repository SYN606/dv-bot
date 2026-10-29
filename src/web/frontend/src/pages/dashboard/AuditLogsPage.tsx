import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuditLogs } from "../../hooks/audit-logs";
import { PageError, PageSkeleton } from "../../components/ui";
import { Zap } from "lucide-react";

import {
  AuditLogsHeader,
  AuditLogFilters,
  AuditLogsList,
  AuditLogConfigModal,
} from "../../components/audit-logs";

export default function AuditLogsPage({ showToast }) {
  const { guildId } = useParams();
  const [configModalOpen, setConfigModalOpen] = useState(false);

  const {
    entries,
    stats,
    executors,
    availableActions,
    channels,
    missingPermission,
    isRateLimited,
    loading,
    refreshing,
    error,
    category,
    setCategory,
    preset,
    setPreset,
    timeWindow,
    setTimeWindow,
    actionType,
    setActionType,
    executorId,
    setExecutorId,
    searchQuery,
    setSearchQuery,
    hideBots,
    setHideBots,
    limit,
    setLimit,
    appendSearchToken,
    autoRefresh,
    setAutoRefresh,
    modLogConfig,
    savingConfig,
    testingLog,
    saveModLogConfig,
    testModLog,
    refresh,
    exportToJson,
    exportToCsv,
  } = useAuditLogs(guildId, showToast);

  const handleResetFilters = () => {
    setCategory("all");
    setPreset("all");
    setTimeWindow("all");
    setActionType("all");
    setExecutorId("all");
    setSearchQuery("");
    setHideBots(false);
  };

  const currentModLogChannel = channels.find(
    (c) => c.id === modLogConfig.modLogChannelId
  );

  if (error && entries.length === 0 && !missingPermission) {
    return (
      <PageError
        title="Unable to load Audit Logs"
        description={error}
        onRetry={refresh}
      />
    );
  }

  if (loading && entries.length === 0) {
    return <PageSkeleton cards={2} rows={3} />;
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300 pb-20">
      {/* Rate-Limit Shield Notification (Non-intrusive) */}
      {isRateLimited && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Discord Rate-Limit Shield:</strong> Serving high-speed cached snapshot to prevent Discord API cooldowns.
            </span>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold text-[11px] transition-colors shrink-0"
          >
            Retry Live
          </button>
        </div>
      )}

      {/* 1. Header with Stats, Auto-Refresh, Mod Log Config, and Export */}
      <AuditLogsHeader
        stats={stats}
        refreshing={refreshing}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        onRefresh={refresh}
        onOpenConfig={() => setConfigModalOpen(true)}
        onExportJson={exportToJson}
        onExportCsv={exportToCsv}
        modLogChannelName={currentModLogChannel?.name}
      />

      {/* 2. Modern Filter Architecture: Omnisearch, Smart Presets, Heatline & Custom Popovers */}
      <AuditLogFilters
        category={category}
        onSelectCategory={setCategory}
        preset={preset}
        onSelectPreset={setPreset}
        timeWindow={timeWindow}
        onSelectTimeWindow={setTimeWindow}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        actionType={actionType}
        onActionTypeChange={setActionType}
        availableActions={availableActions}
        executorId={executorId}
        onExecutorChange={setExecutorId}
        executors={executors}
        hideBots={hideBots}
        onToggleHideBots={setHideBots}
        limit={limit}
        onLimitChange={setLimit}
        totalResults={entries.length}
        categoryStats={stats}
      />

      {/* 3. Audit Log Feed & Timeline with Interactive Token Clicks */}
      <AuditLogsList
        entries={entries}
        missingPermission={missingPermission}
        onResetFilters={handleResetFilters}
        onRefresh={refresh}
        onFilterByExecutor={(val) => appendSearchToken("by", val)}
        onFilterByTarget={(val) => appendSearchToken("target", val)}
        onFilterByAction={(val) => appendSearchToken("action", val)}
      />

      {/* 4. Mod Log Channel Configuration Modal */}
      <AuditLogConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        guildId={guildId}
        channels={channels}
        currentChannelId={modLogConfig.modLogChannelId}
        onSaveConfig={saveModLogConfig}
        savingConfig={savingConfig}
        onSendTest={testModLog}
        testingLog={testingLog}
      />
    </div>
  );
}
