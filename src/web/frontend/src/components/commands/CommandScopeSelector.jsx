import React from "react";
import { ChannelSelector } from "../discord";
import { Globe, Hash } from "lucide-react";

export default function CommandScopeSelector({ guildId, channels, selectedChannel, setSelectedChannel }) {
  const isGlobal = selectedChannel === "global";

  return (
    <div className="glass-card p-6 rounded-3xl border border-white/5 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          {isGlobal ? (
            <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
              <Globe className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
              <Hash className="w-5 h-5" />
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold text-white">Target Scope</h2>
            <p className="text-xs text-slate-400">
              {isGlobal 
                ? "Applying rules across the entire server." 
                : "Applying channel-specific overrides."}
            </p>
          </div>
        </div>
      </div>
      
      <div className="w-full md:w-72 shrink-0">
        <ChannelSelector 
          guildId={guildId}
          channels={channels}
          value={selectedChannel}
          onChange={setSelectedChannel}
          allowedTypes={[0, 5]} // Text & Announcement
          placeholder="Select a channel..."
          specialOptions={[
            {
              value: "global",
              label: "🌐 Server-Wide (Global)",
              description: "Default command policy for the entire server"
            }
          ]}
        />
      </div>
    </div>
  );
}
