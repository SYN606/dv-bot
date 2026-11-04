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
    <form onSubmit={handleSubmit} className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wide">Server Audio & DJ Configuration</h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">Persistent playback parameters, volume constraints, and DJ role permissions</p>
          </div>
        </div>

        <button
          type="submit"
          disabled={!hasChanges || actionLoading}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-40 flex items-center gap-2 active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {/* DJ Role & Permissions Section */}
      <div className="p-5 sm:p-6 rounded-3xl bg-indigo-950/25 border border-indigo-500/25 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
            <Disc3 className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">DJ Role & Access Restrictions</h4>
            <p className="text-xs sm:text-sm text-indigo-300/80">Configure which Discord role can manage music playback and commands</p>
          </div>
        </div>

        {/* DJ Role Selector */}
        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-bold text-slate-300 flex items-center justify-between">
            <span>Designated DJ Role</span>
            {selectedRole && (
              <span className="flex items-center gap-2 text-xs sm:text-sm font-mono text-indigo-300">
                <span
                  className="w-3 h-3 rounded-full inline-block"
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
            className="w-full px-4 py-3 rounded-2xl bg-slate-950/90 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
          >
            <option value="">None / Disabled (Everyone in voice channel can request music)</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                @{role.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400">
            Members with this role (in addition to Server Administrators & Guild Owner) are granted full DJ permissions to skip, stop, seek, and adjust filters.
          </p>
        </div>

        {/* DJ-Only Mode Toggle */}
        <div className="flex items-center justify-between pt-3 border-t border-indigo-500/15">
          <div className="pr-4">
            <div className="flex items-center gap-2">
              <p className="text-sm sm:text-base font-bold text-slate-200">DJ-Only Mode (Strict DJ Enforcement)</p>
              {formData.dj_only && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ENFORCED
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
              When enabled, the bot strictly only responds to members holding the configured DJ role (or Server Administrators). Regular voice members without the DJ role cannot play songs or use player controls.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleChange("dj_only", !formData.dj_only)}
            className={`w-12 h-7 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ml-4 ${
              formData.dj_only ? "bg-indigo-600" : "bg-slate-800"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full bg-white transition-transform ${
                formData.dj_only ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Playback & Queue Features */}
      <div className="space-y-4">
        {/* 24/7 Mode Toggle */}
        <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-slate-950/50 border border-white/5">
          <div>
            <p className="text-sm sm:text-base font-bold text-slate-200">24/7 Continuous Mode</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Keep the bot permanently in the voice channel even when queue ends or channel is idle</p>
          </div>
          <button
            type="button"
            onClick={() => handleChange("mode_247", !formData.mode_247)}
            className={`w-12 h-7 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ml-4 ${
              formData.mode_247 ? "bg-indigo-600" : "bg-slate-800"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full bg-white transition-transform ${
                formData.mode_247 ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Autoplay Toggle */}
        <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-slate-950/50 border border-white/5">
          <div>
            <p className="text-sm sm:text-base font-bold text-slate-200">Autoplay Recommended Songs</p>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Automatically find and queue matching tracks when the current queue finishes</p>
          </div>
          <button
            type="button"
            onClick={() => handleChange("autoplay", !formData.autoplay)}
            className={`w-12 h-7 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ml-4 ${
              formData.autoplay ? "bg-indigo-600" : "bg-slate-800"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full bg-white transition-transform ${
                formData.autoplay ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Vote Skip Toggle & Threshold */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/50 border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm sm:text-base font-bold text-slate-200">Require Vote Skip</p>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">Requires a majority percentage of voice listeners to vote before skipping tracks (bypassed by DJs & Admins)</p>
            </div>
            <button
              type="button"
              onClick={() => handleChange("vote_skip", !formData.vote_skip)}
              className={`w-12 h-7 rounded-full transition-colors relative flex items-center p-0.5 shrink-0 ml-4 ${
                formData.vote_skip ? "bg-indigo-600" : "bg-slate-800"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full bg-white transition-transform ${
                  formData.vote_skip ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {formData.vote_skip && (
            <div className="pt-3 border-t border-white/5 space-y-2">
              <div className="flex justify-between text-xs sm:text-sm text-slate-300">
                <span className="font-semibold">Required Vote Percentage:</span>
                <span className="font-mono font-bold text-indigo-400">{formData.vote_skip_threshold}% of voice members</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={formData.vote_skip_threshold}
                onChange={(e) => handleChange("vote_skip_threshold", Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Default Volume */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/50 border border-white/5 space-y-2">
          <div className="flex justify-between text-xs sm:text-sm text-slate-300">
            <span className="font-semibold">Default Initial Playback Volume:</span>
            <span className="font-mono font-bold text-indigo-400">{formData.default_volume}%</span>
          </div>
          <input
            type="range"
            min="10"
            max="150"
            value={formData.default_volume}
            onChange={(e) => handleChange("default_volume", Number(e.target.value))}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
        </div>
      </div>
    </form>
  );
}
