import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getGuildMeta,
  getMediaOnly,
  addMediaOnly,
  deleteMediaOnly,
} from "../api/client";
import {
  Image as ImageIcon,
  Film,
  Plus,
  Trash2,
  Hash,
  ShieldCheck,
  Pin,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export default function MediaOnlyPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [activeChannels, setActiveChannels] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    channelId: "",
    imageOnly: false,
    whitelistRoleId: "",
    allowNsfw: true,
    autoMute: true,
    postStickyNotice: true,
  });
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([getGuildMeta(guildId), getMediaOnly(guildId)])
      .then(([meta, mediaData]) => {
        setChannels(meta.channels || []);
        setRoles(meta.roles || []);
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
    if (!formData.channelId) {
      showToast("Please select a channel to enforce.", "error");
      return;
    }

    setSubmitting(true);
    try {
      await addMediaOnly(guildId, {
        channel_id: formData.channelId,
        image_only: formData.imageOnly,
        whitelist_role_id: formData.whitelistRoleId || null,
        nsfw_bypass: formData.allowNsfw,
        auto_mute: formData.autoMute,
        post_sticky_notice: formData.postStickyNotice,
      });

      showToast("Media-only channel rule configured gracefully!");
      setFormData({
        channelId: "",
        imageOnly: false,
        whitelistRoleId: "",
        allowNsfw: true,
        autoMute: true,
        postStickyNotice: true,
      });
      loadData();
    } catch (err) {
      showToast(err.message || "Failed to configure media rule.", "error");
    } finally {
      setSubmitting(false);
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
  const roleMap = new Map(roles.map((r) => [r.id, r.name]));

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Media-Only Channels"]}
    >
      <div className="space-y-8 max-w-6xl mx-auto pb-12">
        {/* Header Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-pink-600/30 to-purple-600/30 border border-pink-500/20 text-pink-400">
              <ImageIcon className="w-6 h-6" />
            </div>
            <span>Media-Only Channels</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
            Automatically purge non-media messages to keep art, photography, meme, and video channels pristine. Features 3-strike escalation, whitelist bypass, and automated sticky notices.
          </p>
        </div>

        {/* Add Channel Configuration Card */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-3 pb-6 border-b border-white/5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Configure Media Channel</h3>
              <p className="text-xs text-slate-400">Setup channel boundaries, bypass roles, and violation actions</p>
            </div>
          </div>

          <form onSubmit={handleAdd} className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Channel Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Select Channel <span className="text-pink-400">*</span>
                </label>
                <select
                  value={formData.channelId}
                  onChange={(e) =>
                    setFormData({ ...formData, channelId: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                >
                  <option value="">Select target text channel...</option>
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">Channel where non-media text messages will be removed.</p>
              </div>

              {/* Whitelist / Bypass Role */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Whitelist / Bypass Role (Optional)
                </label>
                <select
                  value={formData.whitelistRoleId}
                  onChange={(e) =>
                    setFormData({ ...formData, whitelistRoleId: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-2xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">None (Everyone must adhere)</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">Members with this role can chat freely without media restrictions.</p>
              </div>
            </div>

            {/* Enforcement Mode Cards */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 mt-2">
                Allowed Content Mode
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, imageOnly: false })}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    !formData.imageOnly
                      ? "bg-indigo-600/15 border-indigo-500/50 shadow-lg shadow-indigo-500/5"
                      : "bg-slate-900/40 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2.5 font-semibold text-xs text-white">
                    <Film className="w-4 h-4 text-indigo-400" />
                    <span>All Media Mode (Default)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Permits photos, videos (MP4/MOV/WebM), GIFs, Tenor/Giphy/Imgur links, and attached files.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, imageOnly: true })}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    formData.imageOnly
                      ? "bg-pink-600/15 border-pink-500/50 shadow-lg shadow-pink-500/5"
                      : "bg-slate-900/40 border-white/5 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-2.5 font-semibold text-xs text-white">
                    <ImageIcon className="w-4 h-4 text-pink-400" />
                    <span>Images Only Mode</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    Strictly limits channel to images (PNG, JPG, JPEG, GIF, WebP). Videos and other files are purged.
                  </p>
                </button>
              </div>
            </div>

            {/* Feature Checkbox Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5">
              <div 
                onClick={() => setFormData({ ...formData, autoMute: !formData.autoMute })}
                className={`p-4 rounded-2xl border flex flex-col gap-3 cursor-pointer transition-all duration-300 ${
                  formData.autoMute 
                    ? "bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]" 
                    : "bg-slate-900/50 border-white/5 hover:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl transition-colors ${formData.autoMute ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors duration-300 ${formData.autoMute ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${formData.autoMute ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block tracking-tight">Auto-Mute on 3 Strikes</span>
                  <span className="text-[10px] text-slate-400 block mt-1 leading-relaxed">
                    Times out user for 60s upon 3 repeat violations within 5 mins.
                  </span>
                </div>
              </div>

              <div 
                onClick={() => setFormData({ ...formData, allowNsfw: !formData.allowNsfw })}
                className={`p-4 rounded-2xl border flex flex-col gap-3 cursor-pointer transition-all duration-300 ${
                  formData.allowNsfw 
                    ? "bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]" 
                    : "bg-slate-900/50 border-white/5 hover:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl transition-colors ${formData.allowNsfw ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors duration-300 ${formData.allowNsfw ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${formData.allowNsfw ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block tracking-tight">Allow NSFW Bypass</span>
                  <span className="text-[10px] text-slate-400 block mt-1 leading-relaxed">
                    Exempt age-restricted/NSFW channels from media enforcement.
                  </span>
                </div>
              </div>

              <div 
                onClick={() => setFormData({ ...formData, postStickyNotice: !formData.postStickyNotice })}
                className={`p-4 rounded-2xl border flex flex-col gap-3 cursor-pointer transition-all duration-300 ${
                  formData.postStickyNotice 
                    ? "bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]" 
                    : "bg-slate-900/50 border-white/5 hover:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-xl transition-colors ${formData.postStickyNotice ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                    <Pin className="w-4 h-4" />
                  </div>
                  <div className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors duration-300 ${formData.postStickyNotice ? 'bg-indigo-500' : 'bg-slate-700'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-300 ${formData.postStickyNotice ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-white block tracking-tight">Post Sticky Notice</span>
                  <span className="text-[10px] text-slate-400 block mt-1 leading-relaxed">
                    Pins and maintains an informational embed notice at the bottom.
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={!formData.channelId || submitting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{submitting ? "Enforcing Rule..." : "Enforce Media Rule"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Active Enforcements List */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/5 shadow-2xl space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Active Media Channels</h3>
                <p className="text-xs text-slate-400">Currently monitored and protected channels</p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-white/5 text-slate-300 font-mono">
              {activeChannels.length} Enforced
            </span>
          </div>

          {activeChannels.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-slate-900/30">
              <ImageIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">No media-only channels configured</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Select a channel above to keep art, photography, or clips channels free of chat clutter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {activeChannels.map((item) => (
                <div
                  key={item.channel_id}
                  className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="p-2.5 rounded-xl bg-pink-500/10 text-pink-400 mt-0.5 sm:mt-0">
                      <Hash className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          #{channelMap.get(item.channel_id) || item.channel_id}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${
                          item.image_only
                            ? "bg-pink-500/10 text-pink-300 border-pink-500/20"
                            : "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                        }`}>
                          {item.image_only ? "Images Only" : "All Media"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1.5">
                        {item.whitelist_role_id && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            <ShieldCheck className="w-3 h-3" />
                            Bypass: @{roleMap.get(item.whitelist_role_id) || item.whitelist_role_id}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          Auto-Mute: {item.auto_mute ? "3-Strikes (60s)" : "Disabled"}
                        </span>
                        <span>•</span>
                        <span>NSFW Bypass: {item.nsfw_bypass ? "Enabled" : "Disabled"}</span>
                        {item.sticky_message_id && (
                          <>
                            <span>•</span>
                            <span className="inline-flex items-center gap-1 text-purple-400">
                              <Pin className="w-3 h-3" />
                              Sticky Notice Pinned
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(item.channel_id)}
                    className="self-end sm:self-center inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
                    title="Remove restriction"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
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
