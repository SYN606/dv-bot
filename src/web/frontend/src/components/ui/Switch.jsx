import React from "react";

export default function Switch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-indigo-500' : 'bg-slate-700'
      }`}
    >
      <span className="sr-only">Toggle</span>
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
