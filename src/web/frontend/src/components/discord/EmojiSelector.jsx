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

export default function EmojiSelector({ guildId, value = [], onChange, multiple = true, max = 10 }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const { emojis: serverEmojis, loading, refresh } = useGuildEmojis(guildId);

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
    if (!multiple) {
      onChange([emojiRaw]);
      setOpen(false);
      return;
    }
    if (value.includes(emojiRaw)) {
      onChange(value.filter(e => e !== emojiRaw));
    } else {
      if (value.length < max) {
        onChange([...value, emojiRaw]);
      }
    }
  };

  const handleRemove = (emojiRaw) => {
    onChange(value.filter(e => e !== emojiRaw));
  };

  const filteredEmojis = search
    ? serverEmojis.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    : serverEmojis;

  const isDropUp = placement.startsWith('top');

  return (
    <div className="relative">
      {/* Selected Items & Trigger */}
      <div className="flex flex-wrap items-center gap-2">
        {value.map((emojiStr, idx) => (
          <EmojiBadge key={`${emojiStr}-${idx}`} emoji={emojiStr} onRemove={handleRemove} />
        ))}
        {(!multiple && value.length > 0) ? null : (
          <button
            ref={refs.setReference}
            {...getReferenceProps()}
            type="button"
            disabled={value.length >= max && multiple}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-colors disabled:opacity-50"
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <Smile className="w-4 h-4" />
            <span>Add Reaction</span>
          </button>
        )}
      </div>

      {multiple && value.length > 0 && (
        <div className="mt-2 text-[10px] text-slate-500 font-mono">
          {value.length} / {max} selected
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
                    className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson/50"
                  />
                </div>
              </div>

              <div className="p-3 overflow-y-auto max-h-64 scrollbar-thin">
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
                            value.includes(e) ? "bg-white/10 border border-white/20" : ""
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
                        const isSelected = value.includes(format);
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
