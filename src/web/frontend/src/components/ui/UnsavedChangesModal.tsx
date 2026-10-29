import React from "react";
import { AlertTriangle, Check, RotateCcw } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";

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
      <Modal open={open} onClose={() => !isSaving && onStay?.()} maxWidth="max-w-md" showClose={!isSaving}>
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl shrink-0 bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>
            <div className="pt-0.5">
              <h2 className="text-xl font-bold text-white mb-1.5">Unsaved Changes</h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                You have unsaved changes {pageTitle ? `in ${pageTitle}` : "on this page"}.
                Leaving without saving will discard these changes and no updates will be applied.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-3 border border-white/5 text-xs text-slate-400">
            Choose what you would like to do before navigating away:
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 mt-2 pt-4 border-t border-white/5">
            <Button
              variant="ghost"
              onClick={onStay}
              disabled={isSaving}
              className="text-xs px-4 py-2 font-medium"
            >
              Stay on Page
            </Button>
            <Button
              variant="outline"
              onClick={onDiscard}
              disabled={isSaving}
              className="text-xs text-rose-400 border-rose-500/30 hover:bg-rose-500/10 hover:border-rose-500/50 px-4 py-2 font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Discard & Leave
            </Button>
            <Button
              variant="primary"
              onClick={onSave}
              isLoading={isSaving}
              loadingText="Saving..."
              className="text-xs px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 shadow-md shadow-indigo-600/30 font-semibold"
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Save & Leave
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
