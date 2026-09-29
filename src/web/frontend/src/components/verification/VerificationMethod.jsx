import React from "react";
import { CheckSquare, ShieldCheck } from "lucide-react";

export default function VerificationMethod({ config, updateConfig }) {
  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 space-y-6">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-2">
        <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">2</div>
        <h2 className="text-sm font-bold text-white tracking-wider font-mono uppercase">Verification Method</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => updateConfig("mode", "button")}
          className={`p-4 rounded-2xl text-left border transition-all ${
            config.mode === "button"
              ? "bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/20"
              : "bg-slate-900 border-white/5 hover:border-white/20"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-xl ${config.mode === "button" ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-slate-400"}`}>
              <CheckSquare className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white">Instant Button</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Member clicks Verify and receives the configured role immediately.
          </p>
        </button>

        <button
          type="button"
          onClick={() => updateConfig("mode", "captcha")}
          className={`p-4 rounded-2xl text-left border transition-all ${
            config.mode === "captcha"
              ? "bg-indigo-500/10 border-indigo-500/50 ring-1 ring-indigo-500/20"
              : "bg-slate-900 border-white/5 hover:border-white/20"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-xl ${config.mode === "captcha" ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-slate-400"}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white">CAPTCHA</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Member must complete the existing 6-character verification challenge before receiving access.
          </p>
        </button>
      </div>

      {config.minAccountAgeHours !== undefined && (
        <div className="pt-4 mt-2 border-t border-white/5">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Minimum Account Age (Hours)
          </label>
          <input
            type="number"
            min="0"
            value={config.minAccountAgeHours}
            onChange={(e) => updateConfig("minAccountAgeHours", parseInt(e.target.value) || 0)}
            className="w-full sm:w-64 px-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <p className="text-[10px] text-slate-500 mt-1.5">
            Accounts newer than this will be rejected. Set to 0 to disable.
          </p>
        </div>
      )}
    </div>
  );
}
