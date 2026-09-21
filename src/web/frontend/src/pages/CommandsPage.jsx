import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { getGuildMeta, getCommands, toggleCommand } from "../api/client";
import { Terminal, Shield, Lock } from "lucide-react";

export default function CommandsPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [commands, setCommands] = useState([]);
  const [disabledMap, setDisabledMap] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGuildMeta(guildId)
      .then((meta) => {
        setChannels(meta.channels || []);
        if (meta.channels && meta.channels.length > 0) {
          setSelectedChannel(meta.channels[0].id);
        }
      })
      .catch((err) => console.error(err));
  }, [guildId]);

  useEffect(() => {
    if (!selectedChannel) return;
    getCommands(guildId)
      .then((res) => {
        setCommands(res.commands || []);
        const disabled = res.disabled || [];
        const map = new Map();
        disabled
          .filter((d) => d.channel_id === selectedChannel)
          .forEach((d) => map.set(d.command_name, true));
        setDisabledMap(map);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [guildId, selectedChannel]);

  const handleToggle = async (commandName, isCurrentlyDisabled) => {
    const nextDisabled = !isCurrentlyDisabled;
    try {
      await toggleCommand(guildId, {
        channelId: selectedChannel,
        commandName,
        disabled: nextDisabled,
      });
      const updated = new Map(disabledMap);
      if (nextDisabled) {
        updated.set(commandName, true);
      } else {
        updated.delete(commandName);
      }
      setDisabledMap(updated);
      showToast(
        `Command /${commandName} ${nextDisabled ? "disabled" : "enabled"} for channel!`
      );
    } catch (err) {
      showToast(err.message || "Failed to update command state.", "error");
    }
  };

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Command Restrictions"]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Terminal className="w-6 h-6 text-amber-400" />
            <span>Command Restrictions</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Control which slash commands can be executed in specific text channels.
          </p>
        </div>

        {/* Channel Selector */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
          <label className="block text-xs font-semibold text-slate-300">
            Select Channel to Configure
          </label>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="w-full sm:w-80 px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                #{ch.name}
              </option>
            ))}
          </select>
        </div>

        {/* Commands List */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Application Commands</h3>
            <span className="text-xs text-slate-400 font-mono">
              {commands.length} Commands Available
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {commands.map((cmd) => {
              const isDisabled = disabledMap.has(cmd.name);
              const isProtected = cmd.protected;

              return (
                <div
                  key={cmd.name}
                  className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                    isDisabled
                      ? "bg-rose-950/20 border-rose-500/20"
                      : "bg-slate-900/60 border-white/5"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-white">
                        /{cmd.name}
                      </span>
                      {isProtected && (
                        <span
                          className="p-1 rounded bg-indigo-500/10 text-indigo-400"
                          title="Protected System Command"
                        >
                          <Lock className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {cmd.description || "No description provided."}
                    </p>
                  </div>

                  <div>
                    {isProtected ? (
                      <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                        Protected
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggle(cmd.name, isDisabled)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          isDisabled
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        }`}
                      >
                        {isDisabled ? "Disabled" : "Enabled"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
