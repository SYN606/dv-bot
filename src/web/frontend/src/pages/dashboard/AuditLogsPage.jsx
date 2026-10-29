import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useAuditLogs } from "../../hooks/audit-logs";
import { PageError, PageSkeleton } from "../../components/ui";

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
    loading,
    refreshing,
    error,
    category,
    setCategory,
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

      {/* 2. Advanced Filters: Categories, Search, Action, Executor, Hide Bots */}
      <AuditLogFilters
        category={category}
        onSelectCategory={setCategory}
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
      />

      {/* 3. Audit Log Feed & Timeline */}
      <AuditLogsList
        entries={entries}
        missingPermission={missingPermission}
        onResetFilters={handleResetFilters}
        onRefresh={refresh}
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
