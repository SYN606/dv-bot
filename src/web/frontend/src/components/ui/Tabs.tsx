import React from "react";

export default function Tabs({
  tabs = [],
  activeTab,
  onChange,
  size = "sm",
  className = "",
}) {
  const sizeClasses = {
    sm: "p-0.5 text-xs rounded-xl",
    md: "p-1 text-xs sm:text-sm rounded-xl",
  };

  const itemSizes = {
    sm: "px-3 py-1.5 rounded-lg gap-1.5",
    md: "px-4 py-2 rounded-lg gap-2",
  };

  return (
    <div
      role="tablist"
      className={`inline-flex items-center bg-slate-900/90 border border-white/10 ${sizeClasses[size] || sizeClasses.sm} ${className}`}
    >
      {tabs.map((tab) => {
        const id = typeof tab === "string" ? tab : tab.id;
        const label = typeof tab === "string" ? tab : tab.label;
        const count = typeof tab === "object" ? tab.count : undefined;
        const Icon = typeof tab === "object" ? tab.icon : undefined;
        const isActive = activeTab === id;

        return (
          <button
            key={id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange?.(id)}
            className={`inline-flex items-center font-semibold transition-all duration-150 select-none ${
              itemSizes[size] || itemSizes.sm
            } ${
              isActive
                ? "bg-white/10 text-white shadow-sm border border-white/10"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
            <span>{label}</span>
            {count !== undefined && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? "bg-white/20 text-white" : "bg-white/5 text-slate-500"
                }`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
