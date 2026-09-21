import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getGuildMeta,
  getVerification,
  saveVerification,
  postVerificationButton,
} from "../api/client";
import { ShieldCheck, Send, Check, AlertTriangle, KeyRound, Clock, Sliders } from "lucide-react";

export default function VerificationPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [config, setConfig] = useState({
    enabled: false,
    channelId: "",
    verifiedRoleId: "",
    unverifiedRoleId: "",
    logChannelId: "",
    mode: "button",
    minAccountAgeHours: 0,
    embedTitle: "",
    embedDescription: "",
    buttonLabel: "Verify Access",
    buttonEmoji: "✅",
  });
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    Promise.all([getGuildMeta(guildId), getVerification(guildId)])
      .then(([meta, verif]) => {
        setChannels(meta.channels || []);
        setRoles(meta.roles || []);
        if (verif) {
          setConfig({
            enabled: Boolean(verif.enabled),
            channelId: verif.channelId || verif.verify_channel_id || "",
            verifiedRoleId: verif.verifiedRoleId || verif.verified_role_id || "",
            unverifiedRoleId: verif.unverifiedRoleId || verif.unverified_role_id || "",
            logChannelId: verif.logChannelId || verif.log_channel_id || "",
            mode: verif.mode || "button",
            minAccountAgeHours: verif.minAccountAgeHours || verif.min_account_age_hours || 0,
            embedTitle: verif.embedTitle || verif.embed_title || "",
            embedDescription: verif.embedDescription || verif.embed_description || "",
            buttonLabel: verif.buttonLabel || verif.button_label || "Verify Access",
            buttonEmoji: verif.buttonEmoji || verif.button_emoji || "✅",
          });
        }
      })
      .catch((err) => console.error(err));
  }, [guildId]);

  const selectedRole = roles.find((r) => r.id === config.verifiedRoleId);
  const isHierarchyError = selectedRole?.isAboveBot;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveVerification(guildId, config);
      showToast("Verification gate settings saved successfully!");
    } catch (err) {
      showToast(err.message || "Failed to save verification settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePostButton = async () => {
    if (!config.channelId) {
      showToast("Please select a verification channel first.", "error");
      return;
    }
    setPosting(true);
    try {
      await postVerificationButton(guildId);
      showToast("Verification prompt posted to channel!");
    } catch (err) {
      showToast(err.message || "Failed to post verification prompt.", "error");
    } finally {
      setPosting(false);
    }
  };

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Verification Gate"]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>Verification Gate</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Safeguard your server against raids and bots with automated 1-click or captcha challenge verification.
          </p>
        </div>

        {isHierarchyError && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200">
              <p className="font-bold text-amber-300">Bot Role Hierarchy Warning</p>
              <p className="mt-0.5">
                The role <strong>@{selectedRole?.name}</strong> is positioned higher than (or equal to) the bot's role.
                Discord will reject assigning this role to users. Please open <strong>Discord Server Settings &gt; Roles</strong> and drag the bot's role above @{selectedRole?.name}.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-6">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between pb-6 border-b border-white/5">
              <div>
                <h3 className="font-bold text-sm text-white">Enable Verification Gate</h3>
                <p className="text-xs text-slate-400">
                  When enabled, incoming members must verify before accessing server channels.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) =>
                    setConfig({ ...config, enabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Verification Mode & Anti-Raid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-white/5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Challenge Mode</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, mode: "button" })}
                    className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all text-center ${
                      config.mode === "button"
                        ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/40 shadow-sm"
                        : "bg-slate-900/60 text-slate-400 border-white/5 hover:border-white/10"
                    }`}
                  >
                    1-Click Instant
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, mode: "captcha" })}
                    className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all text-center ${
                      config.mode === "captcha"
                        ? "bg-purple-600/20 text-purple-300 border-purple-500/40 shadow-sm"
                        : "bg-slate-900/60 text-slate-400 border-white/5 hover:border-white/10"
                    }`}
                  >
                    Captcha Modal
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {config.mode === "captcha"
                    ? "Displays a Discord popup modal with a randomized code to thwart automated token raids."
                    : "Instant verification with one button click."}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Minimum Account Age (Quarantine)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="720"
                    value={config.minAccountAgeHours}
                    onChange={(e) =>
                      setConfig({ ...config, minAccountAgeHours: Number(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="0 (Disabled)"
                  />
                  <span className="text-xs text-slate-400 whitespace-nowrap">hours old</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Block accounts newer than this from verifying (e.g. 24h prevents raid burners).
                </p>
              </div>
            </div>

            {/* Channel & Role Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-white/5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Verification Channel
                </label>
                <select
                  value={config.channelId}
                  onChange={(e) =>
                    setConfig({ ...config, channelId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select a channel...</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Verified Member Role (Granted)
                </label>
                <select
                  value={config.verifiedRoleId}
                  onChange={(e) =>
                    setConfig({ ...config, verifiedRoleId: e.target.value })
                  }
                  className={`w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border text-xs text-white focus:outline-none ${
                    isHierarchyError
                      ? "border-amber-500/60 text-amber-200"
                      : "border-white/10 focus:border-indigo-500"
                  }`}
                >
                  <option value="">Select role to give...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name} {r.isAboveBot ? "(⚠️ Above Bot)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Unverified Role (Assigned on join, removed on verify)
                </label>
                <select
                  value={config.unverifiedRoleId}
                  onChange={(e) =>
                    setConfig({ ...config, unverifiedRoleId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">None (Optional)</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name} {r.isAboveBot ? "(⚠️ Above Bot)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Verification Logs Channel
                </label>
                <select
                  value={config.logChannelId}
                  onChange={(e) =>
                    setConfig({ ...config, logChannelId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">None (Optional)</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Embed & Button Options */}
            <div className="space-y-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Custom Message & Button Appearance</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Embed Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={config.embedTitle}
                    onChange={(e) => setConfig({ ...config, embedTitle: e.target.value })}
                    placeholder="Server Verification"
                    className="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Button Label
                    </label>
                    <input
                      type="text"
                      value={config.buttonLabel}
                      onChange={(e) => setConfig({ ...config, buttonLabel: e.target.value })}
                      placeholder="Verify Access"
                      className="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Button Emoji
                    </label>
                    <input
                      type="text"
                      value={config.buttonEmoji}
                      onChange={(e) => setConfig({ ...config, buttonEmoji: e.target.value })}
                      placeholder="✅"
                      className="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Embed Description & Rules Markdown (Optional)
                </label>
                <textarea
                  rows="3"
                  value={config.embedDescription}
                  onChange={(e) => setConfig({ ...config, embedDescription: e.target.value })}
                  placeholder="Welcome to the server! Click the button below to verify and unlock channels."
                  className="w-full px-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-y"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={handlePostButton}
                disabled={posting || !config.channelId}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{posting ? "Posting..." : "Send Verification Prompt to Channel"}</span>
              </button>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save Settings"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
