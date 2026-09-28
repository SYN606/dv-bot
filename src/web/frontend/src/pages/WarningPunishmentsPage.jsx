import React, { useEffect, useState } from "react";
import { useParams, useOutletContext } from "react-router-dom";
import { Shield, AlertTriangle, Plus, Trash2, Clock, Zap, Target } from "lucide-react";
import { getWarningPunishments, addWarningPunishment, removeWarningPunishment } from "../api/client";

const PUNISHMENT_TYPES = [
  { id: "timeout", name: "Timeout (Mute)", icon: Clock, desc: "Temporarily prevent member from chatting" },
  { id: "kick", name: "Kick", icon: Zap, desc: "Remove member from the server" },
  { id: "ban", name: "Ban", icon: Shield, desc: "Permanently ban member" },
  { id: "tempban", name: "Tempban", icon: Clock, desc: "Temporarily ban member" }
];

export default function WarningPunishmentsPage() {
  const { guildId } = useParams();
  const { showToast } = useOutletContext();
  
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [warnCount, setWarnCount] = useState(3);
  const [actionType, setActionType] = useState("timeout");
  const [duration, setDuration] = useState(3600); // 1 hour default

  useEffect(() => {
    fetchConfigs();
  }, [guildId]);

  const fetchConfigs = async () => {
    try {
      const data = await getWarningPunishments(guildId);
      if (data && data.configs) {
        setConfigs(data.configs.sort((a, b) => a.warn_count - b.warn_count));
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to load warning punishments", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!warnCount || warnCount < 1) {
      return showToast("Warning count must be at least 1", "error");
    }
    
    // Check if threshold already exists
    if (configs.find(c => c.warn_count === parseInt(warnCount))) {
      return showToast(`A punishment rule for ${warnCount} warnings already exists!`, "error");
    }

    try {
      await addWarningPunishment(guildId, {
        warnCount: parseInt(warnCount),
        actionType,
        duration: (actionType === "timeout" || actionType === "tempban") ? parseInt(duration) : null
      });
      showToast(`Added punishment rule for ${warnCount} warnings!`, "success");
      fetchConfigs();
      
      // Reset defaults
      setWarnCount(warnCount + 1);
    } catch (e) {
      showToast("Failed to add punishment rule", "error");
    }
  };

  const handleDelete = async (count) => {
    try {
      await removeWarningPunishment(guildId, count);
      showToast(`Removed punishment rule for ${count} warnings`, "success");
      fetchConfigs();
    } catch (e) {
      showToast("Failed to remove punishment rule", "error");
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "";
    const hours = Math.floor(seconds / 3600);
    const days = Math.floor(seconds / 86400);
    if (days > 0) return `${days} Days`;
    if (hours > 0) return `${hours} Hours`;
    const mins = Math.floor(seconds / 60);
    return `${mins} Minutes`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-crimson animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-crimson" />
          Auto-Punishments
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Configure automatic actions to trigger when a member reaches a specific number of warnings.
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Existing Rules */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Target className="w-4 h-4 text-crimson" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Active Thresholds</h2>
          </div>

          {configs.length === 0 ? (
            <div className="glass-card p-8 rounded-2xl border border-white/5 border-dashed text-center flex flex-col items-center justify-center">
              <Shield className="w-10 h-10 text-neutral-600 mb-3" />
              <p className="text-sm font-bold text-neutral-300">No punishments configured</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                The bot is currently just logging warnings. Add a threshold rule to start automatically punishing repeat offenders.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {configs.map((config) => {
                const pType = PUNISHMENT_TYPES.find(p => p.id === config.action_type) || PUNISHMENT_TYPES[0];
                const Icon = pType.icon;
                
                return (
                  <div key={config.warn_count} className="glass-card p-5 rounded-2xl border border-white/5 hover:border-crimson/30 transition-all group relative overflow-hidden">
                    {/* Background glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-crimson/5 blur-3xl -z-10 group-hover:bg-crimson/10 transition-colors" />
                    
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-crimson/10 border border-crimson/20 flex items-center justify-center">
                          <span className="text-lg font-black font-mono text-crimson">{config.warn_count}</span>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Warnings</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Icon className="w-3.5 h-3.5 text-white" />
                            <span className="text-sm font-bold text-white capitalize">{config.action_type}</span>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleDelete(config.warn_count)}
                        className="p-2 rounded-lg bg-white/5 text-neutral-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                        title="Remove Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {(config.action_type === 'timeout' || config.action_type === 'tempban') && (
                       <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                         <span className="text-xs text-neutral-500">Duration</span>
                         <span className="text-xs font-mono font-medium text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                           {formatDuration(config.duration)}
                         </span>
                       </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Add New Rule */}
        <div className="space-y-4">
           <div className="flex items-center gap-2 px-1">
            <Plus className="w-4 h-4 text-crimson" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Create Rule</h2>
          </div>

          <form onSubmit={handleAdd} className="glass-card p-6 rounded-2xl border border-white/5 space-y-5 relative overflow-hidden">
             {/* Glow */}
             <div className="absolute -top-20 -right-20 w-40 h-40 bg-crimson/10 blur-[80px] -z-10" />

             {/* Threshold */}
             <div className="space-y-1.5">
               <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Warning Threshold</label>
               <input
                 type="number"
                 min="1"
                 max="100"
                 value={warnCount}
                 onChange={(e) => setWarnCount(e.target.value)}
                 className="w-full bg-neutral-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-crimson focus:ring-1 focus:ring-crimson font-mono transition-all"
               />
               <p className="text-[10px] text-neutral-500">Triggered exactly on warning #</p>
             </div>

             {/* Action Type */}
             <div className="space-y-2">
               <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Punishment Action</label>
               <div className="grid grid-cols-1 gap-2">
                 {PUNISHMENT_TYPES.map((type) => {
                   const Icon = type.icon;
                   const isSelected = actionType === type.id;
                   return (
                     <button
                       type="button"
                       key={type.id}
                       onClick={() => setActionType(type.id)}
                       className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                         isSelected 
                           ? "bg-crimson/10 border-crimson/30 shadow-[0_0_15px_rgba(220,20,60,0.1)]" 
                           : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10"
                       }`}
                     >
                       <div className={`p-1.5 rounded-lg ${isSelected ? "bg-crimson/20 text-crimson" : "bg-white/10 text-neutral-400"}`}>
                         <Icon className="w-4 h-4" />
                       </div>
                       <div>
                         <div className={`text-xs font-bold ${isSelected ? "text-white" : "text-neutral-300"}`}>{type.name}</div>
                         <div className="text-[10px] text-neutral-500">{type.desc}</div>
                       </div>
                     </button>
                   )
                 })}
               </div>
             </div>

             {/* Duration (Conditionally Rendered) */}
             {(actionType === "timeout" || actionType === "tempban") && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Duration</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-neutral-900/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-crimson focus:ring-1 focus:ring-crimson transition-all"
                  >
                    <option value={300}>5 Minutes</option>
                    <option value={3600}>1 Hour</option>
                    <option value={10800}>3 Hours</option>
                    <option value={86400}>1 Day</option>
                    <option value={259200}>3 Days</option>
                    <option value={604800}>7 Days</option>
                    <option value={1209600}>14 Days</option>
                  </select>
                </div>
             )}

             <button
                type="submit"
                className="w-full py-3 bg-crimson hover:bg-crimson/90 text-white text-sm font-bold rounded-xl shadow-[0_0_20px_rgba(220,20,60,0.3)] transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Plus className="w-4 h-4" />
                Add Punishment Rule
              </button>

          </form>
        </div>

      </div>
    </div>
  );
}
