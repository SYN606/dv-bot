import React from "react";
import { ChannelSelector } from "../discord";

export default function AuditLogSettings({ guildId, channels, config, updateConfig }) {
  const currentChannel = channels.find(c => c.id === config.modLogChannelId);

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 mb-8 flex flex-col justify-between h-full">
      <div>
        <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-6">Logging</h2>
        
        <div className="mb-4">
          <h3 className="text-lg font-bold text-white mb-1">Moderation Audit Log</h3>
          <p className="text-sm text-slate-400">
            Choose where Digital Vigital should send moderation activity such as bans, kicks, timeouts and purge actions.
          </p>
        </div>

        <div className="mb-8">
          <ChannelSelector 
            guildId={guildId}
            channels={channels}
            value={config.modLogChannelId}
            onChange={(val) => updateConfig("modLogChannelId", val)}
            allowedTypes={[0, 5]} // Text & Announcement
            placeholder="Select audit log channel..."
            specialOptions={[
              { value: "", label: "None / Disabled", description: "Moderation logging disabled" }
            ]}
          />
        </div>
      </div>

      <div className="pt-4 border-t border-white/5 flex items-center gap-2">
        {currentChannel ? (
          <>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
            <span className="text-xs font-semibold text-emerald-400">Logging to #{currentChannel.name}</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-slate-500 shrink-0"></div>
            <span className="text-xs font-semibold text-slate-400">Moderation logging disabled</span>
          </>
        )}
      </div>
    </div>
  );
}
