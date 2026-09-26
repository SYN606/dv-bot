import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { getGuildMeta, getAutoRoleConfig, setAutoRoleConfig } from "../api/client";
import { Award, Hash, MessageSquare, ShieldOff, Save, Mic, MessageCircle } from "lucide-react";

export default function AutoRoleRewardsPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  
  const [config, setConfig] = useState({
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
          <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              Weekly Announcement Channel
            </h2>
            <div className="space-y-1.5 max-w-md">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Target Channel
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
                  <div key={`chat-${rank}`} className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Top {rank} Chatter
                    </label>
                    <select
                      value={config[`top_chat_role_${rank}`]}
                      onChange={(e) => handleChange(`top_chat_role_${rank}`, e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">-- No Role --</option>
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
                  <div key={`vc-${rank}`} className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Top {rank} VC Member
                    </label>
                    <select
                      value={config[`top_vc_role_${rank}`]}
                      onChange={(e) => handleChange(`top_vc_role_${rank}`, e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- No Role --</option>
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
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <ShieldOff className="w-5 h-5 text-rose-400" />
              Exclusion Blacklist
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Members with these roles will be excluded from winning weekly leaderboard rewards (e.g. staff, bots).
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => toggleBlacklist(role.id)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    blacklist.includes(role.id)
                      ? "bg-rose-500/10 border-rose-500/30"
                      : "bg-slate-950/50 border-white/5 hover:border-white/10 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#94a3b8' }}
                    />
                    {blacklist.includes(role.id) && (
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider bg-rose-500/20 px-1.5 py-0.5 rounded">
                        Excluded
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-semibold truncate w-full ${blacklist.includes(role.id) ? "text-rose-200" : "text-slate-300"}`}>
                    {role.name}
                  </span>
                </button>
              ))}
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
