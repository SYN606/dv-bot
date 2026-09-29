import React, { useState } from "react";
import { ChannelSelector, RoleSelector } from "../discord";
import ContentModeSelector from "./ContentModeSelector";
import EnforcementSettings from "./EnforcementSettings";
import { Plus, Loader2 } from "lucide-react";

const DEFAULT_FORM = {
  channelId: "",
  imageOnly: false,
  whitelistRoleId: "",
  allowNsfw: true,
  autoMute: true,
  postStickyNotice: true,
};

export default function MediaRuleEditor({ guildId, channels, roles, activeRules, onCreate, isCreating }) {
  const [form, setForm] = useState(DEFAULT_FORM);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.channelId) return;
    const success = await onCreate(form);
    if (success) {
      setForm(DEFAULT_FORM);
    }
  };

  const activeChannelIds = activeRules.map(r => r.channel_id);
  const availableChannels = channels.filter(c => !activeChannelIds.includes(c.id));

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 mb-8">
      <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-6">Create Media Rule</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-white">Channel</h3>
            <p className="text-[11px] text-slate-400">Select the channel where media restrictions should apply.</p>
          </div>
          <ChannelSelector 
            guildId={guildId}
            channels={channels} // Pass all channels, but filter out active ones via exclude/filtered approach
            value={form.channelId}
            onChange={(val) => updateField("channelId", val)}
            allowedTypes={[0, 5]}
            placeholder="Select a channel"
          />
        </div>

        <div>
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-white">Bypass Role</h3>
            <p className="text-[11px] text-slate-400">Members with this role are exempt from this media rule.</p>
          </div>
          <RoleSelector 
            roles={roles}
            value={form.whitelistRoleId}
            onChange={(val) => updateField("whitelistRoleId", val)}
            placeholder="Select bypass role"
            specialOptions={[
              { value: "", label: "None", description: "No bypass role" }
            ]}
          />
        </div>
      </div>

      <ContentModeSelector 
        imageOnly={form.imageOnly} 
        onChange={(val) => updateField("imageOnly", val)} 
      />

      <EnforcementSettings 
        form={form} 
        updateField={updateField} 
      />

      <div className="pt-6 border-t border-white/5 flex justify-end">
        <button
          onClick={handleCreate}
          disabled={!form.channelId || isCreating}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Rule...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Create Media Rule
            </>
          )}
        </button>
      </div>
    </div>
  );
}
