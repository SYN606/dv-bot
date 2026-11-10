import React from "react";
import { AlertTriangle, Check, RotateCcw, ArrowLeft } from "lucide-react";
import Modal from "./Modal";

export default function UnsavedChangesModal({
  open,
  onStay,
  onDiscard,
  onSave,
  isSaving = false,
  pageTitle,
}) {
  return (
    <div data-unsaved-ignore="true">
      <Modal
        open={open}
        onClose={() => !isSaving && onStay?.()}
        maxWidth="max-w-lg"
        showClose={!isSaving}
      >
        <div className="flex flex-col gap-5 p-1 sm:p-2">
          {/* Header & Warning Icon */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl shrink-0 bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                You have unsaved changes
              </h2>
              <p className="text-sm sm:text-base text-slate-300 mt-1 leading-relaxed">
                You made edits to{" "}
                <span className="font-semibold text-white">
                  {pageTitle || "this page"}
                </span>{" "}
                that haven't been saved yet.
              </p>
            </div>
          </div>

          {/* Friendly Guidance Card */}
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2.5">
            <p className="font-semibold text-slate-200">
              If you leave without saving, all your adjustments will be discarded:
            </p>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-400">
              <li className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                <span><strong className="text-slate-200">Save & Leave:</strong> Keeps your adjustments and proceeds.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                <span><strong className="text-slate-200">Discard Changes:</strong> Reverts your edits back to previous settings.</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                <span><strong className="text-slate-200">Stay on Page:</strong> Keeps you on this page to continue editing.</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onStay}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Stay on Page</span>
            </button>

            <button
              type="button"
              onClick={onDiscard}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Discard Changes</span>
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 border border-indigo-400/30 shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save & Leave</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
