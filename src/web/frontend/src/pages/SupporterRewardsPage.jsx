import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { getGuildMeta, getSupporterConfig, setSupporterConfig } from "../api/client";
import { Trophy, MessageSquare, Megaphone, Hash, Tag, Save, Power } from "lucide-react";

export default function SupporterRewardsPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  
  const [config, setConfig] = useState({
    enabled: false,
    vanity_text: "",
    vanity_role_id: "",
    vanity_channel_id: "",
    vanity_message: "",
    clan_role_id: "",
    clan_channel_id: "",
    clan_message: ""
  });
  
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [meta, conf] = await Promise.all([
          getGuildMeta(guildId),
          getSupporterConfig(guildId)
        ]);
        setChannels(meta.channels || []);
        setRoles(meta.roles || []);
        
        if (conf) {
          setConfig(conf);
        }
      } catch (err) {
        showToast("Failed to load supporter configuration.", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [guildId]);

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await setSupporterConfig(guildId, config);
      showToast("Supporter Rewards configuration saved!", "success");
    } catch (err) {
      showToast(err.message || "Failed to save configuration.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout user={user} botInfo={botInfo} breadcrumbs={["Supporter Rewards"]}>
      <div className="space-y-6 max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-yellow-600/30 to-amber-600/30 border border-yellow-500/20 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                <Trophy className="w-6 h-6" />
              </div>
              <span>Supporter Rewards</span>
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Reward members who represent your server by adding your Vanity URL to their Discord status, or by equipping your Clan Tag!
            </p>
          </div>

          <button
            onClick={() => handleChange("enabled", !config.enabled)}
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none ${
              config.enabled ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-slate-700"
            }`}
          >
            <span className="sr-only">Toggle Module</span>
            <span
              className={`pointer-events-none absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white transition-transform ${
                config.enabled ? "translate-x-6" : "translate-x-0"
              }`}
            >
              <Power className={`w-3.5 h-3.5 ${config.enabled ? "text-emerald-500" : "text-slate-400"}`} />
            </span>
          </button>
        </div>

        <div className={`space-y-6 transition-all duration-300 ${!config.enabled ? 'opacity-50 pointer-events-none saturate-0' : ''}`}>
          
          {/* Custom Status Vanity Card */}
          <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <Megaphone className="w-5 h-5 text-indigo-400" />
              Custom Status Vanity
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Vanity Phrase
                </label>
                <input
                  type="text"
                  placeholder="e.g. gg/myserver"
                  value={config.vanity_text}
                  onChange={(e) => handleChange("vanity_text", e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Reward Role
                </label>
                <select
                  value={config.vanity_role_id}
                  onChange={(e) => handleChange("vanity_role_id", e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Do not assign a role --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5 mb-6">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Announcement Channel
              </label>
              <select
                value={config.vanity_channel_id}
                onChange={(e) => handleChange("vanity_channel_id", e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- No Announcement Channel --</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                Announcement Message
              </label>
              <textarea
                placeholder="Thanks {user.mention} for representing us with our vanity in your status!"
                value={config.vanity_message}
                onChange={(e) => handleChange("vanity_message", e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
              />
              <p className="text-xs text-slate-500 mt-2">Available variables: <code className="text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded">{'{user.mention}'}</code></p>
            </div>
          </div>

          {/* Clan Tag Config Card */}
          <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <Tag className="w-5 h-5 text-emerald-400" />
              Guild Clan Tag
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Automatically assign a role when a user sets your server as their Primary Identity/Clan in Discord.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Reward Role
                </label>
                <select
                  value={config.clan_role_id}
                  onChange={(e) => handleChange("clan_role_id", e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- Do not assign a role --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  Announcement Channel
                </label>
                <select
                  value={config.clan_channel_id}
                  onChange={(e) => handleChange("clan_channel_id", e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="">-- No Announcement Channel --</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>#{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                Announcement Message
              </label>
              <textarea
                placeholder="{user.mention} is now repping our Clan Tag!"
                value={config.clan_message}
                onChange={(e) => handleChange("clan_message", e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}
