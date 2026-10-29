import React from "react";

const SIZES = {
  sm: {
    track: "h-5 w-9",
    thumb: "h-3.5 w-3.5",
    activeTranslate: "translate-x-4",
    inactiveTranslate: "translate-x-0.5",
  },
  md: {
    track: "h-6 w-11",
    thumb: "h-4 w-4",
    activeTranslate: "translate-x-6",
    inactiveTranslate: "translate-x-1",
  },
};

const COLORS = {
  indigo: "bg-indigo-500 shadow-indigo-500/30",
  emerald: "bg-emerald-500 shadow-emerald-500/30",
  rose: "bg-rose-500 shadow-rose-500/30",
};

export default function Switch({
  checked = false,
  onChange,
  disabled = false,
  size = "md",
  color = "indigo",
  label,
  description,
  className = "",
  id,
}) {
  const s = SIZES[size] || SIZES.md;
  const activeColor = COLORS[color] || COLORS.indigo;

  const toggleButton = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange?.(!checked)}
      disabled={disabled}
      className={`relative inline-flex ${s.track} shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? `${activeColor} shadow-md` : "bg-slate-700/80"
      } ${!label ? className : ""}`}
    >
      <span className="sr-only">{label || "Toggle"}</span>
      <span
        className={`pointer-events-none inline-block ${s.thumb} transform rounded-full bg-white transition-transform duration-200 shadow-sm ${
          checked ? s.activeTranslate : s.inactiveTranslate
        }`}
      />
    </button>
  );

  if (!label && !description) {
    return toggleButton;
  }

  return (
    <label
      htmlFor={id}
      className={`flex items-center justify-between gap-4 cursor-pointer group select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
      onClick={(e) => {
        if (!disabled && e.target.tagName !== "BUTTON") {
          e.preventDefault();
          onChange?.(!checked);
        }
      }}
    >
      <div>
        {label && (
          <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
            {label}
          </div>
        )}
        {description && (
          <div className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
            {description}
          </div>
        )}
      </div>
      {toggleButton}
    </label>
  );
}
