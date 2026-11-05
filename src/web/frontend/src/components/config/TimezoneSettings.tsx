import React, { useState, useEffect } from "react";
import { Globe, Clock, Sparkles } from "lucide-react";
import { POPULAR_TIMEZONES } from "../../utils/timezone";

export { POPULAR_TIMEZONES };

export default function TimezoneSettings({ config, updateConfig }) {
  const selectedTz = config?.timezone || "UTC";
  const [liveTime, setLiveTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      try {
        const formatted = new Intl.DateTimeFormat("en-US", {
          timeZone: selectedTz,
          dateStyle: "full",
          timeStyle: "medium",
        }).format(new Date());
        setLiveTime(formatted);
      } catch {
        setLiveTime(new Date().toUTCString());
      }
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [selectedTz]);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 flex flex-col justify-between h-full bg-slate-900/40">
      <div>
        <div className="flex items-center gap-2 mb-6">
          <Globe className="w-4 h-4 text-indigo-400" />
          <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold">
            Localization & Regional
          </h2>
        </div>

        <div className="mb-6">
          <div className="mb-2">
            <h3 className="text-base font-bold text-white mb-0.5 flex items-center gap-2">
              <span>Server Primary Timezone</span>
              {selectedTz === "UTC" && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-white/10">
                  DEFAULT
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Timestamps in moderation logs, server telemetry, traffic analysis, and scheduled notifications adapt to this timezone.
            </p>
          </div>

          <div className="relative mt-3">
            <select
              value={selectedTz}
              onChange={(e) => updateConfig("timezone", e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors shadow-inner appearance-none cursor-pointer"
            >
              {POPULAR_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value} className="bg-slate-900 text-white">
                  {tz.label} [{tz.value}]
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Live Clock Card */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Simulated Server Clock</span>
            </span>
            <span className="text-indigo-400 font-bold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
              {selectedTz}
            </span>
          </div>
          <div className="text-sm sm:text-base font-mono font-bold text-white tracking-wide">
            {liveTime || "Calculating local clock..."}
          </div>
        </div>
      </div>

      <div className="pt-4 mt-6 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Members can also customize their individual clock using <code className="text-indigo-300">/timezone me</code></span>
        </span>
      </div>
    </div>
  );
}
