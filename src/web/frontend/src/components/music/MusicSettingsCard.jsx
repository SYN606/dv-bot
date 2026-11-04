import React, { useState, useEffect } from "react";
import { Settings, Save, Shield, Disc3, Radio, Volume2 } from "lucide-react";
import { getGuildMeta } from "../../api/client";

export default function MusicSettingsCard({ guildId, settings, onSaveSettings, actionLoading }) {
  const [formData, setFormData] = useState({
    dj_role_id: "",
    dj_only: false,
    mode_247: false,
    autoplay: false,
    default_volume: 80,
    vote_skip: false,
    vote_skip_threshold: 50,
  });

  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch guild roles for DJ selection
  useEffect(() => {
    let isMounted = true;
    if (guildId) {
      setLoadingRoles(true);
      getGuildMeta(guildId)
        .then((meta) => {
          if (isMounted && meta?.roles) {
            setRoles(meta.roles);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (isMounted) setLoadingRoles(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [guildId]);

  useEffect(() => {
    if (settings) {
      setFormData({
        dj_role_id: settings.dj_role_id || "",
        dj_only: Boolean(settings.dj_only),
        mode_247: Boolean(settings.mode_247),
        autoplay: Boolean(settings.autoplay),
        default_volume: Number(settings.default_volume) || 80,
        vote_skip: Boolean(settings.vote_skip),
        vote_skip_threshold: Number(settings.vote_skip_threshold) || 50,
      });
      setHasChanges(false);
    }
  }, [settings]);

  const handleChange = (key, val) => {
    setFormData((prev) => ({ ...prev, [key]: val }));
    setHasChanges(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveSettings(formData);
    setHasChanges(false);
  };

  const selectedRole = roles.find((r) => r.id === formData.dj_role_id);

  return (
    <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Server Music Settings</h3>
            <p className="text-[11px] text-slate-400">Persistent audio configuration and DJ access control for this guild</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={!hasChanges || actionLoading}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-40 flex items-center gap-1.5"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Changes</span>
        </button>
      </div>

      {/* DJ Role & Permissions Section */}
      <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 space-y-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Disc3 className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">DJ Role & Response Restrictions</h4>
            <p className="text-[11px] text-indigo-300/80">Configure which Discord role can operate the music bot</p>
          </div>
        </div>

        {/* DJ Role Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span>Designated DJ Role</span>
            {selectedRole && (
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-300">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ backgroundColor: selectedRole.color || "#818cf8" }}
                />
                @{selectedRole.name}
              </span>
            )}
          </label>
          <select
            value={formData.dj_role_id}
            onChange={(e) => handleChange("dj_role_id", e.target.value)}
            disabled={loadingRoles || actionLoading}
            className="w-full px-3 py-2.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
          >
            <option value="">None / Disabled (Everyone in voice can request songs)</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                @{role.name}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400">
            Members with this role (plus Server Administrators & Owner) are granted full DJ permissions.
          </p>
        </div>

        {/* DJ-Only Mode Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-indigo-500/10">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-slate-200">DJ-Only Mode (Strict DJ Enforcement)</p>
              {formData.dj_only && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  ENFORCED
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              When enabled, the bot will strictly only respond to members with the DJ role (or Server Administrators). Regular members without the DJ role cannot use music commands or controls.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleChange("dj_only", !formData.dj_only)}
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ml-4 ${
              formData.dj_only ? "bg-indigo-600" : "bg-slate-800"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                formData.dj_only ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Playback & Queue Features */}
      <div className="space-y-4">
        {/* 24/7 Mode Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/40 border border-white/5">
          <div>
            <p className="text-xs font-bold text-slate-200">24/7 Continuous Mode</p>
            <p className="text-[10px] text-slate-400">Keep the bot in voice channel even when queue is empty or idle</p>
          </div>
          <button
            type="button"
            onClick={() => handleChange("mode_247", !formData.mode_247)}
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
              formData.mode_247 ? "bg-indigo-600" : "bg-slate-800"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                formData.mode_247 ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Autoplay Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/40 border border-white/5">
          <div>
            <p className="text-xs font-bold text-slate-200">Autoplay Similar Songs</p>
            <p className="text-[10px] text-slate-400">Automatically queue recommended tracks when the current queue ends</p>
          </div>
          <button
            type="button"
            onClick={() => handleChange("autoplay", !formData.autoplay)}
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
              formData.autoplay ? "bg-indigo-600" : "bg-slate-800"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                formData.autoplay ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Vote Skip Toggle & Threshold */}
        <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-200">Require Vote Skip</p>
              <p className="text-[10px] text-slate-400">Requires a percentage of voice listeners to vote before skipping (bypassed by DJs & Admins)</p>
            </div>
            <button
              type="button"
              onClick={() => handleChange("vote_skip", !formData.vote_skip)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                formData.vote_skip ? "bg-indigo-600" : "bg-slate-800"
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  formData.vote_skip ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {formData.vote_skip && (
            <div className="pt-2 border-t border-white/5">
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Vote Threshold Percentage:</span>
                <span className="font-mono font-bold text-indigo-400">{formData.vote_skip_threshold}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={formData.vote_skip_threshold}
                onChange={(e) => handleChange("vote_skip_threshold", Number(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Default Volume */}
        <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-white/5">
          <div className="flex justify-between text-xs text-slate-300 mb-1">
            <span>Default Starting Volume:</span>
            <span className="font-mono font-bold text-indigo-400">{formData.default_volume}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="150"
            value={formData.default_volume}
            onChange={(e) => handleChange("default_volume", Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>
    </form>
  );
}
