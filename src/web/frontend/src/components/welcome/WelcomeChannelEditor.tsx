import React from "react";
import {
  MessageSquare, Clock, Palette, Image as ImageIcon, AtSign, Link as LinkIcon,
  User, Plus, Trash2, LayoutList, CheckSquare
} from "lucide-react";
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
  const fields = Array.isArray(config.welcome_embed_fields) ? config.welcome_embed_fields : [];

  const handleAddField = () => {
    if (fields.length >= 10) return;
    const newFields = [
      ...fields,
      { name: "Rule Spotlight", value: "Be respectful and check <#rules>!", inline: true },
    ];
    updateConfig("welcome_embed_fields", newFields);
  };

  const handleUpdateField = (index, key, val) => {
    const updated = fields.map((f, i) => (i === index ? { ...f, [key]: val } : f));
    updateConfig("welcome_embed_fields", updated);
  };

  const handleRemoveField = (index) => {
    const updated = fields.filter((_, i) => i !== index);
    updateConfig("welcome_embed_fields", updated);
  };

  return (
    <div className="space-y-6">
      {/* 1. Master Channel Switch & Primary Routing */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Public Channel Welcome</h2>
              <p className="text-xs text-slate-400">
                Greet new members publicly in a designated text channel with modern rich embeds.
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

        {/* Delivery Options */}
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
              Use Rich Embed Format (Recommended)
            </span>
          </label>
        </div>
      </div>

      {/* 2. Message Body & Variable Engine */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <span>{config.welcome_is_embed ? "Embed Body & Description" : "Message Content"}</span>
            {config.welcome_is_embed && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Markdown Enabled
              </span>
            )}
          </h3>
        </div>

        {/* Dynamic Variable Chips */}
        <WelcomeVariableBar
          onInsertVariable={(tag) => insertVariable("welcome_message", tag)}
        />

        {/* Description Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Message Content <span className="text-rose-400">*</span>
            </label>
            <span className="text-[10px] text-slate-400">
              {(config.welcome_message || "").length} / 4000
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
      </div>

      {/* 3. Modern Embed Customization Section (Only visible in Embed Mode) */}
      {config.welcome_is_embed && (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-bold text-white">Embed Architecture & Design</h3>
              <p className="text-xs text-slate-400">
                Customize author headers, clickable title URLs, accent swatches, and thumbnail styles.
              </p>
            </div>
            <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-xl border border-indigo-500/20">
              Discord Native
            </span>
          </div>

          {/* Author Header */}
          <div className="p-4 rounded-2xl bg-slate-800/40 border border-white/5 space-y-3">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Embed Author (Header)</span>
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Author Name</label>
                <input
                  type="text"
                  value={config.welcome_embed_author || ""}
                  onChange={(e) => updateConfig("welcome_embed_author", e.target.value)}
                  placeholder="e.g. {username} just arrived!"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Author Icon URL</label>
                <input
                  type="text"
                  value={config.welcome_embed_author_icon || ""}
                  onChange={(e) => updateConfig("welcome_embed_author_icon", e.target.value)}
                  placeholder="e.g. {userAvatar} or https://..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Title & Clickable URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Title Clickable URL (Optional)</span>
              </label>
              <input
                type="text"
                value={config.welcome_embed_title_url || ""}
                onChange={(e) => updateConfig("welcome_embed_title_url", e.target.value)}
                placeholder="https://myserver.com/rules"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {/* Accent Color Picker & Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Embed Accent Color
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="color"
                value={config.welcome_embed_color || "#6366F1"}
                onChange={(e) => updateConfig("welcome_embed_color", e.target.value)}
                className="w-10 h-10 p-0.5 rounded-xl bg-slate-800 border border-white/10 cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={config.welcome_embed_color || "#6366F1"}
                onChange={(e) => updateConfig("welcome_embed_color", e.target.value)}
                className="w-28 px-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs font-mono uppercase focus:outline-none focus:border-indigo-500"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => updateConfig("welcome_embed_color", p.hex)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border border-white/5 hover:border-white/20 transition-all text-slate-300"
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

          {/* Thumbnail Settings */}
          <div className="pt-2 border-t border-white/[0.04]">
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Thumbnail Icon
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3 rounded-2xl border text-xs font-medium cursor-pointer flex items-center gap-2.5 transition-all ${
                  config.welcome_show_thumbnail && config.welcome_thumbnail_type === "user_avatar"
                    ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                    : "bg-slate-800/40 border-white/5 text-slate-400 hover:text-white"
                }`}
              >
                <input
                  type="radio"
                  name="thumb_type"
                  checked={Boolean(config.welcome_show_thumbnail && config.welcome_thumbnail_type === "user_avatar")}
                  onChange={() => {
                    updateConfig("welcome_show_thumbnail", true);
                    updateConfig("welcome_thumbnail_type", "user_avatar");
                  }}
                  className="sr-only"
                />
                <span>Member Avatar</span>
              </label>

              <label
                className={`p-3 rounded-2xl border text-xs font-medium cursor-pointer flex items-center gap-2.5 transition-all ${
                  config.welcome_show_thumbnail && config.welcome_thumbnail_type === "server_icon"
                    ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                    : "bg-slate-800/40 border-white/5 text-slate-400 hover:text-white"
                }`}
              >
                <input
                  type="radio"
                  name="thumb_type"
                  checked={Boolean(config.welcome_show_thumbnail && config.welcome_thumbnail_type === "server_icon")}
                  onChange={() => {
                    updateConfig("welcome_show_thumbnail", true);
                    updateConfig("welcome_thumbnail_type", "server_icon");
                  }}
                  className="sr-only"
                />
                <span>Server Icon</span>
              </label>

              <label
                className={`p-3 rounded-2xl border text-xs font-medium cursor-pointer flex items-center gap-2.5 transition-all ${
                  !config.welcome_show_thumbnail
                    ? "bg-indigo-600/20 border-indigo-500/50 text-indigo-300"
                    : "bg-slate-800/40 border-white/5 text-slate-400 hover:text-white"
                }`}
              >
                <input
                  type="radio"
                  name="thumb_type"
                  checked={!config.welcome_show_thumbnail}
                  onChange={() => updateConfig("welcome_show_thumbnail", false)}
                  className="sr-only"
                />
                <span>No Thumbnail</span>
              </label>
            </div>
          </div>

          {/* 4. Modern Custom Fields Builder (Carl-bot / Dyno Style) */}
          <div className="pt-4 border-t border-white/[0.04] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <LayoutList className="w-4 h-4 text-indigo-400" />
                  <span>Custom Embed Fields ({fields.length}/10)</span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  Highlight key server information, guidelines, or welcome links inside the embed.
                </p>
              </div>

              <button
                type="button"
                disabled={fields.length >= 10}
                onClick={handleAddField}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Field</span>
              </button>
            </div>

            {fields.length > 0 && (
              <div className="space-y-3">
                {fields.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-slate-800/50 border border-white/5 space-y-2.5 relative group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="text"
                        value={f.name || ""}
                        onChange={(e) => handleUpdateField(idx, "name", e.target.value)}
                        placeholder="Field Title (e.g. 📜 Rules)"
                        className="w-1/2 px-3 py-1.5 rounded-xl bg-slate-800 border border-white/10 text-white text-xs font-semibold focus:outline-none focus:border-indigo-500"
                      />

                      <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(f.inline)}
                            onChange={(e) => handleUpdateField(idx, "inline", e.target.checked)}
                            className="rounded bg-slate-700 border-white/20 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                          />
                          <span>Inline</span>
                        </label>

                        <button
                          type="button"
                          onClick={() => handleRemoveField(idx)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      value={f.value || ""}
                      onChange={(e) => handleUpdateField(idx, "value", e.target.value)}
                      placeholder="Field Value (e.g. Please check out <#rules> before chatting!)"
                      className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Banner Image & Footer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/[0.04]">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                <span>Large Banner Image URL</span>
              </label>
              <input
                type="text"
                value={config.welcome_image_url || ""}
                onChange={(e) => updateConfig("welcome_image_url", e.target.value)}
                placeholder="https://example.com/banner.png"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-indigo-500 transition-all"
              />
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

            {/* Timestamp Toggle */}
            <div className="md:col-span-2 pt-1">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(config.welcome_show_timestamp)}
                  onChange={(e) => updateConfig("welcome_show_timestamp", e.target.checked)}
                  className="rounded bg-slate-800 border-white/20 text-indigo-600 focus:ring-0 w-4 h-4"
                />
                <span className="text-xs text-slate-300 font-medium">
                  Display current join timestamp in footer
                </span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
