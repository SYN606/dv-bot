import React from "react";
import { AlertCircle, RotateCcw, Check } from "lucide-react";
import Button from "./Button";

export default function UnsavedChangesBar({
  visible,
  isSaving = false,
  onSave,
  onReset,
  message = "You have unsaved changes",
}) {
  if (!visible) return null;

  return (
    <div
      data-unsaved-ignore="true"
      className="fixed bottom-6 inset-x-0 mx-auto max-w-2xl w-[94%] z-50 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative overflow-hidden glass-panel bg-slate-900/95 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl shadow-black/80 px-4 sm:px-6 py-3.5 sm:py-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 ring-1 ring-white/10">
        {/* Ambient glow accent */}
        <div className="absolute -left-10 -top-10 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Status text */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
            <AlertCircle className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
              {message}
            </p>
            <p className="text-xs text-slate-300 hidden sm:block">
              Remember to save your edits before switching pages.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 shrink-0 ml-auto sm:ml-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={isSaving}
            className="text-xs sm:text-sm text-slate-300 hover:text-white hover:bg-white/10 px-3.5 py-2 h-auto font-medium rounded-xl border border-white/5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Discard Edits
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onSave}
            isLoading={isSaving}
            loadingText="Saving..."
            className="text-xs sm:text-sm px-4 sm:px-5 py-2 h-auto font-bold bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 border border-indigo-400/30"
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
