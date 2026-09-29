import React from "react";
import { X } from "lucide-react";
import { parseDiscordEmoji } from "../../utils/discord";

export default function EmojiBadge({ emoji, onRemove = null, size = "md" }) {
  const parsed = parseDiscordEmoji(emoji);
  const imgSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const fontSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 shadow-sm text-xs font-medium">
      {parsed?.isCustom ? (
        <img
          src={parsed.url}
          alt={parsed.name}
          className={`${imgSize} object-contain rounded shrink-0`}
          loading="lazy"
        />
      ) : (
        <span className={fontSize}>{emoji}</span>
      )}
      {parsed?.isCustom && (
        <span className="text-[10px] text-slate-500 font-mono">:{parsed.name}:</span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(emoji);
          }}
          className="p-0.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Remove emoji"
          aria-label="Remove emoji"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}
