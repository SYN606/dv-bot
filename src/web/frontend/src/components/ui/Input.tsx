import React, { forwardRef } from "react";

const Input = forwardRef(function Input(
  {
    label,
    description,
    error,
    icon: Icon,
    rightSlot,
    className = "",
    id,
    disabled = false,
    ...props
  },
  ref
) {
  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-300 tracking-wide"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <Icon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}

        <input
          ref={ref}
          id={id}
          disabled={disabled}
          className={`w-full bg-slate-900 border text-xs sm:text-sm text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 transition-colors focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed ${
            Icon ? "pl-9" : ""
          } ${rightSlot ? "pr-10" : ""} ${
            error
              ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30"
              : "border-white/10 focus:border-indigo-500 focus:ring-indigo-500/30"
          } ${className}`}
          {...props}
        />

        {rightSlot && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
            {rightSlot}
          </div>
        )}
      </div>

      {description && !error && (
        <p className="text-[11px] text-slate-500 leading-relaxed">{description}</p>
      )}

      {error && (
        <p className="text-xs text-rose-400 font-medium animate-in fade-in duration-150">
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
