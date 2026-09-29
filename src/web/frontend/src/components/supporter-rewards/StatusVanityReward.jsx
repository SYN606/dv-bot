import React from "react";
import { RoleSelector, ChannelSelector } from "../discord";

export default function StatusVanityReward({ guildId, roles, channels, config, onChange }) {
  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 relative overflow-hidden h-full flex flex-col">
      <div className="mb-6 border-b border-white/5 pb-6">
        <h2 className="text-sm font-bold text-white tracking-wider mb-2 font-mono uppercase">Status Vanity Reward</h2>
        <p className="text-sm text-slate-400">
          Reward members who include your configured phrase in their Discord status.
        </p>
      </div>

      <div className="space-y-6 flex-1">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Required Phrase
          </label>
          <input
            type="text"
            value={config.vanity_text || ""}
            onChange={(e) => onChange("vanity_text", e.target.value)}
            placeholder="e.g. gg/myserver"
            className="w-full px-4 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <p className="text-[10px] text-slate-500 mt-1.5">
            The exact text the bot will look for in a member's custom status.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Reward Role
          </label>
          <RoleSelector 
            guildId={guildId}
            roles={roles}
            value={config.vanity_role_id}
            onChange={(val) => onChange("vanity_role_id", val)}
            specialOptions={[{ value: "", label: "No reward role" }]}
            placeholder="Select a role..."
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Announcement Channel
          </label>
          <ChannelSelector 
            guildId={guildId}
            channels={channels}
            value={config.vanity_channel_id}
            onChange={(val) => onChange("vanity_channel_id", val)}
            allowedTypes={["text"]}
            specialOptions={[{ value: "", label: "No announcement channel" }]}
            placeholder="Select a channel..."
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Announcement Message
          </label>
          <textarea
            value={config.vanity_message || ""}
            onChange={(e) => onChange("vanity_message", e.target.value)}
            placeholder="Thanks {user.mention} for representing the server!"
            className="w-full min-h-[100px] px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
          <p className="text-[10px] text-slate-500 mt-1.5 flex items-center gap-1.5">
            <span className="font-mono bg-white/5 px-1 rounded text-slate-400">{`{user.mention}`}</span> 
            mentions the rewarded member.
          </p>
        </div>
      </div>
    </div>
  );
}
