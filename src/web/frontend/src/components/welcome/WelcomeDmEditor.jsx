import React from "react";
import { Mail, Info, ShieldCheck } from "lucide-react";
import WelcomeVariableBar from "./WelcomeVariableBar";

export default function WelcomeDmEditor({
  config,
  updateConfig,
  insertVariable,
}) {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Direct Message (DM) Onboarding</h2>
              <p className="text-xs text-slate-400">
                Send a private greeting, server rules overview, or orientation link straight to new members' DMs.
              </p>
            </div>
          </div>

          {/* Toggle */}
          <label className="relative inline-flex items-center cursor-pointer self-start sm:self-center">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={Boolean(config.dm_enabled)}
              onChange={(e) => updateConfig("dm_enabled", e.target.checked)}
            />
            <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 shadow-inner"></div>
          </label>
        </div>

        {/* Info Banner */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-850/70 border border-white/5 flex items-start gap-3">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-300 leading-relaxed">
            Discord members can disable Direct Messages from server members in their Privacy Settings.
            DV-BOT safely catches blocked DMs without interrupting member joins or spamming server logs.
          </p>
        </div>
      </div>

      {/* DM Message Content */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>DM Message Content</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Markdown Enabled
            </span>
          </h3>
        </div>

        {/* Variables */}
        <WelcomeVariableBar
          onInsertVariable={(tag) => insertVariable("dm_message", tag)}
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Private Greeting Content <span className="text-rose-400">*</span>
            </label>
            <span className="text-[10px] text-slate-400">
              {(config.dm_message || "").length} / 2000
            </span>
          </div>
          <textarea
            rows={5}
            value={config.dm_message || ""}
            onChange={(e) => updateConfig("dm_message", e.target.value)}
            placeholder="Welcome to **{server}**, {username}! Please check out our rules and enjoy your stay."
            className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-white/10 text-white text-xs font-mono leading-relaxed focus:outline-none focus:border-emerald-500 transition-all"
          />
        </div>
      </div>
    </div>
  );
}
