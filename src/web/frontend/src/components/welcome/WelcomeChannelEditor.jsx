import React from "react";
import { MessageSquare, Bell, Clock, Palette, Image as ImageIcon, AtSign } from "lucide-react";
import WelcomeVariableBar from "./WelcomeVariableBar";

const COLOR_PRESETS = [
  { name: "Indigo", hex: "#6366F1" },
  { name: "Blurple", hex: "#5865F2" },
  { name: "Emerald", hex: "#10B981" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Cyan", hex: "#06B6D4" },
  { name: "Obsidian", hex: "#1E293B" },
];

const AUTO_DELETE_OPTIONS = [
  { label: "Never (Permanent)", value: 0 },
  { label: "10 Seconds", value: 10 },
  { label: "30 Seconds", value: 30 },
  { label: "1 Minute", value: 60 },
  { label: "5 Minutes", value: 300 },
  { label: "10 Minutes", value: 600 },
];

export default function WelcomeChannelEditor({
  config,
  channels,
  updateConfig,
  insertVariable,
}) {
  const textChannels = channels.filter((c) => c.type === 0 || c.type === "GUILD_TEXT" || !c.type);

  return (
    <div className="space-y-6">
      {/* Enable Toggle & Target Channel */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Public Channel Welcome</h2>
              <p className="text-xs text-slate-400">
                Greet new members publicly in a designated text channel when they join.
              </p>
            </div>
          </div>

          {/* Master Toggle */}
          <label className="relative inline-flex items-center cursor-pointer self-start sm:self-center">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={Boolean(config.welcome_enabled)}
              onChange={(e) => updateConfig("welcome_enabled", e.target.checked)}
            />
            <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 shadow-inner"></div>
          </label>
        </div>

        {/* Channel Selector & Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Welcome Channel <span className="text-rose-400">*</span>
            </label>
            <select
              value={config.welcome_channel_id || ""}
              onChange={(e) => updateConfig("welcome_channel_id", e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all"
            >
              <option value="">Select a text channel...</option>
              {textChannels.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Auto-Delete Message</span>
            </label>
            <select
              value={config.welcome_delete_seconds || 0}
              onChange={(e) => updateConfig("welcome_delete_seconds", Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all"
            >
              {AUTO_DELETE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Toggles: Ping User */}
        <div className="flex flex-wrap items-center gap-6 mt-5 pt-5 border-t border-white/[0.04]">
          <label className="inline-flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(config.welcome_ping_user)}
              onChange={(e) => updateConfig("welcome_ping_user", e.target.checked)}
              className="rounded bg-slate-800 border-white/20 text-indigo-600 focus:ring-0 w-4 h-4"
            />
            <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-indigo-400" />
              Ping new member outside embed
            </span>
          </label>

          <label className="inline-flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(config.welcome_is_embed)}
              onChange={(e) => updateConfig("welcome_is_embed", e.target.checked)}
              className="rounded bg-slate-800 border-white/20 text-indigo-600 focus:ring-0 w-4 h-4"
            />
            <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-400" />
              Use Rich Embed format
            </span>
          </label>
        </div>
      </div>

      {/* Embed & Message Content Editor */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Message Content & Styling</span>
            {config.welcome_is_embed && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Rich Embed Mode
              </span>
            )}
          </h3>
        </div>

        {/* Variable Helper Bar */}
        <WelcomeVariableBar
          onInsertVariable={(tag) => insertVariable("welcome_message", tag)}
        />

        {/* Embed Specific Fields */}
        {config.welcome_is_embed && (
          <div className="space-y-4">
            {/* Title & Color */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Embed Title
                </label>
                <input
                  type="text"
                  value={config.welcome_embed_title || ""}
                  onChange={(e) => updateConfig("welcome_embed_title", e.target.value)}
                  placeholder="Welcome to {server}!"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.welcome_embed_color || "#6366F1"}
                    onChange={(e) => updateConfig("welcome_embed_color", e.target.value)}
                    className="w-10 h-9 p-0.5 rounded-lg bg-slate-800 border border-white/10 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={config.welcome_embed_color || "#6366F1"}
                    onChange={(e) => updateConfig("welcome_embed_color", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs font-mono uppercase focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Color Preset Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-400 mr-1">Presets:</span>
              {COLOR_PRESETS.map((p) => (
                <button
                  key={p.hex}
                  type="button"
                  onClick={() => updateConfig("welcome_embed_color", p.hex)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-white/10 hover:border-white/20 transition-all text-slate-300"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shadow-sm"
                    style={{ backgroundColor: p.hex }}
                  />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Message Body */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">
              {config.welcome_is_embed ? "Embed Description / Body" : "Welcome Message Text"}{" "}
              <span className="text-rose-400">*</span>
            </label>
            <span className="text-[10px] text-slate-400">
              {(config.welcome_message || "").length} / 2000
            </span>
          </div>
          <textarea
            rows={4}
            value={config.welcome_message || ""}
            onChange={(e) => updateConfig("welcome_message", e.target.value)}
            placeholder="Hey {user}, welcome to **{server}**! Glad to have you here. You are member #{memberCount}! 🎉"
            className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-white/10 text-white text-xs font-mono leading-relaxed focus:outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Embed Footer & Media Options */}
        {config.welcome_is_embed && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Banner Image URL (Optional)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={config.welcome_image_url || ""}
                  onChange={(e) => updateConfig("welcome_image_url", e.target.value)}
                  placeholder="https://example.com/banner.png"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all"
                />
                <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Footer Text
              </label>
              <input
                type="text"
                value={config.welcome_embed_footer || ""}
                onChange={(e) => updateConfig("welcome_embed_footer", e.target.value)}
                placeholder="Member #{memberCount}"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Thumbnail toggle */}
            <div className="md:col-span-2 pt-2">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.welcome_show_thumbnail)}
                  onChange={(e) => updateConfig("welcome_show_thumbnail", e.target.checked)}
                  className="rounded bg-slate-800 border-white/20 text-indigo-600 focus:ring-0 w-4 h-4"
                />
                <span className="text-xs text-slate-300 font-medium">
                  Display member avatar as embed thumbnail
                </span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
