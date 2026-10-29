import React from "react";
import { Search, X } from "lucide-react";

export default function SearchInput({
  value = "",
  onChange,
  onClear,
  placeholder = "Search...",
  size = "md",
  shortcut,
  className = "",
  autoFocus = false,
  ...props
}) {
  const sizeClasses = {
    sm: "pl-8 pr-7 py-1.5 text-xs rounded-lg",
    md: "pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl",
  };

  const iconSizes = {
    sm: "w-3.5 h-3.5 left-2.5",
    md: "w-4 h-4 left-3",
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <Search
        className={`${iconSizes[size] || iconSizes.md} text-slate-500 absolute top-1/2 -translate-y-1/2 pointer-events-none`}
      />

      <input
        type="text"
        placeholder={placeholder}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange?.(e.target.value)}
        className={`w-full bg-slate-900/90 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-colors shadow-inner ${
          sizeClasses[size] || sizeClasses.md
        }`}
        {...props}
      />

      {value && onClear && (
        <button
          type="button"
          onClick={() => {
            onClear?.();
            onChange?.("");
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {!value && shortcut && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-500 bg-white/5 border border-white/10">
          {shortcut}
        </span>
      )}
    </div>
  );
}
