import React from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function Toast({ message, type = "success", visible = false }) {
  if (!visible) return null;

  const isSuccess = type === "success";

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 glass-panel px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-semibold transition-all duration-300 transform translate-y-0 opacity-100 ${
        isSuccess
          ? "border-emerald-500/30 text-emerald-300"
          : "border-rose-500/30 text-rose-300"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
}
