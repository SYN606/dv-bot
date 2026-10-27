import React, { useState, useEffect, useRef } from "react";
import { Search, Shield, X, Check } from "lucide-react";
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

export default function RoleSelector({
  roles = [],
  value,
  onChange,
  multiple = false,
  specialOptions = [],
  placeholder = "Select or search role..."
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
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
  const listboxRole = useRole(context, { role: 'listbox' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    dismiss,
    listboxRole,
  ]);

  // Sync displayed query when value changes
  useEffect(() => {
    if (!multiple) {
      if (!value) {
        setQuery("");
      } else {
        const special = specialOptions.find((o) => o.value === value);
        if (special) {
          setQuery(special.label);
        } else {
          const found = roles.find((r) => r.id === value);
          if (found) setQuery(`@${found.name}`);
        }
      }
    }
  }, [value, roles, specialOptions, multiple]);

  const handleSelect = (id) => {
    if (!multiple) {
      onChange(id);
      setOpen(false);
      const special = specialOptions.find((o) => o.value === id);
      if (special) {
        setQuery(special.label);
      } else {
        const found = roles.find((r) => r.id === id);
        if (found) setQuery(`@${found.name}`);
      }
      return;
    }

    const current = Array.isArray(value) ? value : [];
    if (current.includes(id)) {
      onChange(current.filter((r) => r !== id));
    } else {
      onChange([...current, id]);
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setQuery("");
    onChange(multiple ? [] : "");
    inputRef.current?.focus();
  };

  const cleanQuery = query.startsWith("@") ? query.slice(1).trim().toLowerCase() : query.trim().toLowerCase();

  const filteredRoles = roles.filter((r) => {
    if (!cleanQuery) return true;
    return r.name.toLowerCase().includes(cleanQuery) || r.id === query.trim();
  });

  const filteredSpecial = specialOptions.filter((opt) => {
    if (!cleanQuery) return true;
    return (
      opt.label.toLowerCase().includes(cleanQuery) ||
      (opt.description && opt.description.toLowerCase().includes(cleanQuery))
    );
  });

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && !multiple) {
      e.preventDefault();
      if (filteredSpecial.length > 0) {
        handleSelect(filteredSpecial[0].value);
      } else if (filteredRoles.length > 0) {
        handleSelect(filteredRoles[0].id);
      }
    }
  };

  const isDropUp = placement.startsWith('top');
  const selectedRole = !multiple && value ? roles.find((r) => r.id === value) : null;
  const roleColor = selectedRole?.color ? selectedRole.color : null;

  const hasSelection = multiple
    ? Array.isArray(value) && value.length > 0
    : Boolean(value);

  return (
    <div className="relative w-full">
      <div
        ref={refs.setReference}
        {...getReferenceProps()}
        className="relative w-full"
      >
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1.5">
          {roleColor ? (
            <div
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: roleColor }}
            />
          ) : (
            <Shield className="w-4 h-4 text-slate-500" />
          )}
        </div>

        {multiple && hasSelection ? (
          <div
            onClick={() => {
              setOpen(true);
              inputRef.current?.focus();
            }}
            className="w-full flex items-center justify-between pl-9 pr-9 py-2 bg-slate-900 border border-white/10 rounded-xl text-sm text-white cursor-pointer hover:border-white/20 transition-all"
          >
            <span className="truncate font-medium text-slate-200">
              {value.length === 1
                ? `@${roles.find((r) => r.id === value[0])?.name || "1 role"}`
                : `${value.length} roles selected`}
            </span>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onFocus={(e) => {
              if (!open) setOpen(true);
              if (!multiple && hasSelection) e.target.select();
            }}
            onClick={() => {
              if (!open) setOpen(true);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-9 py-2 bg-slate-900 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all"
          />
        )}

        {(hasSelection || query) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Clear role selection"
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
              {/* Special options (e.g. None / Everyone) */}
              {filteredSpecial.length > 0 && (
                <div className="mb-1.5 pb-1.5 border-b border-white/5 space-y-0.5">
                  {filteredSpecial.map((opt) => {
                    const isSelected = value === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                          isSelected
                            ? "bg-indigo-500/20 text-indigo-300 font-semibold"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="truncate font-semibold">{opt.label}</span>
                          {opt.description && (
                            <span className="text-[10px] text-slate-500 truncate leading-tight">
                              {opt.description}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-indigo-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {filteredRoles.length === 0 && filteredSpecial.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-500 font-medium">
                  {query ? `No roles matching "${query}"` : "No roles found"}
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredRoles.map((r) => {
                    const isSelected = multiple
                      ? (value || []).includes(r.id)
                      : value === r.id;
                    const colorStyle = r.color
                      ? { backgroundColor: r.color }
                      : { backgroundColor: "#64748b" };

                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleSelect(r.id)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                          isSelected
                            ? "bg-indigo-500/20 text-indigo-300 font-semibold"
                            : "text-slate-300 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                            style={colorStyle}
                          />
                          <span className="truncate font-medium">@{r.name}</span>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-indigo-400 shrink-0" />
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
