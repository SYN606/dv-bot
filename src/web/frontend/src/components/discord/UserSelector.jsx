import React, { useState, useEffect, useRef } from "react";
import { Search, User, Loader2 } from "lucide-react";
import { getDiscordAvatarUrl } from "../../utils/discord";
import { getGuildMembers } from "../../api/client";
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
  FloatingFocusManager,
  size
} from '@floating-ui/react';

export default function UserSelector({ guildId, value, onChange, placeholder = "Search member or enter ID...", excludeIds = [] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const { refs, floatingStyles, context, placement } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8),
      flip({ fallbackAxisSideDirection: 'end', padding: 16 }),
      shift({ padding: 16 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
          });
        },
      }),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'listbox' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch members
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const members = await getGuildMembers(guildId, debouncedQuery);
        if (isMounted) setResults(Array.isArray(members) ? members : []);
      } catch (err) {
        console.error("Failed to fetch members:", err);
        if (isMounted) setResults([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchMembers();
    return () => { isMounted = false; };
  }, [debouncedQuery, guildId, open]);

  const handleSelect = (member) => {
    onChange(member.id);
    setOpen(false);
    setQuery("");
  };

  const handleManualSubmit = (e) => {
    if (e.key === "Enter" && query.trim() && !loading) {
      // Allow manual ID submission if it looks like a snowflake (17-19 digits)
      if (/^\d{17,19}$/.test(query.trim())) {
        onChange(query.trim());
        setOpen(false);
        setQuery("");
      }
    }
  };

  const filteredResults = results.filter(m => !excludeIds.includes(m.id));
  const isDropUp = placement.startsWith('top');

  return (
    <div className="relative w-full">
      <div ref={refs.setReference} {...getReferenceProps()} className="w-full">
        {!open && !value ? (
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-sm text-slate-400 hover:bg-slate-800 transition-colors text-left"
          >
            <span className="truncate">{placeholder}</span>
            <User className="w-4 h-4 text-slate-500 shrink-0" />
          </button>
        ) : (
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder={placeholder}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!open) setOpen(true);
              }}
              onKeyDown={handleManualSubmit}
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        )}
      </div>

      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, zIndex: 9999 }}
              {...getFloatingProps()}
              className={`glass-panel bg-slate-950/95 border border-white/10 rounded-xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-[0.98] duration-200 ${
                isDropUp ? "origin-bottom" : "origin-top"
              }`}
            >
              <div className="max-h-64 overflow-y-auto p-1.5 scrollbar-thin">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-500 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-xs">Searching members...</span>
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="text-center py-6 px-4">
                    <p className="text-xs text-slate-400">No members found.</p>
                    {/^\d{17,19}$/.test(query.trim()) && (
                      <button
                        type="button"
                        onClick={() => handleSelect({ id: query.trim() })}
                        className="mt-3 px-4 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 text-xs font-semibold transition-colors border border-indigo-500/20"
                      >
                        Add by ID: {query.trim()}
                      </button>
                    )}
                  </div>
                ) : (
                  filteredResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelect(m)}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors hover:bg-white/5"
                    >
                      <img src={getDiscordAvatarUrl(m)}
                        alt={m.username}
                        className="w-8 h-8 rounded-full bg-slate-800"
                        loading="lazy"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-200 truncate">{m.globalName || m.username}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{m.username} • {m.id}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
}
