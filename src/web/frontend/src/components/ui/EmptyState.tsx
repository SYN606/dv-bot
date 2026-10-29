import React from "react";

export default function EmptyState({
  icon: Icon,
  title = "No items found",
  description,
  action,
  compact = false,
  dashed = true,
  className = "",
}) {
  return (
    <div
      className={`glass-panel text-center flex flex-col items-center justify-center rounded-3xl ${
        dashed ? "border border-dashed border-white/10" : "border border-white/5"
      } ${compact ? "py-10 px-4 min-h-[160px]" : "py-16 px-6 min-h-[240px]"} ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center mb-4 shadow-inner">
          <Icon className="w-6 h-6 text-slate-400" />
        </div>
      )}

      <h3 className="text-base sm:text-lg font-bold text-white mb-1.5 tracking-tight">{title}</h3>

      {description && (
        <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed mb-5">
          {description}
        </p>
      )}

      {action && <div>{action}</div>}
    </div>
  );
}
