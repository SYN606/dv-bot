import React, { useState } from "react";
import {
  Plus,
  Trash2,
  Copy,
  Palette,
  User,
  Heading,
  FileText,
  Image,
  Clock,
  Sparkles,
} from "lucide-react";
import EmbedFieldEditor from "./EmbedFieldEditor";

const PRESET_COLORS = [
  { name: "Blurple", hex: "#5865F2" },
  { name: "Emerald", hex: "#57F287" },
  { name: "Gold", hex: "#FEE75C" },
  { name: "Crimson", hex: "#ED4245" },
  { name: "Fuchsia", hex: "#EB459E" },
  { name: "Cyan", hex: "#00B0F4" },
  { name: "Dark", hex: "#2B2D31" },
  { name: "White", hex: "#FFFFFF" },
];

function toHexColor(color) {
  if (!color) return "#5865F2";
  if (typeof color === "number") {
    return `#${color.toString(16).padStart(6, "0")}`;
  }
  let str = String(color).trim();
  if (!str.startsWith("#")) str = `#${str}`;
  if (/^#[0-9A-Fa-f]{6}$/.test(str)) return str;
  return "#5865F2";
}

function createDefaultEmbed(index = 0) {
  return {
    color: "#5865F2",
    author: { name: "", url: "", icon_url: "" },
    title: "",
    url: "",
    description: "",
    fields: [],
    thumbnail: { url: "" },
    image: { url: "" },
    footer: { text: "", icon_url: "" },
    timestamp: false,
  };
}

export default function EmbedEditor({ embeds = [], onChangeEmbeds }) {
  const [activeEmbedIndex, setActiveEmbedIndex] = useState(0);

  const safeActiveIndex = Math.min(Math.max(0, activeEmbedIndex), Math.max(0, (embeds.length || 1) - 1));
  const activeEmbed = embeds[safeActiveIndex] || embeds[0] || createDefaultEmbed(0);

  const handleUpdateActiveEmbed = (updates) => {
    const next = [...embeds];
    if (next.length === 0) {
      next.push(createDefaultEmbed(0));
    }
    const idx = Math.min(safeActiveIndex, next.length - 1);
    next[idx] = { ...next[idx], ...updates };
    onChangeEmbeds(next);
  };

  const handleAddEmbed = () => {
    if (embeds.length >= 10) return;
    const newEmbed = createDefaultEmbed(embeds.length);
    const next = [...embeds, newEmbed];
    onChangeEmbeds(next);
    setActiveEmbedIndex(next.length - 1);
  };

  const handleDuplicateEmbed = (index) => {
    if (embeds.length >= 10) return;
    const target = embeds[index];
    const clone = JSON.parse(JSON.stringify(target || createDefaultEmbed(0)));
    const next = [...embeds];
    next.splice(index + 1, 0, clone);
    onChangeEmbeds(next);
    setActiveEmbedIndex(index + 1);
  };

  const handleRemoveEmbed = (index) => {
    if (embeds.length <= 1) {
      onChangeEmbeds([createDefaultEmbed(0)]);
      setActiveEmbedIndex(0);
      return;
    }
    const next = embeds.filter((_, idx) => idx !== index);
    onChangeEmbeds(next);
    setActiveEmbedIndex(Math.max(0, index - 1));
  };

  return (
    <div className="space-y-4">
      {/* Embed Tabs Header */}
      <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          {embeds.map((emb, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveEmbedIndex(idx)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 ${
                activeEmbedIndex === idx
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: emb.color || "#5865F2" }}
              />
              <span>Embed #{idx + 1}</span>
            </button>
          ))}

          {embeds.length < 10 && (
            <button
              type="button"
              onClick={handleAddEmbed}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-medium inline-flex items-center gap-1 transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          )}
        </div>

        {/* Embed Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => handleDuplicateEmbed(activeEmbedIndex)}
            title="Duplicate this embed"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleRemoveEmbed(activeEmbedIndex)}
            title="Delete this embed"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Embed Body Configuration */}
      <div className="space-y-4">
        {/* Color Palette Row */}
        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Palette className="w-4 h-4 text-indigo-400" />
              <span>Embed Color</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={toHexColor(activeEmbed.color)}
                onChange={(e) => handleUpdateActiveEmbed({ color: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
              />
              <input
                type="text"
                value={toHexColor(activeEmbed.color)}
                onChange={(e) => handleUpdateActiveEmbed({ color: e.target.value })}
                placeholder="#5865F2"
                maxLength={7}
                className="w-20 px-2 py-0.5 rounded bg-slate-950 border border-white/10 text-xs font-mono text-white text-center focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Quick Swatches */}
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c.hex}
                type="button"
                onClick={() => handleUpdateActiveEmbed({ color: c.hex })}
                className={`w-6 h-6 rounded-lg transition-transform hover:scale-110 border ${
                  toHexColor(activeEmbed.color).toLowerCase() === c.hex.toLowerCase()
                    ? "ring-2 ring-white border-transparent scale-110"
                    : "border-white/10"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Author Section */}
        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <User className="w-4 h-4 text-indigo-400" />
              <span>Author</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {(activeEmbed.author?.name || "").length} / 256
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="text"
              maxLength={256}
              value={activeEmbed.author?.name || ""}
              onChange={(e) =>
                handleUpdateActiveEmbed({
                  author: { ...(activeEmbed.author || {}), name: e.target.value },
                })
              }
              placeholder="Author Name"
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="url"
              value={activeEmbed.author?.url || ""}
              onChange={(e) =>
                handleUpdateActiveEmbed({
                  author: { ...(activeEmbed.author || {}), url: e.target.value },
                })
              }
              placeholder="Author URL (https://...)"
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="url"
              value={activeEmbed.author?.icon_url || ""}
              onChange={(e) =>
                handleUpdateActiveEmbed({
                  author: { ...(activeEmbed.author || {}), icon_url: e.target.value },
                })
              }
              placeholder="Author Icon URL (https://...)"
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Title & Title URL */}
        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Heading className="w-4 h-4 text-indigo-400" />
              <span>Title</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {(activeEmbed.title || "").length} / 256
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              maxLength={256}
              value={activeEmbed.title || ""}
              onChange={(e) => handleUpdateActiveEmbed({ title: e.target.value })}
              placeholder="Embed Title"
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
            />
            <input
              type="url"
              value={activeEmbed.url || ""}
              onChange={(e) => handleUpdateActiveEmbed({ url: e.target.value })}
              placeholder="Title Link URL (https://...)"
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Description */}
        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <FileText className="w-4 h-4 text-indigo-400" />
              <span>Description</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {(activeEmbed.description || "").length} / 4,096
            </span>
          </div>
          <textarea
            rows={5}
            maxLength={4096}
            value={activeEmbed.description || ""}
            onChange={(e) => handleUpdateActiveEmbed({ description: e.target.value })}
            placeholder="Embed description content. Markdown, emojis, and mentions supported."
            className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono leading-relaxed resize-y"
          />
        </div>

        {/* Dynamic Fields Section */}
        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5">
          <EmbedFieldEditor
            fields={activeEmbed.fields || []}
            onChangeFields={(fields) => handleUpdateActiveEmbed({ fields })}
          />
        </div>

        {/* Media (Thumbnail & Main Image) */}
        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Image className="w-4 h-4 text-indigo-400" />
            <span>Images & Media</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Thumbnail (Top Right)</label>
              <input
                type="url"
                value={activeEmbed.thumbnail?.url || ""}
                onChange={(e) =>
                  handleUpdateActiveEmbed({ thumbnail: { url: e.target.value } })
                }
                placeholder="https://.../thumbnail.png"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Main Banner Image</label>
              <input
                type="url"
                value={activeEmbed.image?.url || ""}
                onChange={(e) =>
                  handleUpdateActiveEmbed({ image: { url: e.target.value } })
                }
                placeholder="https://.../banner.png"
                className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Footer & Timestamp */}
        <div className="p-3.5 rounded-2xl bg-slate-900/50 border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Footer & Timestamp</span>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {(activeEmbed.footer?.text || "").length} / 2,048
              </span>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(activeEmbed.timestamp)}
                onChange={(e) => handleUpdateActiveEmbed({ timestamp: e.target.checked })}
                className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Include Timestamp</span>
            </label>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input
              type="text"
              maxLength={2048}
              value={activeEmbed.footer?.text || ""}
              onChange={(e) =>
                handleUpdateActiveEmbed({
                  footer: { ...(activeEmbed.footer || {}), text: e.target.value },
                })
              }
              placeholder="Footer text (e.g. Powered by Digital Vigital)"
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <input
              type="url"
              value={activeEmbed.footer?.icon_url || ""}
              onChange={(e) =>
                handleUpdateActiveEmbed({
                  footer: { ...(activeEmbed.footer || {}), icon_url: e.target.value },
                })
              }
              placeholder="Footer icon URL (https://...)"
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
