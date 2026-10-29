import React, { useState, useEffect } from "react";
import { Edit3, X, Save, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import {
  PUNISHMENT_TYPES,
  MIN_WARNING_THRESHOLD,
  MAX_WARNING_THRESHOLD,
  getPunishmentType,
  getDurationOptionsForPunishment,
} from "../../utils/warning-punishments/punishment";

export default function EditPunishmentModal({
  isOpen,
  onClose,
  rule,
  existingRules = [],
  onConfirmEdit,
}) {
  const [warnCount, setWarnCount] = useState(3);
  const [actionType, setActionType] = useState("timeout");
  const [duration, setDuration] = useState(3600);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (rule) {
      setWarnCount(rule.warn_count);
      setActionType(rule.action_type);
      setDuration(rule.duration || 3600);
      setError(null);
    }
  }, [rule]);

  if (!isOpen || !rule) return null;

  const parsedCount = parseInt(warnCount, 10);
  const otherExistingCounts = new Set(
    existingRules.filter((r) => r.warn_count !== rule.warn_count).map((r) => r.warn_count)
  );
  const isDuplicate = otherExistingCounts.has(parsedCount);
  const isValid =
    Number.isInteger(parsedCount) &&
    parsedCount >= MIN_WARNING_THRESHOLD &&
    parsedCount <= MAX_WARNING_THRESHOLD &&
    !isDuplicate;

  const selectedType = getPunishmentType(actionType);
  const durationOptions = getDurationOptionsForPunishment(actionType);

  const isDirty = rule && (
    parsedCount !== rule.warn_count ||
    actionType !== rule.action_type ||
    duration !== (rule.duration || 3600)
  );

  const handleReset = () => {
    if (rule) {
      setWarnCount(rule.warn_count);
      setActionType(rule.action_type);
      setDuration(rule.duration || 3600);
      setError(null);
    }
  };

  const handleSave = async () => {
    if (!isValid || loading) return;
    setLoading(true);
    setError(null);

    try {
      const payload = {
        warnCount: parsedCount,
        actionType,
        duration: selectedType?.requiresDuration ? parseInt(duration, 10) : null,
      };
      const success = await onConfirmEdit(rule.warn_count, payload);
      if (success) {
        onClose();
      }
    } catch (err) {
      setError(err?.message || "Failed to update punishment rule.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Edit Punishment Rule</h3>
              <p className="text-xs text-slate-400">
                Updating automatic disciplinary action for warning #{rule.warn_count}.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Warning Threshold Input */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Warning Threshold
          </label>
          <input
            type="number"
            min={MIN_WARNING_THRESHOLD}
            max={MAX_WARNING_THRESHOLD}
            value={warnCount}
            onChange={(e) => setWarnCount(parseInt(e.target.value, 10) || MIN_WARNING_THRESHOLD)}
            className={`w-full px-4 py-2.5 bg-slate-950 border rounded-xl text-sm text-white font-mono focus:outline-none transition-colors ${
              isDuplicate
                ? "border-rose-500/50 focus:border-rose-500"
                : "border-white/10 focus:border-indigo-500"
            }`}
          />
          {isDuplicate ? (
            <p className="text-[10px] text-rose-400 mt-1.5">
              Another punishment rule already exists for {warnCount} warnings.
            </p>
          ) : (
            <p className="text-[10px] text-slate-500 mt-1.5">
              Triggered automatically when a member reaches warning #{warnCount}.
            </p>
          )}
        </div>

        {/* Action Type Selection */}
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Punishment Action
          </label>
          <div className="space-y-2">
            {PUNISHMENT_TYPES.map((type) => {
              const isSelected = actionType === type.id;
              return (
                <button
                  type="button"
                  key={type.id}
                  onClick={() => {
                    setActionType(type.id);
                    if (type.requiresDuration && (!duration || duration <= 0)) {
                      setDuration(type.defaultDuration || 3600);
                    }
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-colors ${
                    isSelected
                      ? "bg-indigo-500/10 border-indigo-500/50"
                      : "bg-slate-950 border-white/5 hover:border-white/20 hover:bg-slate-800/50"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 border-2 transition-colors ${
                      isSelected ? "border-indigo-400 bg-indigo-400" : "border-slate-600 bg-transparent"
                    }`}
                  />
                  <div>
                    <div
                      className={`text-sm font-bold ${
                        isSelected ? "text-indigo-300" : "text-slate-300"
                      }`}
                    >
                      {type.name}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-snug">
                      {type.description || type.desc}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Duration for timeout / tempban */}
        {selectedType?.requiresDuration && (
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Action Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value, 10))}
              className="w-full px-4 py-2.5 bg-slate-950 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              {durationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
          {isDirty && (
            <button
              type="button"
              disabled={loading}
              onClick={handleReset}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!isValid || loading}
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
