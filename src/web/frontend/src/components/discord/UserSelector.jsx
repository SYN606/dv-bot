import React, { useState, useEffect, useRef } from "react";
import { Search, User, Loader2, X, Check } from "lucide-react";
import { getDiscordAvatarUrl } from "../../utils/discord";
import { getGuildMembers } from "../../api/client";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  size
} from '@floating-ui/react';

export default function UserSelector({
  guildId,
  value,
  onChange,
  placeholder = "Search member name or enter ID...",
  excludeIds = []
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState(null);
  const inputRef = useRef(null);

  const { refs, floatingStyles, context, placement } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip({ fallbackAxisSideDirection: 'end', padding: 16 }),
      shift({ padding: 16 }),
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${Math.max(rects.reference.width, 280)}px`,
          });
        },
      }),
    ],
  });

  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'listbox' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    dismiss,
    role,
  ]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Synchronize external value changes (e.g. reset from parent)
  useEffect(() => {
    if (!value) {
      setSelectedMember(null);
      setQuery("");
    } else if (selectedMember && selectedMember.id !== value) {
      const match = results.find((m) => m.id === value);
      if (match) {
        setSelectedMember(match);
        setQuery(match.globalName || match.username || match.id);
      } else {
        setQuery(value);
      }
    }
  }, [value, results, selectedMember]);

  // Fetch members when open or query changes
  useEffect(() => {
    if (!open && !debouncedQuery) return;
    if (!guildId) return;

    let isMounted = true;
    const fetchMembers = async () => {
      setLoading(true);
      try {
        const members = await getGuildMembers(guildId, debouncedQuery);
        if (isMounted) {
          const list = Array.isArray(members) ? members : [];
          setResults(list);
          if (value && !selectedMember) {
            const found = list.find((m) => m.id === value);
            if (found) setSelectedMember(found);
          }
        }
      } catch (err) {
        console.error("Failed to fetch guild members:", err);
        if (isMounted) setResults([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMembers();
    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, guildId, open]);

  const handleSelect = (member) => {
    setSelectedMember(member);
    setQuery(member.globalName || member.username || member.id);
    onChange(member.id);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedMember(null);
    setQuery("");
    onChange("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed) return;

      // Direct snowflake ID submission (17-20 digits)
      if (/^\d{17,20}$/.test(trimmed)) {
        onChange(trimmed);
        setOpen(false);
        return;
      }

      // If top search result exists, select it
      const filtered = results.filter((m) => !excludeIds.includes(m.id));
      if (filtered.length > 0) {
        handleSelect(filtered[0]);
      }
    }
  };

  const filteredResults = results.filter((m) => !excludeIds.includes(m.id));
  const isDropUp = placement.startsWith('top');
  const isSnowflake = /^\d{17,20}$/.test(query.trim());

  return (
    <div className="relative w-full">
      {/* Input is always mounted and directly focusable/typeable */}
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        className="relative w-full"
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-brand-crimson" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onFocus={() => {
            if (!open) setOpen(true);
          }}
          onClick={() => {
            if (!open) setOpen(true);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-crimson/50 focus:ring-1 focus:ring-brand-crimson/30 transition-all"
        />

        {(query || value) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Clear member"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{ ...floatingStyles, zIndex: 9999 }}
            {...getFloatingProps()}
            className={`glass-panel bg-slate-950/98 border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
              isDropUp ? "origin-bottom" : "origin-top"
            }`}
          >
            <div className="max-h-64 overflow-y-auto p-1.5 scrollbar-thin">
              {loading && results.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-slate-400 gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-crimson" />
                  <span>Searching server members...</span>
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="text-center py-6 px-4">
                  <p className="text-xs text-slate-400 mb-2">No members found.</p>
                  {isSnowflake && (
                    <button
                      type="button"
                      onClick={() => {
                        onChange(query.trim());
                        setOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-brand-crimson/20 text-brand-crimson hover:bg-brand-crimson/30 text-xs font-semibold transition-colors border border-brand-crimson/30 inline-flex items-center gap-1.5"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Inspect by ID: {query.trim()}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredResults.map((m) => {
                    const isSelected = value === m.id;
                    const avatarUrl = getDiscordAvatarUrl(m);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelect(m)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                          isSelected
                            ? "bg-brand-crimson/20 text-white"
                            : "hover:bg-white/5 text-slate-300 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={avatarUrl}
                            alt={m.username}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png";
                            }}
                            className="w-7 h-7 rounded-full bg-slate-800 object-cover shrink-0"
                            loading="lazy"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate text-slate-200">
                              {m.globalName || m.username}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono truncate">
                              @{m.username} • {m.id}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-brand-crimson shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </FloatingPortal>
      )}
    </div>
  );
}
