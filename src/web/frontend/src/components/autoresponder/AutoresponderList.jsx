import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import AutoresponderRule from "./AutoresponderRule";

export default function AutoresponderList({ rules, loading, editingRuleId, onEdit, onToggle, onDelete }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      if (filter === "enabled" && !r.enabled) return false;
      if (filter === "disabled" && r.enabled) return false;
      if (!search.trim()) return true;
      const term = search.toLowerCase();
      const triggerText = (r.trigger || r.trigger_phrase || "").toLowerCase();
      const replyText = (r.reply || r.reply_content || r.embedTitle || r.embed_title || "").toLowerCase();
      return triggerText.includes(term) || replyText.includes(term);
    });
  }, [rules, search, filter]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="glass-panel h-32 rounded-2xl animate-pulse border border-white/5"></div>
        ))}
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="glass-panel py-16 px-6 text-center rounded-3xl border border-white/5 border-dashed">
        <h3 className="text-lg font-bold text-white mb-2">No autoresponders yet</h3>
        <p className="text-sm text-slate-400">Create a rule to automatically respond when members send matching messages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base font-bold text-white uppercase tracking-wider font-display">Configured Rules</h2>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-900 border border-white/10 rounded-lg p-0.5 text-xs font-semibold">
            <button onClick={() => setFilter("all")} className={`px-2.5 py-1 rounded-md transition-colors ${filter === "all" ? "bg-white/10 text-white" : "text-slate-400"}`}>All</button>
            <button onClick={() => setFilter("enabled")} className={`px-2.5 py-1 rounded-md transition-colors ${filter === "enabled" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-400"}`}>Enabled</button>
            <button onClick={() => setFilter("disabled")} className={`px-2.5 py-1 rounded-md transition-colors ${filter === "disabled" ? "bg-white/10 text-white" : "text-slate-400"}`}>Disabled</button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search triggers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-44 pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2.5">
        {filteredRules.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-500 border border-dashed border-white/5 rounded-2xl">
            No rules match your filters.
          </div>
        ) : (
          filteredRules.map(rule => (
            <AutoresponderRule 
              key={rule.id}
              rule={rule}
              isEditing={Boolean(editingRuleId && (rule.id === editingRuleId || rule.responder_id === editingRuleId))}
              onEdit={onEdit}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
