import React from "react";
import MediaRuleItem from "./MediaRuleItem";
import { Sparkles } from "lucide-react";

export default function MediaRuleList({ rules, channels, roles, onDelete, deletingChannelId }) {
  if (rules.length === 0) {
    return (
      <div className="text-center py-16 px-6 glass-panel rounded-3xl border border-dashed border-white/5">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-900 flex items-center justify-center border border-white/5">
          <Sparkles className="w-8 h-8 text-slate-500" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No media rules configured</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
          Create a rule to keep art, photography, meme, or clip channels focused on media.
        </p>
        <button 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors"
        >
          Create first rule
        </button>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider font-mono">Active Rules</h3>
      <div className="space-y-4">
        {rules.map(rule => (
          <MediaRuleItem 
            key={rule.channel_id}
            rule={rule}
            channels={channels}
            roles={roles}
            onDelete={onDelete}
            isDeleting={deletingChannelId === rule.channel_id}
          />
        ))}
      </div>
    </div>
  );
}
