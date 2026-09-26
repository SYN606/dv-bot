import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { getGuildMeta, getAutoRoleConfig, setAutoRoleConfig } from "../api/client";
import { Award, Hash, MessageSquare, ShieldOff, Save, Mic, MessageCircle, Search } from "lucide-react";

export default function AutoRoleRewardsPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  
  const [config, setConfig] = useState({
    enabled: 0,
    announcement_channel_id: "",
    top_chat_role_1: "",
    top_chat_role_2: "",
    top_chat_role_3: "",
    top_vc_role_1: "",
    top_vc_role_2: "",
    top_vc_role_3: "",
  });
  
  const [blacklist, setBlacklist] = useState([]);
  
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const filteredRoles = roles.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const rankMedals = { 1: "🥇", 2: "🥈", 3: "🥉" };
  const rankLabels = { 1: "1st Place", 2: "2nd Place", 3: "3rd Place" };

  useEffect(() => {
    async function load() {
      try {
        const [meta, data] = await Promise.all([
          getGuildMeta(guildId),
          getAutoRoleConfig(guildId)
        ]);
        setChannels(meta.channels || []);
        setRoles(meta.roles || []);
        
        if (data && data.config) {
          setConfig(data.config);
        }
        if (data && data.blacklist) {
          setBlacklist(data.blacklist);
        }
      } catch (err) {
        showToast("Failed to load Auto-Role configuration.", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [guildId]);

  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const toggleBlacklist = (roleId) => {
    setBlacklist(prev => 
      prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const originalBlacklist = await getAutoRoleConfig(guildId).then(d => d.blacklist || []);
      const toAdd = blacklist.filter(id => !originalBlacklist.includes(id));
      const toRemove = originalBlacklist.filter(id => !blacklist.includes(id));
      
      await setAutoRoleConfig(guildId, {
        config,
        blacklist_add: toAdd,
        blacklist_remove: toRemove
      });
      showToast("Auto-Role Rewards configuration saved!", "success");
    } catch (err) {
      showToast(err.message || "Failed to save configuration.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout user={user} botInfo={botInfo} breadcrumbs={["Auto-Role Rewards"]}>
      <div className="space-y-6 max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-fuchsia-600/30 to-purple-600/30 border border-fuchsia-500/20 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.2)]">
                <Award className="w-6 h-6" />
              </div>
              <span>Leaderboard Auto-Roles</span>
            </h1>
            <p className="text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Automatically assign reward roles to the top 3 weekly active members in text chat and voice channels.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          
          {/* Global Announcement Config */}
          <div className={`border rounded-3xl p-6 transition-colors ${config.enabled ? 'bg-slate-900/50 border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.05)]' : 'bg-slate-900/30 border-white/10 opacity-75'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                Module Configuration
              </h2>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-semibold ${config.enabled ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {config.enabled ? 'Module Active' : 'Module Disabled'}
                </span>
                <button
                  onClick={() => handleChange('enabled', config.enabled ? 0 : 1)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    config.enabled ? 'bg-indigo-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            
            <div className="space-y-1.5 max-w-md">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Announcement Channel
              </label>
              <select
                value={config.announcement_channel_id}
                onChange={(e) => handleChange("announcement_channel_id", e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="">-- Do not announce --</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>#{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Text Chat Rewards */}
            <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                <MessageCircle className="w-5 h-5 text-emerald-400" />
                Text Chat Rewards
              </h2>
              
              <div className="space-y-4">
                {[1, 2, 3].map((rank) => (
                  <div key={`chat-${rank}`} className="space-y-1.5 bg-slate-950/30 p-3 rounded-2xl border border-white/5">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <span className="text-lg">{rankMedals[rank]}</span>
                      {rankLabels[rank]} (Text)
                    </label>
                    <select
                      value={config[`top_chat_role_${rank}`]}
                      onChange={(e) => handleChange(`top_chat_role_${rank}`, e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors hover:border-white/20"
                    >
                      <option value="">-- No Role Assigned --</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* VC Rewards */}
            <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
                <Mic className="w-5 h-5 text-amber-400" />
                Voice Chat Rewards
              </h2>
              
              <div className="space-y-4">
                {[1, 2, 3].map((rank) => (
                  <div key={`vc-${rank}`} className="space-y-1.5 bg-slate-950/30 p-3 rounded-2xl border border-white/5">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <span className="text-lg">{rankMedals[rank]}</span>
                      {rankLabels[rank]} (Voice)
                    </label>
                    <select
                      value={config[`top_vc_role_${rank}`]}
                      onChange={(e) => handleChange(`top_vc_role_${rank}`, e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors hover:border-white/20"
                    >
                      <option value="">-- No Role Assigned --</option>
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Blacklist Configuration */}
          <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                  <ShieldOff className="w-5 h-5 text-rose-400" />
                  Exclusion Blacklist
                </h2>
                <p className="text-sm text-slate-400">
                  Members with these roles will be excluded from winning rewards (e.g. staff, bots).
                </p>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-rose-500 w-full sm:w-64"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredRoles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => toggleBlacklist(role.id)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all group ${
                    blacklist.includes(role.id)
                      ? "bg-rose-500/10 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)]"
                      : "bg-slate-950/50 border-white/5 hover:border-white/20 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div 
                      className="w-3.5 h-3.5 rounded-full ring-2 ring-slate-900" 
                      style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#94a3b8' }}
                    />
                    {blacklist.includes(role.id) && (
                      <span className="text-[10px] font-bold text-rose-300 uppercase tracking-wider bg-rose-500/20 px-1.5 py-0.5 rounded shadow-sm">
                        Excluded
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-semibold truncate w-full ${blacklist.includes(role.id) ? "text-rose-200" : "text-slate-300 group-hover:text-white"}`}>
                    {role.name}
                  </span>
                </button>
              ))}
              
              {filteredRoles.length === 0 && (
                <div className="col-span-full py-8 text-center text-slate-400 text-sm">
                  No roles match your search.
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              disabled={loading || saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Configuration"}
            </button>
          </div>
          
        </div>
      </div>
    </DashboardLayout>
  );
}
