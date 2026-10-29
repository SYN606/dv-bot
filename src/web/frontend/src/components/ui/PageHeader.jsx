import React from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import Switch from "./Switch";
import Button from "./Button";

export default function PageHeader({
  title,
  description,
  category,
  breadcrumb,
  categoryColor = "text-indigo-400",
  actions,
  stats,
  children,
  // Master Module Switch props
  enabled,
  onToggle,
  hasModuleSwitch = false,
  switchTitle,
  switchLabel = "Master switch",
  // Refresh prop
  onRefresh,
  isRefreshing = false,
  // Disabled alert banner
  disabledAlert,
  className = "",
}) {
  const showSwitch = hasModuleSwitch || typeof onToggle === "function";
  const isModuleEnabled = enabled !== undefined ? Boolean(enabled) : true;

  return (
    <header className={`mb-8 border-b border-white/5 pb-8 space-y-6 ${className}`}>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
        {/* Left: Category / Title / Description */}
        <div className="space-y-2 max-w-2xl">
          {(category || breadcrumb) && (
            <div className="flex items-center gap-3">
              {category && (
                <span className={`text-sm font-display font-bold tracking-wider ${categoryColor}`}>
                  {category}
                </span>
              )}
              {breadcrumb && (
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">
                  {breadcrumb.startsWith("/") ? breadcrumb : `/ ${breadcrumb}`}
                </span>
              )}
            </div>
          )}

          <h1 className="text-3xl font-extrabold text-white tracking-tight">{title}</h1>

          {description && (
            <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
          )}
        </div>

        {/* Right: Actions, Stats & Master Switch */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Custom stats array */}
          {Array.isArray(stats) && stats.length > 0 && (
            <div className="flex items-center gap-3 bg-slate-900/60 px-4 py-2.5 rounded-2xl border border-white/5 text-xs font-mono text-slate-400">
              {stats.map((s, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span className="w-1 h-1 rounded-full bg-slate-600" />}
                  <div>
                    <span className="text-white font-bold">{s.value}</span>{" "}
                    <span className="text-slate-400">{s.label}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Refresh button */}
          {onRefresh && (
            <Button
              variant="secondary"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh"
              className="rounded-2xl"
            >
              <RefreshCw className={`w-4 h-4 text-slate-300 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          )}

          {/* Custom action slot */}
          {actions}

          {/* Master module switch */}
          {showSwitch && (
            <div className="flex items-center gap-4 px-4 py-3 glass-panel bg-slate-900/60 rounded-2xl border border-white/5 shrink-0 shadow-lg shadow-black/20">
              <div>
                <div className="text-sm font-bold text-white mb-0.5">
                  {switchTitle || (isModuleEnabled ? "Enabled" : "Disabled")}
                </div>
                <div className="text-[10px] text-slate-400 font-medium">{switchLabel}</div>
              </div>
              <Switch checked={isModuleEnabled} onChange={onToggle} />
            </div>
          )}
        </div>
      </div>

      {/* Optional sub-header / toolbar children */}
      {children}

      {/* Disabled Banner Alert */}
      {showSwitch && !isModuleEnabled && disabledAlert && (
        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 flex items-start gap-3 shadow-lg shadow-indigo-950/20 animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 shrink-0 text-indigo-400 mt-0.5" />
          <div className="text-xs sm:text-sm leading-relaxed">
            {typeof disabledAlert === "string" ? (
              <span>{disabledAlert}</span>
            ) : typeof disabledAlert === "object" ? (
              <>
                {disabledAlert.title && <strong>{disabledAlert.title}: </strong>}
                <span>{disabledAlert.message}</span>
              </>
            ) : (
              <>
                <strong>{title} Disabled:</strong> Active functionality is currently paused server-wide. Configurations remain saved and editable.
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
