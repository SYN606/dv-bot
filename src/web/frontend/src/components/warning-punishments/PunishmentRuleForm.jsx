import React from "react";
import { Plus } from "lucide-react";
import {
  PUNISHMENT_TYPES,
  MIN_WARNING_THRESHOLD,
  MAX_WARNING_THRESHOLD,
  getPunishmentType,
  getDurationOptionsForPunishment,
} from "../../utils/warning-punishments/punishment";

export default function PunishmentRuleForm({
  warnCount, setWarnCount,
  actionType, setActionType,
  duration, setDuration,
  onSubmit, adding, existingRules
}) {
  const existingCounts = new Set(existingRules.map(r => r.warn_count));
  const parsedCount = parseInt(warnCount, 10);
  const isDuplicate = existingCounts.has(parsedCount);
  const isValid = Number.isInteger(parsedCount) && parsedCount >= MIN_WARNING_THRESHOLD && parsedCount <= MAX_WARNING_THRESHOLD && !isDuplicate;
  const selectedType = getPunishmentType(actionType);
  const durationOptions = getDurationOptionsForPunishment(actionType);

  return (
    <div className="glass-panel bg-slate-900/50 p-6 rounded-3xl border border-white/5 space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Create Rule</h2>
        <p className="text-xs text-slate-500">Add a new automatic punishment threshold.</p>
      </div>

      {/* Warning Threshold */}
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
          className={`w-full px-4 py-2.5 bg-slate-900 border rounded-xl text-sm text-white font-mono focus:outline-none transition-colors ${
            isDuplicate ? "border-rose-500/50 focus:border-rose-500" : "border-white/10 focus:border-indigo-500"
          }`}
        />
        {isDuplicate ? (
          <p className="text-[10px] text-rose-400 mt-1.5">
            A punishment rule already exists for {warnCount} warnings.
          </p>
        ) : (
          <p className="text-[10px] text-slate-500 mt-1.5">Triggered exactly on warning #{warnCount}.</p>
        )}
      </div>

      {/* Punishment Action */}
      <div>
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
          Punishment
        </label>
        <div className="space-y-2">
          {PUNISHMENT_TYPES.map(type => {
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
                    : "bg-slate-900 border-white/5 hover:border-white/20 hover:bg-slate-800"
                }`}
              >
                <div className={`w-3 h-3 rounded-full shrink-0 mt-1 border-2 transition-colors ${
                  isSelected ? "border-indigo-400 bg-indigo-400" : "border-slate-600 bg-transparent"
                }`} />
                <div>
                  <div className={`text-sm font-bold ${isSelected ? "text-indigo-300" : "text-slate-300"}`}>
                    {type.name}
                  </div>
                  <div className="text-[10px] text-slate-500 leading-snug">{type.description || type.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Duration — only for timeout / tempban */}
      {selectedType?.requiresDuration && (
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Duration
          </label>
          <select
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value, 10))}
            className="w-full px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {durationOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={onSubmit}
          disabled={!isValid || adding}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {adding ? "Adding Rule..." : "Add Punishment Rule"}
        </button>
      </div>
    </div>
  );
}
