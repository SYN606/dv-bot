import React from "react";

export default function Badge({ children, variant = "default", className = "" }) {
  const variants = {
    default: "bg-slate-800 text-slate-300 border-white/10",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    brand: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  };

  const style = variants[variant] || variants.default;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${style} ${className}`}>
      {children}
    </span>
  );
}
