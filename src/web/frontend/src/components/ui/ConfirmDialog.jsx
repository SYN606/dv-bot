import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmText = "Confirm", cancelText = "Cancel", isDestructive = false, isPending = false }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="fixed inset-0" 
        onClick={() => !isPending && onClose()}
      ></div>
      <div className="relative glass-panel bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-md p-6 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-2xl shrink-0 ${isDestructive ? "bg-rose-500/10 text-rose-500" : "bg-indigo-500/10 text-indigo-400"}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="pt-1">
              <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
              <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onClose}
              disabled={isPending}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2 ${
                isDestructive 
                  ? "bg-rose-600 hover:bg-rose-500 shadow-rose-500/20" 
                  : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20"
              }`}
            >
              {isPending ? "Processing..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
