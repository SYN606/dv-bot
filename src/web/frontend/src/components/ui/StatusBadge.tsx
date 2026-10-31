import React from "react";
import { CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";

export interface StatusBadgeProps {
  active?: boolean;
  status?: "active" | "disabled" | "pending" | "warning" | "error";
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

export default function StatusBadge({
  active,
  status,
  label,
  size = "sm",
  className = "",
}: StatusBadgeProps) {
  let isOk = active !== undefined ? Boolean(active) : false;
  if (status) {
    isOk = status === "active";
  }

  const text = label || (status ? status.toUpperCase() : isOk ? "ACTIVE" : "DISABLED");

  return (
    <div
      className={`inline-flex items-center gap-1.5 font-mono tracking-widest uppercase select-none ${
        size === "sm" ? "text-[10px]" : "text-xs"
      } ${
        isOk ? "text-emerald-400 font-semibold" : "text-slate-500 font-medium"
      } ${className}`}
    >
      {isOk ? (
        <CheckCircle2 className={`${size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} shrink-0 text-emerald-400`} />
      ) : (
        <XCircle className={`${size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} shrink-0 text-slate-500`} />
      )}
      <span>{text}</span>
    </div>
  );
}
