import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { useWarningPunishments } from "../../hooks/warning-punishments";
import { useModuleStatus } from "../../hooks/useModuleStatus";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import {
  WarningPunishmentsHeader,
  PunishmentRuleList,
  PunishmentRuleForm,
} from "../../components/warning-punishments";

export default function WarningPunishmentsPage({ showToast }) {
  const { guildId } = useParams();

  const {
    rules,
    loading,
    error,
    refresh,
    deletingWarnCount,
    deleteRule,
    warnCount,
    setWarnCount,
    actionType,
    setActionType,
    duration,
    setDuration,
    adding,
    addRule,
  } = useWarningPunishments(guildId, showToast);

  const [pendingDelete, setPendingDelete] = useState(null);
  const { enabled: moduleEnabled, toggle: toggleModule } = useModuleStatus(guildId, "warning_punishments", showToast);

  const handleDeleteConfirmed = async () => {
    if (!pendingDelete) return;
    const { warn_count } = pendingDelete;
    setPendingDelete(null);
    await deleteRule(warn_count);
  };

  if (error && rules.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] animate-in fade-in zoom-in-[0.98] duration-500">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/5 text-center space-y-4">
          <h2 className="text-xl font-bold text-white">Unable to load punishment rules</h2>
          <p className="text-sm text-slate-400">Failed to connect to the backend.</p>
          <button
            onClick={refresh}
            className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full space-y-8 animate-pulse">
        <div className="h-24 glass-panel rounded-3xl border border-white/5" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-80 glass-panel rounded-3xl border border-white/5" />
          <div className="h-80 glass-panel rounded-3xl border border-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300 pb-32">
      {/* Header */}
      <WarningPunishmentsHeader 
        activeCount={rules.length} 
        enabled={moduleEnabled} 
        onToggle={toggleModule} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Rules List */}
        <PunishmentRuleList
          rules={rules}
          onDelete={setPendingDelete}
          deletingWarnCount={deletingWarnCount}
        />

        {/* Create Form */}
        <PunishmentRuleForm
          warnCount={warnCount}
          setWarnCount={setWarnCount}
          actionType={actionType}
          setActionType={setActionType}
          duration={duration}
          setDuration={setDuration}
          onSubmit={addRule}
          adding={adding}
          existingRules={rules}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDeleteConfirmed}
        title="Remove Punishment Rule?"
        description={
          pendingDelete && (
            <>
              <p className="mb-3">
                At <strong className="text-white">{pendingDelete.warn_count} warnings</strong>, members are
                currently <strong className="text-white">{pendingDelete.action_type}ed</strong> automatically.
              </p>
              <p>Removing this rule will stop that automatic action.</p>
            </>
          )
        }
        confirmText="Remove Rule"
        cancelText="Cancel"
      />
    </div>
  );
}
