import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

const Select = forwardRef(function Select(
  {
    label,
    description,
    error,
    options = [],
    children,
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
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          className={`w-full appearance-none bg-slate-900 border text-xs sm:text-sm text-white rounded-xl pl-3.5 pr-10 py-2.5 transition-colors focus:outline-none focus:ring-1 disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? "border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30"
              : "border-white/10 focus:border-indigo-500 focus:ring-indigo-500/30"
          } ${className}`}
          {...props}
        >
          {children ||
            options.map((opt) => {
              const val = typeof opt === "object" ? opt.value : opt;
              const lbl = typeof opt === "object" ? opt.label : opt;
              return (
                <option key={val} value={val} className="bg-slate-900 text-white">
                  {lbl}
                </option>
              );
            })}
        </select>

        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
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

export default Select;
