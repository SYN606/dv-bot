import React, { useState } from "react";
import { Search, Smile, RefreshCw } from "lucide-react";
import { useGuildEmojis } from "../../hooks/discord/useGuildEmojis";
import { QUICK_UNICODE_EMOJIS } from "../../utils/discord";
import EmojiBadge from "./EmojiBadge";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingFocusManager
} from '@floating-ui/react';

export default function EmojiSelector({
  guildId,
  value = [],
  onChange,
  multiple = true,
  max = 10,
  mode = "select",
  trigger = null,
  buttonClassName = "",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const { emojis: serverEmojis, loading, refresh } = useGuildEmojis(guildId);
  const normalizedList = Array.isArray(value) ? value : (value ? [value] : []);

  const { refs, floatingStyles, context, placement } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({ fallbackAxisSideDirection: 'end', padding: 16 }),
      shift({ padding: 16 })
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'dialog' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const handleSelect = (emojiRaw) => {
    if (mode === "insert" || !multiple) {
      if (typeof onChange === "function") {
        onChange(emojiRaw);
      }
      setOpen(false);
      return;
    }
    if (normalizedList.includes(emojiRaw)) {
      onChange(normalizedList.filter(e => e !== emojiRaw));
    } else {
      if (normalizedList.length < max) {
        onChange([...normalizedList, emojiRaw]);
      }
    }
  };

  const handleRemove = (emojiRaw) => {
    if (!multiple) {
      if (typeof onChange === "function") {
        onChange("");
      }
      return;
    }
    onChange(normalizedList.filter(e => e !== emojiRaw));
  };

  const filteredEmojis = search
    ? serverEmojis.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    : serverEmojis;

  const isDropUp = placement.startsWith('top');

  return (
    <div className="relative">
      {/* Selected Items & Trigger */}
      {trigger ? (
        <div ref={refs.setReference} {...getReferenceProps()} className="inline-block cursor-pointer">
          {trigger}
        </div>
      ) : mode === "insert" ? (
        <button
          ref={refs.setReference}
          {...getReferenceProps()}
          type="button"
          className={
            buttonClassName ||
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-white/[0.06] hover:border-indigo-500/30 text-xs font-mono transition-all group cursor-pointer"
          }
          aria-haspopup="dialog"
          aria-expanded={open}
          title="Insert Discord Emoji"
        >
          <Smile className="w-3.5 h-3.5 text-indigo-400" />
          <span>Emoji</span>
        </button>
      ) : !multiple ? (
        <button
          ref={refs.setReference}
          {...getReferenceProps()}
          type="button"
          className={
            buttonClassName ||
            "flex items-center justify-center w-11 h-9 rounded-xl bg-slate-900 border border-white/10 hover:border-indigo-500/60 hover:bg-slate-800 text-white transition-all shadow-sm group shrink-0"
          }
          aria-haspopup="dialog"
          aria-expanded={open}
          title="Click to select Discord emoji"
        >
          {normalizedList.length > 0 ? (
            <EmojiBadge emoji={normalizedList[0]} size="md" showName={false} bare={true} />
          ) : (
            <Smile className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" />
          )}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {normalizedList.map((emojiStr, idx) => (
            <EmojiBadge key={`${emojiStr}-${idx}`} emoji={emojiStr} onRemove={handleRemove} />
          ))}
          <button
            ref={refs.setReference}
            {...getReferenceProps()}
            type="button"
            disabled={normalizedList.length >= max}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <Smile className="w-4 h-4" />
            <span>Add Reaction</span>
          </button>
        </div>
      )}

      {mode !== "insert" && multiple && normalizedList.length > 0 && (
        <div className="mt-2 text-[10px] text-slate-500 font-mono">
          {normalizedList.length} / {max} selected
        </div>
      )}

      {/* Popover */}
      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, zIndex: 9999 }}
              {...getFloatingProps()}
              className={`w-72 sm:w-80 glass-panel bg-slate-950/95 border border-white/10 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden animate-in fade-in zoom-in-[0.98] duration-200 ${
                isDropUp ? "origin-bottom" : "origin-top"
              }`}
            >
              <div className="p-3 border-b border-white/5 bg-slate-900/50">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search server emojis or paste unicode..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="p-3 overflow-y-auto max-h-64 scrollbar-thin">
                {/* Custom Search Input Fallback */}
                {search.trim() && (
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => handleSelect(search.trim())}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-xs font-medium transition-colors"
                    >
                      <EmojiBadge emoji={search.trim()} size="sm" showName={false} bare={true} />
                      <span className="truncate">Use input: "{search.trim()}"</span>
                    </button>
                  </div>
                )}
                {/* Standard Emojis */}
                {!search && (
                  <div className="mb-4">
                    <div className="text-[10px] font-mono text-slate-500 font-bold tracking-widest uppercase mb-2 px-1">
                      Standard
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_UNICODE_EMOJIS.map((e, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelect(e)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg hover:bg-white/10 transition-colors ${
                            normalizedList.includes(e) ? "bg-white/10 border border-white/20" : ""
                          }`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Server Emojis */}
                <div>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <div className="text-[10px] font-mono text-slate-500 font-bold tracking-widest uppercase">
                      Server Emojis
                    </div>
                    <button type="button" onClick={refresh} className="text-slate-500 hover:text-white" title="Refresh">
                      <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                  
                  {loading && filteredEmojis.length === 0 ? (
                    <div className="flex justify-center p-4">
                      <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
                    </div>
                  ) : filteredEmojis.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-4">
                      {search ? "No emojis found" : "No server emojis available"}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {filteredEmojis.map((e) => {
                        const format = e.animated ? `<a:${e.name}:${e.id}>` : `<:${e.name}:${e.id}>`;
                        const isSelected = normalizedList.includes(format);
                        return (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => handleSelect(format)}
                            title={`:${e.name}:`}
                            className={`w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors p-1.5 ${
                              isSelected ? "bg-white/10 border border-white/20" : ""
                            }`}
                          >
                            <img
                              src={`https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? "gif" : "png"}`}
                              alt={e.name}
                              className="w-full h-full object-contain"
                              loading="lazy"
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
}
