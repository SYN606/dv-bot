import React from "react";
import { AlertCircle, RotateCcw, Check } from "lucide-react";
import Button from "./Button";

export default function UnsavedChangesBar({
  visible,
  isSaving = false,
  onSave,
  onReset,
  message = "Careful — you have unsaved changes!",
}) {
  if (!visible) return null;

  return (
    <div
      data-unsaved-ignore="true"
      className="fixed bottom-6 inset-x-0 mx-auto max-w-xl w-[92%] z-50 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative overflow-hidden glass-panel bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl shadow-black/80 px-4 sm:px-5 py-3 sm:py-3.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ring-1 ring-white/10">
        {/* Glow accent */}
        <div className="absolute -left-10 -top-10 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -right-10 -bottom-10 w-28 h-28 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Status text */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <AlertCircle className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
              {message}
            </p>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Save your changes or reset back to last saved state.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={isSaving}
            className="text-xs text-slate-300 hover:text-white hover:bg-white/10 px-3 py-1.5 h-auto font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            isLoading={isSaving}
            loadingText="Saving..."
            className="text-xs px-4 py-1.5 h-auto font-semibold bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 shadow-md shadow-indigo-600/30"
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
