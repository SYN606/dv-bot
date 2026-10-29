import React from "react";
import { ChannelSelector } from "../discord";

export default function AutoRoleSettings({ guildId, channels, config, updateConfig }) {
  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 mb-8">
      <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-6">Module Settings</h2>
      
      <div className="space-y-6">
        <label className="flex items-center justify-between cursor-pointer group">
          <div>
            <div className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors">Enable Auto-Roles</div>
            <div className="text-xs text-slate-500">Automatically assign weekly leaderboard roles.</div>
          </div>
          <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.enabled ? 'bg-indigo-500' : 'bg-slate-700'}`}>
            <input 
              type="checkbox" 
              className="sr-only" 
              checked={Boolean(config.enabled)} 
              onChange={(e) => updateConfig("enabled", e.target.checked ? 1 : 0)} 
            />
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </div>
        </label>

        <div className="pt-6 border-t border-white/5">
          <div className="mb-3">
            <div className="text-sm font-semibold text-slate-200">Announcement Channel</div>
            <div className="text-xs text-slate-500">Weekly leaderboard results will be posted here.</div>
          </div>
          <div className="max-w-md">
            <ChannelSelector 
              guildId={guildId}
              channels={channels}
              value={config.announcement_channel_id}
              onChange={(val) => updateConfig("announcement_channel_id", val)}
              allowedTypes={[0, 5]} // Text & Announcement
              placeholder="No announcements"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
