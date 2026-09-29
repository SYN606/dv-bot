import React from "react";
import { RoleSelector, ChannelSelector } from "../discord";

export default function ClanTagReward({ guildId, roles, channels, config, onChange }) {
  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 relative  h-full flex flex-col">
      <div className="mb-6 border-b border-white/5 pb-6">
        <h2 className="text-sm font-bold text-white tracking-wider mb-2 font-mono uppercase">Clan Tag Reward</h2>
        <p className="text-sm text-slate-400">
          Reward members who use the server as their Discord clan / primary identity.
        </p>
      </div>

      <div className="space-y-6 flex-1">
        <div className="p-4 rounded-xl bg-slate-900 border border-white/5 flex items-start gap-3">
          <div className="text-[11px] text-slate-400 leading-relaxed">
            Discord clan identities are automatically detected by the bot. You do not need to configure a specific clan tag text.
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Reward Role
          </label>
          <RoleSelector 
            guildId={guildId}
            roles={roles}
            value={config.clan_role_id}
            onChange={(val) => onChange("clan_role_id", val)}
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
            value={config.clan_channel_id}
            onChange={(val) => onChange("clan_channel_id", val)}
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
            value={config.clan_message || ""}
            onChange={(e) => onChange("clan_message", e.target.value)}
            placeholder="{user.mention} is representing the clan!"
            className="w-full min-h-25 px-4 py-3 bg-slate-900/80 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none"
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
