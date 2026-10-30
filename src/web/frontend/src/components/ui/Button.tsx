import React from "react";
import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary: "bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-600/25 active:scale-[0.98]",
  secondary: "bg-[#141829] hover:bg-[#1b2138] text-slate-200 border border-white/[0.08] hover:border-white/15 active:scale-[0.98]",
  danger: "bg-rose-600 hover:bg-rose-500 text-white shadow-sm shadow-rose-600/20 active:scale-[0.98]",
  success: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 active:scale-[0.98]",
  outline: "bg-transparent hover:bg-white/[0.04] text-slate-300 hover:text-white border border-white/[0.1] hover:border-white/20 active:scale-[0.98]",
  ghost: "bg-transparent hover:bg-white/[0.05] text-slate-400 hover:text-slate-200 active:scale-[0.98]",
};

const SIZES = {
  xs: "px-2.5 py-1 text-xs rounded-lg gap-1.5",
  sm: "px-3 py-1.5 text-xs rounded-xl gap-1.5",
  md: "px-4 py-2 text-sm rounded-xl gap-2",
  lg: "px-6 py-2.5 text-sm font-bold rounded-xl gap-2.5",
  icon: "p-2 rounded-xl shrink-0",
  "icon-sm": "p-1.5 rounded-lg shrink-0",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  loadingText,
  icon: Icon,
  iconPosition = "left",
  disabled = false,
  className = "",
  type = "button",
  onClick,
  ...props
}) {
  const variantClass = VARIANTS[variant] || VARIANTS.primary;
  const sizeClass = SIZES[size] || SIZES.md;
  const isDisabled = disabled || isLoading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed select-none ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          {loadingText ? <span>{loadingText}</span> : children}
        </>
      ) : (
        <>
          {Icon && iconPosition === "left" && <Icon className="w-4 h-4 shrink-0" />}
          {children}
          {Icon && iconPosition === "right" && <Icon className="w-4 h-4 shrink-0" />}
        </>
      )}
    </button>
  );
}
