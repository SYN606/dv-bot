import React from "react";
import { Crown } from "lucide-react";

export default function SuperuserBadge({ size = "sm", showIcon = true, className = "" }) {
  const isSm = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-bold tracking-wider uppercase rounded-full shadow-sm select-none border transition-all duration-300 ${
        isSm
          ? "px-2 py-0.5 text-[9px]"
          : "px-2.5 py-1 text-[10px]"
      } bg-linear-to-r from-amber-500/20 via-rose-500/20 to-indigo-500/20 text-amber-300 border-amber-400/40 shadow-amber-500/10 hover:border-amber-400/70 hover:shadow-amber-500/20 ${className}`}
      title="Bot Superuser: System Administrator with universal access"
    >
      {showIcon && <Crown className={isSm ? "w-2.5 h-2.5 text-amber-400 animate-pulse" : "w-3 h-3 text-amber-400 animate-pulse"} />}
      <span>SUPERUSER</span>
    </span>
  );
}
