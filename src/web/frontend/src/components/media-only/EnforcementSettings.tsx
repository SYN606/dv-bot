import React from "react";
import Switch from "../ui/Switch";

export default function EnforcementSettings({ form, updateField }) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-white mb-1">Enforcement Settings</h3>
        <p className="text-xs text-slate-400">Configure how violations are handled and communicated.</p>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-white mb-1">Auto-Mute After 3 Violations</div>
            <div className="text-xs text-slate-400 leading-relaxed max-w-md">
              After three repeated violations within five minutes, the member receives a 60-second timeout.
            </div>
          </div>
          <div className="pt-1">
            <Switch checked={form.autoMute} onChange={(val) => updateField("autoMute", val)} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-white mb-1">Allow NSFW Channel Bypass</div>
            <div className="text-xs text-slate-400 leading-relaxed max-w-md">
              Do not enforce this media rule inside age-restricted channels.
            </div>
          </div>
          <div className="pt-1">
            <Switch checked={form.allowNsfw} onChange={(val) => updateField("allowNsfw", val)} />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-bold text-white mb-1">Post Channel Notice</div>
            <div className="text-xs text-slate-400 leading-relaxed max-w-md">
              Maintain an informational sticky notice explaining the channel's media rules.
            </div>
          </div>
          <div className="pt-1">
            <Switch checked={form.postStickyNotice} onChange={(val) => updateField("postStickyNotice", val)} />
          </div>
        </div>
      </div>
    </div>
  );
}
