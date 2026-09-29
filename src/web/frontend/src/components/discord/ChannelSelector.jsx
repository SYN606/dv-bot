import React, { useState } from "react";
import { Search, Hash, Volume2, Megaphone } from "lucide-react";
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

export default function ChannelSelector({ channels = [], value, onChange, multiple = false, allowedTypes = [], specialOptions = [], placeholder = "Select channel..." }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

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

  const handleSelect = (id) => {
    if (!multiple) {
      onChange(id);
      setOpen(false);
      return;
    }
    const current = Array.isArray(value) ? value : [];
    if (current.includes(id)) {
      onChange(current.filter(c => c !== id));
    } else {
      onChange([...current, id]);
    }
  };

  const getIcon = (type) => {
    if (type === 2) return <Volume2 className="w-4 h-4" />; // Voice
    if (type === 5) return <Megaphone className="w-4 h-4" />; // Announcement
    return <Hash className="w-4 h-4" />; // Default Text
  };

  const filtered = channels.filter(c => {
    if (allowedTypes.length > 0 && !(allowedTypes.map(t => t === 'text' ? [0, 5] : t === 'voice' ? [2] : [t]).flat().includes(c.type === undefined ? 0 : c.type))) return false;
    if (!search) return true;
    return c.name.toLowerCase().includes(search.toLowerCase());
  });

  const getDisplayText = () => {
    if (!multiple && specialOptions.length > 0) {
      const special = specialOptions.find(o => o.value === value);
      if (special) return special.label;
    }
    if (!multiple) {
      const selected = channels.find(c => c.id === value);
      return selected ? selected.name : placeholder;
    }
    const current = Array.isArray(value) ? value : [];
    if (current.length === 0) return placeholder;
    if (current.length === 1) return channels.find(c => c.id === current[0])?.name || placeholder;
    return `${current.length} channels selected`;
  };

  const isDropUp = placement.startsWith('top');

  return (
    <div className="w-full relative">
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all text-left border shadow-sm ${
          open 
            ? "bg-slate-900 border-indigo-500/50 ring-2 ring-indigo-500/20 text-white" 
            : "bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800 hover:border-white/20 hover:text-white"
        }`}
      >
        <span className="truncate font-medium">{getDisplayText()}</span>
        <Hash className={`w-4 h-4 shrink-0 transition-colors ${open ? "text-indigo-400" : "text-slate-500"}`} />
      </button>

      {open && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false} initialFocus={-1}>
            <div
              ref={refs.setFloating}
              style={{ ...floatingStyles, zIndex: 9999 }}
              {...getFloatingProps()}
              className={`bg-slate-900 border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${
                isDropUp ? "origin-bottom" : "origin-top"
              }`}
            >
              <div className="p-2 border-b border-white/5 bg-slate-900/50">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search channels..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-950/50 border border-white/5 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    autoFocus
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-1.5 scrollbar-thin">
                {specialOptions.length > 0 && !search && (
                  <div className="mb-1.5 pb-1.5 border-b border-white/5 space-y-0.5">
                    {specialOptions.map(opt => {
                      const isSelected = value === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleSelect(opt.value)}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                            isSelected 
                              ? "bg-indigo-500/10 text-indigo-400" 
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="truncate font-semibold">{opt.label}</span>
                            {opt.description && <span className="text-[10px] text-slate-500 truncate leading-tight">{opt.description}</span>}
                          </div>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>}
                        </button>
                      );
                    })}
                  </div>
                )}
                {filtered.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-500 font-medium">No channels found</div>
                ) : (
                  <div className="space-y-0.5">
                    {filtered.map(c => {
                      const isSelected = multiple ? (value || []).includes(c.id) : value === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelect(c.id)}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                            isSelected 
                              ? "bg-indigo-500/10 text-indigo-400" 
                              : "text-slate-300 hover:bg-slate-800 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={isSelected ? "text-indigo-400/80" : "text-slate-500"}>{getIcon(c.type)}</span>
                            <span className="truncate font-medium">{c.name}</span>
                          </div>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
}
