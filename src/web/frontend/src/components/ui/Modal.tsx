import React, { useEffect } from "react";
import { X } from "lucide-react";

export default function Modal({
  open = false,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-md",
  showClose = true,
  className = "",
}) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click area */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog Body */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className={`relative glass-panel bg-slate-900 border border-white/10 rounded-3xl shadow-2xl shadow-black/60 w-full ${maxWidth} p-6 sm:p-7 overflow-hidden animate-in zoom-in-95 duration-200 z-10 ${className}`}
      >
        {(title || showClose) && (
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              {title && (
                <h2 id="modal-title" className="text-xl font-bold text-white tracking-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>

            {showClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div>{children}</div>
      </div>
    </div>
  );
}
