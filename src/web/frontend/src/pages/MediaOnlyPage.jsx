import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getGuildMeta,
  getMediaOnly,
  addMediaOnly,
  deleteMediaOnly,
} from "../api/client";
import { Image as ImageIcon, Plus, Trash2, Hash } from "lucide-react";

export default function MediaOnlyPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  const [channels, setChannels] = useState([]);
  const [activeChannels, setActiveChannels] = useState([]);
  const [formData, setFormData] = useState({
    channelId: "",
    allowNsfw: false,
    autoMute: false,
  });
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([getGuildMeta(guildId), getMediaOnly(guildId)])
      .then(([meta, mediaData]) => {
        setChannels(meta.channels || []);
        setActiveChannels(mediaData || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [guildId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.channelId) return;
    try {
      await addMediaOnly(guildId, formData);
      showToast("Media-only channel rule configured!");
      setFormData({ channelId: "", allowNsfw: false, autoMute: false });
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to configure media rule.", "error");
    }
  };

  const handleDelete = async (channelId) => {
    try {
      await deleteMediaOnly(guildId, channelId);
      showToast("Media restriction removed for channel.");
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to remove media restriction.", "error");
    }
  };

  const channelMap = new Map(channels.map((ch) => [ch.id, ch.name]));

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Media-Only Channels"]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-pink-400" />
            <span>Media-Only Channels</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Automatically purge non-media messages to keep art, photography, and showcase channels clean.
          </p>
        </div>

        {/* Add Channel Card */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
          <h3 className="font-bold text-sm text-white">Add Media-Only Channel</h3>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Select Channel
                </label>
                <select
                  value={formData.channelId}
                  onChange={(e) =>
                    setFormData({ ...formData, channelId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select text channel...</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="allowNsfw"
                  checked={formData.allowNsfw}
                  onChange={(e) =>
                    setFormData({ ...formData, allowNsfw: e.target.checked })
                  }
                  className="rounded bg-slate-900 border-white/10 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="allowNsfw" className="text-xs text-slate-300">
                  Allow NSFW Media Bypass
                </label>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="autoMute"
                  checked={formData.autoMute}
                  onChange={(e) =>
                    setFormData({ ...formData, autoMute: e.target.checked })
                  }
                  className="rounded bg-slate-900 border-white/10 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="autoMute" className="text-xs text-slate-300">
                  Auto-Mute Repeat Violators
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={!formData.channelId}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Enforce Media Rule</span>
            </button>
          </form>
        </div>

        {/* Active Enforcements */}
        <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white">Active Media Channels</h3>
            <span className="text-xs text-slate-400 font-mono">
              {activeChannels.length} Enforced
            </span>
          </div>

          {activeChannels.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">
              No media-only channels configured yet.
            </div>
          ) : (
            <div className="space-y-2">
              {activeChannels.map((item) => (
                <div
                  key={item.channel_id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                      <Hash className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-white">
                        #{channelMap.get(item.channel_id) || item.channel_id}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>NSFW Bypass: {item.allow_nsfw ? "Yes" : "No"}</span>
                        <span>•</span>
                        <span>Auto-Mute: {item.auto_mute ? "Yes" : "No"}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(item.channel_id)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
