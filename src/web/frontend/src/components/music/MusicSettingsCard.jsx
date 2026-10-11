import React, { useState, useEffect } from "react";
import { Settings, Save, Shield, Volume2, Radio, Check } from "lucide-react";

export default function MusicSettingsCard({ settings, onSaveSettings, actionLoading }) {
  const [formData, setFormData] = useState({
    mode_247: false,
    autoplay: false,
    default_volume: 80,
    vote_skip: false,
    vote_skip_threshold: 50,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
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

  return (
    <form onSubmit={handleSubmit} className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Server Music Settings</h3>
            <p className="text-[11px] text-slate-400">Persistent audio configuration for this guild</p>
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
              <p className="text-[10px] text-slate-400">Requires a percentage of voice listeners to vote before skipping</p>
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
