import React from "react";

const VARIANTS = {
  default: "bg-slate-800/80 text-slate-300 border-white/10",
  neutral: "bg-slate-800/80 text-slate-300 border-white/10",
  brand: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  indigo: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

const DOT_COLORS = {
  default: "bg-slate-400",
  neutral: "bg-slate-400",
  brand: "bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]",
  indigo: "bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.6)]",
  success: "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.6)]",
  danger: "bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]",
  warning: "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
  cyan: "bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]",
  purple: "bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]",
};

const SIZES = {
  xs: "px-1.5 py-0.5 text-[9px]",
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
};

export default function Badge({
  children,
  variant = "default",
  size = "sm",
  dot = false,
  icon: Icon,
  className = "",
  ...props
}) {
  const style = VARIANTS[variant] || VARIANTS.default;
  const sizeStyle = SIZES[size] || SIZES.sm;
  const dotColor = DOT_COLORS[variant] || DOT_COLORS.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold tracking-wider uppercase rounded-md border font-sans select-none ${style} ${sizeStyle} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />}
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      <span>{children}</span>
    </span>
  );
}
