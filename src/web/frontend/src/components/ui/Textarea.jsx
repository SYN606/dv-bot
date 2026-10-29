import React, { forwardRef } from "react";

const Textarea = forwardRef(function Textarea(
  {
    label,
    description,
    error,
    rows = 3,
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

      <textarea
        ref={ref}
        id={id}
        rows={rows}
        disabled={disabled}
        className={`w-full bg-slate-900 border text-xs sm:text-sm text-white placeholder-slate-500 rounded-xl px-3.5 py-2.5 transition-colors focus:outline-none focus:ring-1 resize-y disabled:opacity-50 disabled:cursor-not-allowed ${
          error
            ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30"
            : "border-white/10 focus:border-indigo-500 focus:ring-indigo-500/30"
        } ${className}`}
        {...props}
      />

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

export default Textarea;
