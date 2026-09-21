import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getGuildMeta,
  getVerification,
  saveVerification,
  postVerificationButton,
} from "../api/client";
import { ShieldCheck, Send, Check } from "lucide-react";

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
            channelId: verif.channel_id || "",
            verifiedRoleId: verif.role_id || "",
            unverifiedRoleId: verif.unverified_role_id || "",
            logChannelId: verif.log_channel_id || "",
          });
        }
      })
      .catch((err) => console.error(err));
  }, [guildId]);

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
      showToast("Verification button prompt posted to channel!");
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
            Safeguard your server against raids and bots with automated 1-click button verification.
          </p>
        </div>

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

            {/* Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select role to give...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Unverified Role (Removed on Verify)
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
                      @{r.name}
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
