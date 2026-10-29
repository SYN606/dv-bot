import React from "react";
import { Mail, Info, Palette } from "lucide-react";
import WelcomeVariableBar from "./WelcomeVariableBar";

const COLOR_PRESETS = [
  { name: "Emerald", hex: "#10B981" },
  { name: "Indigo", hex: "#6366F1" },
  { name: "Blurple", hex: "#5865F2" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Rose", hex: "#F43F5E" },
];

export default function WelcomeDmEditor({
  config,
  updateConfig,
  insertVariable,
}) {
  return (
    <div className="space-y-6">
      {/* 1. Header & Toggle */}
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

        {/* Format Selector: Text vs Embed */}
        <div className="mt-5 pt-4 border-t border-white/[0.04]">
          <label className="inline-flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(config.dm_is_embed)}
              onChange={(e) => updateConfig("dm_is_embed", e.target.checked)}
              className="rounded bg-slate-800 border-white/20 text-emerald-600 focus:ring-0 w-4 h-4"
            />
            <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-emerald-400" />
              Deliver as Modern Rich Embed instead of plain text
            </span>
          </label>
        </div>
      </div>

      {/* 2. DM Message Content */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>{config.dm_is_embed ? "DM Embed Body" : "DM Message Content"}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {config.dm_is_embed ? "Embed Mode" : "Markdown Enabled"}
            </span>
          </h3>
        </div>

        {/* Variables */}
        <WelcomeVariableBar
          onInsertVariable={(tag) => insertVariable("dm_message", tag)}
        />

        {/* Embed Settings if dm_is_embed */}
        {config.dm_is_embed && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  DM Embed Title
                </label>
                <input
                  type="text"
                  value={config.dm_embed_title || ""}
                  onChange={(e) => updateConfig("dm_embed_title", e.target.value)}
                  placeholder="Welcome to {server}!"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.dm_embed_color || "#10B981"}
                    onChange={(e) => updateConfig("dm_embed_color", e.target.value)}
                    className="w-10 h-9 p-0.5 rounded-xl bg-slate-800 border border-white/10 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={config.dm_embed_color || "#10B981"}
                    onChange={(e) => updateConfig("dm_embed_color", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs font-mono uppercase focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] text-slate-400">Presets:</span>
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => updateConfig("dm_embed_color", p.hex)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium border border-white/5 text-slate-300 hover:text-white"
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.hex }} />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Private Greeting Content <span className="text-rose-400">*</span>
            </label>
            <span className="text-[10px] text-slate-400">
              {(config.dm_message || "").length} / 4000
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

        {config.dm_is_embed && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/[0.04]">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Footer Text
              </label>
              <input
                type="text"
                value={config.dm_embed_footer || ""}
                onChange={(e) => updateConfig("dm_embed_footer", e.target.value)}
                placeholder="{server}"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center self-end pb-2">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.dm_show_thumbnail)}
                  onChange={(e) => updateConfig("dm_show_thumbnail", e.target.checked)}
                  className="rounded bg-slate-800 border-white/20 text-emerald-600 focus:ring-0 w-4 h-4"
                />
                <span className="text-xs text-slate-300">Show server icon thumbnail</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
