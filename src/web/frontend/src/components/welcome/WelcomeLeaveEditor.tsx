import React from "react";
import { UserMinus, Palette, Image as ImageIcon, Sparkles, LayoutTemplate, HelpCircle } from "lucide-react";
import WelcomeVariableBar from "./WelcomeVariableBar";
import { ChannelSelector } from "../discord";

const COLOR_PRESETS = [
  { name: "Rose", hex: "#F43F5E" },
  { name: "Crimson", hex: "#ED4245" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Slate", hex: "#64748B" },
  { name: "Obsidian", hex: "#1E293B" },
];

export default function WelcomeLeaveEditor({
  config,
  channels,
  updateConfig,
  insertVariable,
}) {
  const applyTemplate = (type) => {
    if (type === "audit") {
      updateConfig("leave_is_embed", true);
      updateConfig("leave_embed_title", "🚪 Member Departed");
      updateConfig(
        "leave_message",
        "## 🚪 {displayName} has left the server\n\n> 👤 **User:** {user} (`{username}`)\n> 🆔 **User ID:** `{id}`\n> 🏷️ **Normal Name:** {displayName}\n> 🛡️ **Roles:** {roles}\n> ⏳ **Time on Server:** {joinedAge}\n> 👥 **Remaining Members:** #{memberCount}"
      );
      updateConfig("leave_embed_footer", "User ID: {id} • Remaining: {memberCount} members");
      updateConfig("leave_show_thumbnail", true);
    } else if (type === "compact") {
      updateConfig("leave_is_embed", true);
      updateConfig("leave_embed_title", "Goodbye {username}!");
      updateConfig(
        "leave_message",
        "### {displayName} ({user}) left {server}\n\n**Roles held:** {roles}\n**User ID:** `{id}`\n\nWe are now down to **{memberCount}** members."
      );
      updateConfig("leave_embed_footer", "Remaining: {memberCount} members");
      updateConfig("leave_show_thumbnail", true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Enable Toggle & Target Channel */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Goodbye & Leave Dispatch</h2>
              <p className="text-xs text-slate-400">
                Log member departures with rich details, user IDs, nicknames, and role audit history.
              </p>
            </div>
          </div>

          {/* Toggle */}
          <label className="relative inline-flex items-center cursor-pointer self-start sm:self-center">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={Boolean(config.leave_enabled)}
              onChange={(e) => updateConfig("leave_enabled", e.target.checked)}
            />
            <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600 shadow-inner"></div>
          </label>
        </div>

        {/* Channel Selector */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-6">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Leave Channel <span className="text-rose-400">*</span>
            </label>
            <ChannelSelector
              channels={channels}
              value={config.leave_channel_id}
              onChange={(val) => updateConfig("leave_channel_id", val)}
              allowedTypes={["text"]}
              placeholder="Select leave/farewell channel..."
            />
          </div>

          <div className="flex items-center self-end pb-2">
            <label className="inline-flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(config.leave_is_embed)}
                onChange={(e) => updateConfig("leave_is_embed", e.target.checked)}
                className="rounded bg-slate-800 border-white/20 text-rose-600 focus:ring-0 w-4 h-4"
              />
              <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-rose-400" />
                Use Rich Embed format for farewell
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Message Content & Styling */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Goodbye Message Styling</span>
            {config.leave_is_embed && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Embed Mode
              </span>
            )}
          </h3>

          {/* Quick Preset Templates */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <LayoutTemplate className="w-3 h-3 text-indigo-400" />
              Presets:
            </span>
            <button
              type="button"
              onClick={() => applyTemplate("audit")}
              className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-medium transition-all"
            >
              🛡️ Role & ID Audit
            </button>
            <button
              type="button"
              onClick={() => applyTemplate("compact")}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs font-medium transition-all"
            >
              💬 Compact
            </button>
          </div>
        </div>

        {/* Variables */}
        <WelcomeVariableBar
          onInsertVariable={(tag) => insertVariable("leave_message", tag)}
        />

        {config.leave_is_embed && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Embed Title
                </label>
                <input
                  type="text"
                  value={config.leave_embed_title || ""}
                  onChange={(e) => updateConfig("leave_embed_title", e.target.value)}
                  placeholder="🚪 Member Departed"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Accent Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.leave_embed_color || "#F43F5E"}
                    onChange={(e) => updateConfig("leave_embed_color", e.target.value)}
                    className="w-10 h-9 p-0.5 rounded-lg bg-slate-800 border border-white/10 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={config.leave_embed_color || "#F43F5E"}
                    onChange={(e) => updateConfig("leave_embed_color", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs font-mono uppercase focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Presets */}
              <div className="md:col-span-3 flex flex-wrap items-center gap-2 pt-1">
                <span className="text-[11px] text-slate-400 mr-1">Color Presets:</span>
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => updateConfig("leave_embed_color", p.hex)}
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
          </div>
        )}

        {/* Message Text */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <span>{config.leave_is_embed ? "Embed Description" : "Leave Message Text"}</span>
              <span className="text-rose-400">*</span>
            </label>
            <span className="text-[10px] text-slate-400">
              {(config.leave_message || "").length} / 4000
            </span>
          </div>
          <textarea
            rows={6}
            value={config.leave_message || ""}
            onChange={(e) => updateConfig("leave_message", e.target.value)}
            placeholder="## 🚪 {displayName} has left the server&#10;&#10;> 👤 **User:** {user} (`{username}`)&#10;> 🆔 **User ID:** `{id}`&#10;> 🏷️ **Normal Name:** {displayName}&#10;> 🛡️ **Roles:** {roles}&#10;> 👥 **Remaining Members:** #{memberCount}"
            className="w-full px-4 py-3 rounded-2xl bg-slate-800/80 border border-white/10 text-white text-xs font-mono leading-relaxed focus:outline-none focus:border-rose-500 transition-all"
          />

          {/* Typography Help Note */}
          <div className="mt-2 p-2.5 rounded-xl bg-slate-800/40 border border-white/5 flex items-start gap-2 text-[11px] text-slate-300">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-semibold text-white">Large Font Sizing Tip:</span> Use Discord Markdown headers to make text bigger:{" "}
              <code className="text-indigo-300 bg-black/30 px-1 py-0.5 rounded font-mono"># Giant Header</code>,{" "}
              <code className="text-indigo-300 bg-black/30 px-1 py-0.5 rounded font-mono">## Big Header</code>, or{" "}
              <code className="text-indigo-300 bg-black/30 px-1 py-0.5 rounded font-mono">### Medium Header</code>. Use{" "}
              <code className="text-indigo-300 bg-black/30 px-1 py-0.5 rounded font-mono">&gt; text</code> for quotes.
            </div>
          </div>
        </div>

        {/* Leave Embed Footer & Thumbnail */}
        {config.leave_is_embed && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/[0.04]">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Footer Text
              </label>
              <input
                type="text"
                value={config.leave_embed_footer || ""}
                onChange={(e) => updateConfig("leave_embed_footer", e.target.value)}
                placeholder="User ID: {id} • Remaining: {memberCount} members"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Banner Image URL (Optional)</span>
              </label>
              <input
                type="text"
                value={config.leave_image_url || ""}
                onChange={(e) => updateConfig("leave_image_url", e.target.value)}
                placeholder="https://example.com/goodbye-banner.png"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="md:col-span-2 pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.leave_show_thumbnail)}
                  onChange={(e) => updateConfig("leave_show_thumbnail", e.target.checked)}
                  className="rounded bg-slate-800 border-white/20 text-rose-600 focus:ring-0 w-4 h-4"
                />
                <span className="text-xs text-slate-300">Show departing member avatar thumbnail</span>
              </label>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
