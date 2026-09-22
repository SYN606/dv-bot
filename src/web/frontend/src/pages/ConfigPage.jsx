import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import { getGuildMeta, getConfig, saveConfig } from "../api/client";
import { Sliders, Check, ShieldAlert } from "lucide-react";

export default function ConfigPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [config, setConfig] = useState({
    modLogChannelId: "",
    vcRoleId: "",
    tempbanRoleId: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getGuildMeta(guildId), getConfig(guildId)])
      .then(([meta, serverConfig]) => {
        setChannels(meta.channels || []);
        setRoles(meta.roles || []);
        if (serverConfig) {
          setConfig({
            modLogChannelId: serverConfig.modLogChannelId || "",
            vcRoleId: serverConfig.vcRoleId || "",
            tempbanRoleId: serverConfig.tempbanRoleId || "",
          });
        }
      })
      .catch((err) => console.error(err));
  }, [guildId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveConfig(guildId, config);
      showToast("Server configurations saved successfully!");
    } catch (err) {
      showToast(err.message || "Failed to save configuration.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Roles & Audit Logs"]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-blue-400" />
            <span>Roles & Audit Logs</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure moderation audit log channels, automatic voice roles, and tempban isolation roles.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Moderation Audit Log Channel
                </label>
                <select
                  value={config.modLogChannelId}
                  onChange={(e) =>
                    setConfig({ ...config, modLogChannelId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Disabled / None</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Bot will post kick, ban, timeout, and purge moderation logs to this channel.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Active Voice Channel Dynamic Role
                </label>
                <select
                  value={config.vcRoleId}
                  onChange={(e) =>
                    setConfig({ ...config, vcRoleId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Disabled / None</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Automatically granted when a member enters voice and removed when they leave.
                </p>
              </div>

              <div className="col-span-1 sm:col-span-2 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <label className="block text-xs font-semibold text-slate-200">
                    Tempban Isolation Role
                  </label>
                </div>
                <select
                  value={config.tempbanRoleId}
                  onChange={(e) =>
                    setConfig({ ...config, tempbanRoleId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Disabled / Native Server Ban</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2.5 text-[11px] text-slate-400 space-y-1.5 bg-slate-950/40 p-3.5 rounded-xl border border-white/5">
                  <p>
                    • <strong className="text-slate-300">When role is selected:</strong> Executing <code className="text-indigo-300 bg-white/5 px-1 rounded">/tempban add</code> or <code className="text-indigo-300 bg-white/5 px-1 rounded">ts tempban</code> will isolate the user by giving them this role and stripping their verified role (instead of banning them from the server). When the timer expires, the isolation role is removed and verified status is restored automatically.
                  </p>
                  <p>
                    • <strong className="text-slate-300">When disabled:</strong> Tempbans will execute native Discord server bans and automatically unban when the duration expires.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-end">
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
