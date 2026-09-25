import React, { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { getGuildMeta, getCommands, toggleCommand, toggleCommandModule } from "../api/client";
import {
  Terminal,
  ShieldAlert,
  ShieldCheck,
  BarChart3,
  Hash,
  Wrench,
  Volume2,
  Lock,
  Search,
  CheckCircle2,
  AlertCircle,
  Sliders,
  Layers,
  Power,
  RotateCw,
} from "lucide-react";

function getCategoryIcon(catId) {
  switch (catId?.toLowerCase()) {
    case "moderation":
      return <ShieldAlert className="w-5 h-5 text-rose-400" />;
    case "admin":
      return <ShieldCheck className="w-5 h-5 text-indigo-400" />;
    case "analytics":
      return <BarChart3 className="w-5 h-5 text-cyan-400" />;
    case "channels":
      return <Hash className="w-5 h-5 text-emerald-400" />;
    case "utility":
      return <Wrench className="w-5 h-5 text-amber-400" />;
    case "voice":
      return <Volume2 className="w-5 h-5 text-purple-400" />;
    default:
      return <Terminal className="w-5 h-5 text-slate-400" />;
  }
}

export default function CommandsPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [commandsData, setCommandsData] = useState({
    commands: [],
    disabled: [],
    modules: [],
    stats: { total: 0, active: 0, disabled: 0, protected: 0 },
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [moduleActionLoading, setModuleActionLoading] = useState(null);
  const [cmdActionLoading, setCmdActionLoading] = useState(null);

  // 1. Fetch Channels
  useEffect(() => {
    getGuildMeta(guildId)
      .then((meta) => {
        const textChannels = (meta.channels || []).filter((ch) => ch.type === 0 || ch.type === undefined);
        const channelList = textChannels.length > 0 ? textChannels : meta.channels || [];
        setChannels(channelList);
        if (channelList.length > 0) {
          setSelectedChannel(channelList[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load guild metadata:", err);
        showToast("Failed to fetch server channels.", "error");
      });
  }, [guildId]);

  // 2. Fetch Commands & Restrictions for Selected Channel
  const loadChannelCommands = (channelId) => {
    if (!channelId) return;
    setLoading(true);
    getCommands(guildId, channelId)
      .then((res) => {
        setCommandsData({
          commands: res.commands || [],
          disabled: res.disabled || [],
          modules: res.modules || [],
          stats: res.stats || {
            total: (res.commands || []).length,
            active: Math.max(0, (res.commands || []).length - (res.disabled || []).length),
            disabled: (res.disabled || []).length,
            protected: (res.commands || []).filter((c) => c.isProtected).length,
          },
        });
      })
      .catch((err) => {
        console.error("Failed to load commands:", err);
        showToast("Failed to load command restrictions.", "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedChannel) {
      loadChannelCommands(selectedChannel);
    }
  }, [guildId, selectedChannel]);

  const disabledSet = useMemo(() => {
    return new Set((commandsData.disabled || []).map((d) => String(d).toLowerCase()));
  }, [commandsData.disabled]);

  // Individual Command Toggle
  const handleToggle = async (commandName, isCurrentlyDisabled) => {
    if (!selectedChannel) return;
    const nextEnable = isCurrentlyDisabled;
    setCmdActionLoading(commandName);

    try {
      await toggleCommand(guildId, {
        channelId: selectedChannel === "global" ? null : selectedChannel,
        commandName,
        enable: nextEnable,
      });

      // Update state locally
      setCommandsData((prev) => {
        const nextDisabled = nextEnable
          ? prev.disabled.filter((d) => d.toLowerCase() !== commandName.toLowerCase())
          : [...prev.disabled, commandName.toLowerCase()];

        const updatedSet = new Set(nextDisabled.map((d) => d.toLowerCase()));

        // Recalculate modules
        const updatedModules = prev.modules.map((mod) => {
          const modCmds = mod.commands.map((c) => ({
            ...c,
            disabled: updatedSet.has(c.name.toLowerCase()),
          }));
          const disCount = modCmds.filter((c) => c.disabled).length;
          return {
            ...mod,
            commands: modCmds,
            disabledCount: disCount,
            isAllDisabled: mod.nonProtectedCount > 0 && disCount >= mod.nonProtectedCount,
          };
        });

        const activeCount = Math.max(0, prev.commands.length - nextDisabled.length);

        return {
          ...prev,
          disabled: nextDisabled,
          modules: updatedModules,
          stats: {
            ...prev.stats,
            disabled: nextDisabled.length,
            active: activeCount,
          },
        };
      });

      showToast(
        `Command /${commandName} ${nextEnable ? "enabled" : "disabled"} for #${
          channels.find((c) => c.id === selectedChannel)?.name || "channel"
        }!`
      );
    } catch (err) {
      showToast(err.message || "Failed to update command restriction.", "error");
    } finally {
      setCmdActionLoading(null);
    }
  };

  // Bulk Module Toggle
  const handleToggleModule = async (moduleId, shouldEnableAll) => {
    if (!selectedChannel) return;
    setModuleActionLoading(moduleId);

    try {
      const res = await toggleCommandModule(guildId, {
        channelId: selectedChannel === "global" ? null : selectedChannel,
        category: moduleId,
        enable: shouldEnableAll,
      });

      showToast(
        `Module '${res.category}' ${
          shouldEnableAll ? "enabled" : "disabled"
        } (${res.affectedCount} commands updated).`
      );

      // Re-sync with server state
      await loadChannelCommands(selectedChannel);
    } catch (err) {
      showToast(err.message || "Failed to update module commands.", "error");
    } finally {
      setModuleActionLoading(null);
    }
  };

  // Filtered Modules and Commands
  const filteredModules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return commandsData.modules
      .filter((mod) => {
        if (selectedCategory !== "all" && mod.id.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
        return true;
      })
      .map((mod) => {
        const matchingCommands = mod.commands.filter((cmd) => {
          if (!query) return true;
          return (
            cmd.name.toLowerCase().includes(query) ||
            (cmd.description && cmd.description.toLowerCase().includes(query))
          );
        });

        return {
          ...mod,
          matchingCommands,
        };
      })
      .filter((mod) => mod.matchingCommands.length > 0);
  }, [commandsData.modules, searchQuery, selectedCategory]);

  const selectedChannelObj = channels.find((c) => c.id === selectedChannel);

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Commands & Restrictions"]}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Terminal className="w-7 h-7" />
              </div>
              <span>Command Restrictions & Modules</span>
            </h1>
            <p className="text-sm text-slate-300 mt-1.5">
              Control command accessibility per channel. Toggle individual commands or bulk manage entire functional modules.
            </p>
          </div>

          {/* Quick Refresh */}
          <button
            onClick={() => loadChannelCommands(selectedChannel)}
            disabled={loading || !selectedChannel}
            className="self-start sm:self-auto px-4 py-2.5 rounded-xl glass-card text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-2 hover:border-indigo-500/40 transition-all cursor-pointer"
          >
            <RotateCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh State</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-white/10 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">Total Commands</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2 font-mono">
              {commandsData.stats.total}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Across 6 functional suites</p>
          </div>

          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-emerald-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-300">Active in Channel</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-2 font-mono">
              {commandsData.stats.active}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Ready for execution</p>
          </div>

          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-rose-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-300">Disabled in Channel</span>
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                <ShieldAlert className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 mt-2 font-mono">
              {commandsData.stats.disabled}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Blocked from standard users</p>
          </div>

          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-amber-500/20 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-300">Protected Core</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-2 font-mono">
              {commandsData.stats.protected}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Safe guard core commands</p>
          </div>
        </div>

        {/* Channel Selector Bar */}
        <div className="glass-card p-5 sm:p-6 rounded-3xl border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <label htmlFor="channel-select" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Active Target Channel
              </label>
              <p className="text-xs text-slate-400">
                Restrictions are applied specifically to the selected channel.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              id="channel-select"
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="w-full md:w-80 px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-sm font-medium text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
            >
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id} className="bg-slate-900 text-white">
                  #{ch.name}
                </option>
              ))}
              <option value="global" className="bg-slate-900 text-white font-bold">
                🌐 Server-Wide (Global)
              </option>
            </select>
          </div>
        </div>

        {/* Search & Module Filters */}
        <div className="glass-card p-4 sm:p-5 rounded-3xl border border-white/10 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search commands by name or description (e.g., ping, timeout, purge)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Clear button if searching */}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="px-3 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Module Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                  : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-white/5"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>All Modules</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 font-mono">
                {commandsData.commands.length}
              </span>
            </button>

            {commandsData.modules.map((mod) => {
              const isSelected = selectedCategory.toLowerCase() === mod.id.toLowerCase();
              return (
                <button
                  key={mod.id}
                  onClick={() => setSelectedCategory(mod.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
                      : "bg-slate-900/80 text-slate-300 hover:bg-slate-800 border border-white/5"
                  }`}
                >
                  <span>{mod.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 font-mono">
                    {mod.total}
                  </span>
                  {mod.disabledCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono">
                      {mod.disabledCount} blocked
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modules List with Commands Grid */}
        {loading ? (
          <div className="glass-card p-12 rounded-3xl border border-white/10 text-center space-y-3">
            <RotateCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-200">Loading command permissions...</p>
          </div>
        ) : filteredModules.length === 0 ? (
          <div className="glass-card p-12 rounded-3xl border border-white/10 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <h3 className="text-base font-bold text-white">No commands match your filter</h3>
            <p className="text-xs text-slate-400">
              Try adjusting your search keywords or switching module tabs.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-xs font-semibold text-white hover:bg-indigo-500 mt-2"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredModules.map((mod) => {
              const isModuleBusy = moduleActionLoading === mod.id;
              const hasDisabledInModule = mod.disabledCount > 0;
              const isAllModuleDisabled = mod.isAllDisabled;

              return (
                <div
                  key={mod.id}
                  className="glass-card rounded-3xl border border-white/10 overflow-hidden shadow-xl"
                >
                  {/* Module Header & Bulk Actions */}
                  <div className="p-5 sm:p-6 bg-slate-900/90 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="p-3 rounded-2xl bg-white/5 border border-white/10 shrink-0">
                        {getCategoryIcon(mod.id)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-lg font-extrabold text-white tracking-tight">
                            {mod.name} Module
                          </h2>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
                            {mod.matchingCommands.length} command{mod.matchingCommands.length === 1 ? "" : "s"}
                          </span>
                          {hasDisabledInModule ? (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
                              {mod.disabledCount} Disabled
                            </span>
                          ) : (
                            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                              All Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          {mod.description}
                        </p>
                      </div>
                    </div>

                    {/* Module Bulk Action Button */}
                    <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
                      {mod.canDisable ? (
                        <button
                          onClick={() => handleToggleModule(mod.id, isAllModuleDisabled)}
                          disabled={isModuleBusy}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                            isAllModuleDisabled
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30"
                              : "bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30"
                          } ${isModuleBusy ? "opacity-50 cursor-not-allowed" : ""}`}
                          title={
                            isAllModuleDisabled
                              ? `Enable all non-protected commands in ${mod.name}`
                              : `Disable all non-protected commands in ${mod.name}`
                          }
                        >
                          <Power className={`w-3.5 h-3.5 ${isModuleBusy ? "animate-spin" : ""}`} />
                          <span>
                            {isModuleBusy
                              ? "Updating Module..."
                              : isAllModuleDisabled
                              ? `Enable All ${mod.name}`
                              : `Disable All ${mod.name}`}
                          </span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Safeguarded Module</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Commands Grid */}
                  <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {mod.matchingCommands.map((cmd) => {
                      const isDisabled = disabledSet.has(cmd.name.toLowerCase());
                      const isProtected = cmd.isProtected;
                      const isPending = cmdActionLoading === cmd.name;

                      return (
                        <div
                          key={cmd.name}
                          className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                            isDisabled
                              ? "bg-rose-950/20 border-rose-500/30 shadow-inner"
                              : "bg-slate-900/60 border-white/10 hover:border-white/20"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono font-bold text-sm tracking-wide ${
                                  isDisabled ? "text-rose-200 line-through decoration-rose-500/50" : "text-white"
                                }`}
                              >
                                /{cmd.name}
                              </span>

                              {isProtected && (
                                <span
                                  className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  title="Protected Core Safeguard Command (Cannot be disabled)"
                                >
                                  <Lock className="w-3 h-3" />
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                              {cmd.description || "No description provided."}
                            </p>
                          </div>

                          {/* Individual Toggle Control */}
                          <div className="shrink-0">
                            {isProtected ? (
                              <span className="text-[11px] font-semibold text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl flex items-center gap-1">
                                <Lock className="w-3 h-3 text-amber-400" />
                                <span>Locked</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleToggle(cmd.name, isDisabled)}
                                disabled={isPending || isModuleBusy}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                                  isDisabled
                                    ? "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30"
                                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
                                } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
                                title={isDisabled ? `Click to enable /${cmd.name}` : `Click to disable /${cmd.name}`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isDisabled ? "bg-rose-400" : "bg-emerald-400 animate-pulse"
                                  }`}
                                />
                                <span>{isPending ? "Saving..." : isDisabled ? "Disabled" : "Active"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
