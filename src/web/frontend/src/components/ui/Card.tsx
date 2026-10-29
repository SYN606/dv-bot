import React from "react";

const VARIANTS = {
  glass: "glass-panel bg-slate-900/50 border border-white/5 shadow-xl shadow-black/20",
  "glass-card": "glass-card bg-slate-900/40 border border-white/5",
  solid: "bg-slate-900 border border-white/10 shadow-xl",
  subtle: "bg-slate-900/30 border border-white/5",
};

export default function Card({
  children,
  variant = "glass",
  hoverable = false,
  glow = false,
  className = "",
  ...props
}) {
  const baseVariant = VARIANTS[variant] || VARIANTS.glass;
  const hoverClass = hoverable ? "transition-all duration-200 hover:border-white/15 hover:bg-white/[0.03] hover:shadow-2xl" : "";
  const glowClass = glow ? "relative before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:bg-indigo-500/5 before:blur-xl" : "";

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl p-5 sm:p-6 backdrop-blur-xl ${baseVariant} ${hoverClass} ${glowClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }) {
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-white/5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "", size = "md", ...props }) {
  const sizeClasses = {
    sm: "text-sm font-bold text-white",
    md: "text-base sm:text-lg font-bold text-white tracking-tight",
    lg: "text-xl font-bold text-white tracking-tight",
  };
  return (
    <h3 className={`${sizeClasses[size] || sizeClasses.md} ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = "", ...props }) {
  return (
    <p className={`text-xs sm:text-sm text-slate-400 leading-relaxed ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = "", ...props }) {
  return (
    <div className={`space-y-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", ...props }) {
  return (
    <div className={`flex items-center justify-end gap-3 mt-5 pt-4 border-t border-white/5 ${className}`} {...props}>
      {children}
    </div>
  );
}
