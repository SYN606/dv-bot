import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Button from "./Button";

export default function PageError({
  title = "Unable to load data",
  description = "Failed to communicate with the bot gateway or backend server.",
  message,
  onRetry,
  icon: Icon = AlertTriangle,
  className = "",
}) {
  const desc = message || description;

  return (
    <div className={`flex-1 flex items-center justify-center min-h-[50vh] p-4 animate-in fade-in zoom-in-[0.98] duration-300 ${className}`}>
      <div className="glass-panel bg-slate-900/80 p-8 sm:p-10 rounded-3xl max-w-md w-full border border-white/5 text-center space-y-5 shadow-2xl shadow-black/40">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-inner">
          <Icon className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">{desc}</p>
        </div>

        {onRetry && (
          <div className="pt-2">
            <Button
              variant="secondary"
              onClick={onRetry}
              icon={RefreshCw}
              className="px-6 py-2.5 rounded-xl border border-white/10 hover:border-white/20"
            >
              Retry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
