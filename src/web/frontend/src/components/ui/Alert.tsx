import React from "react";
import { Info, AlertTriangle, AlertCircle, CheckCircle2, X } from "lucide-react";

const VARIANTS = {
  info: {
    container: "bg-indigo-500/10 border-indigo-500/20 text-indigo-300",
    icon: Info,
    iconColor: "text-indigo-400",
  },
  warning: {
    container: "bg-amber-500/10 border-amber-500/20 text-amber-300",
    icon: AlertTriangle,
    iconColor: "text-amber-400",
  },
  error: {
    container: "bg-rose-500/10 border-rose-500/20 text-rose-300",
    icon: AlertCircle,
    iconColor: "text-rose-400",
  },
  success: {
    container: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    icon: CheckCircle2,
    iconColor: "text-emerald-400",
  },
};

export default function Alert({
  variant = "info",
  title,
  children,
  onDismiss,
  className = "",
}) {
  const v = VARIANTS[variant] || VARIANTS.info;
  const Icon = v.icon;

  return (
    <div
      role="alert"
      className={`p-4 rounded-2xl border text-xs sm:text-sm leading-relaxed flex items-start gap-3 shadow-lg shadow-black/10 animate-in fade-in duration-200 ${v.container} ${className}`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${v.iconColor} mt-0.5`} />

      <div className="flex-1 min-w-0">
        {title && <div className="font-bold text-white mb-0.5">{title}</div>}
        <div>{children}</div>
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
