import React, { useState, useEffect, useRef } from "react";
import { Search, Shield } from "lucide-react";

export default function RoleSelector({ roles = [], value, onChange, multiple = false, specialOptions = [], placeholder = "Select role..." }) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (id) => {
    if (!multiple) {
      onChange(id);
      setOpen(false);
      return;
    }
    const current = Array.isArray(value) ? value : [];
    if (current.includes(id)) {
      onChange(current.filter(r => r !== id));
    } else {
      onChange([...current, id]);
    }
  };

  const filtered = roles.filter(r => {
    if (!search) return true;
    return r.name.toLowerCase().includes(search.toLowerCase());
  });

  const getDisplayText = () => {
    if (!multiple && specialOptions.length > 0) {
      const special = specialOptions.find(o => o.value === value);
      if (special) return special.label;
    }
    if (!multiple) {
      const selected = roles.find(r => r.id === value);
      return selected ? `@${selected.name}` : placeholder;
    }
    const current = Array.isArray(value) ? value : [];
    if (current.length === 0) return placeholder;
    if (current.length === 1) return `@${roles.find(r => r.id === current[0])?.name || "Unknown Role"}`;
    return `${current.length} roles selected`;
  };

  return (
    <div className={`relative w-full ${open ? 'z-50' : 'z-10'}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          if (!open && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            setDropUp(spaceBelow < 320 && spaceAbove > spaceBelow);
          }
          setOpen(!open);
        }}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all text-left border shadow-sm ${
          open 
            ? "bg-slate-900 border-indigo-500/50 ring-2 ring-indigo-500/20 text-white" 
            : "bg-slate-900 border-white/10 text-slate-300 hover:bg-slate-800 hover:border-white/20 hover:text-white"
        }`}
      >
        <span className="truncate font-medium">{getDisplayText()}</span>
        <Shield className={`w-4 h-4 shrink-0 transition-colors ${open ? "text-indigo-400" : "text-slate-500"}`} />
      </button>

      {open && (
        <div className={`absolute left-0 w-full min-w-[240px] bg-slate-900 border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${dropUp ? "bottom-[calc(100%+8px)] origin-bottom" : "top-[calc(100%+8px)] origin-top"}`}>
          <div className="p-2 border-b border-white/5 bg-slate-900/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search roles..."
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
              <div className="text-center py-6 text-sm text-slate-500 font-medium">No roles found</div>
            ) : (
              <div className="space-y-0.5">
                {filtered.map(r => {
                  const isSelected = multiple ? (value || []).includes(r.id) : value === r.id;
                  const colorStyle = r.color ? { backgroundColor: r.color } : { backgroundColor: '#475569' }; // fallback to slate-600
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelect(r.id)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        isSelected 
                          ? "bg-indigo-500/10 text-indigo-400" 
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={colorStyle}></div>
                        <span className="truncate font-medium">@{r.name}</span>
                      </div>
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

