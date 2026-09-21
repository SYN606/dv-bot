import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  getGuildMeta,
  getSticky,
  saveSticky,
  deleteSticky,
} from "../api/client";
import { Pin, Trash2, Check, Eye } from "lucide-react";

export default function StickyPage({ user, botInfo, showToast }) {
  const { guildId } = useParams();
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [content, setContent] = useState("");
  const [activeSticky, setActiveSticky] = useState(null);
  const [saving, setSaving] = useState(false);

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
    getSticky(guildId)
      .then((res) => {
        const found = res?.stickyList?.find((s) => s.channel_id === selectedChannel);
        if (found) {
          setActiveSticky(found);
          setContent(found.content);
        } else {
          setActiveSticky(null);
          setContent("");
        }
      })
      .catch((err) => console.error(err));
  }, [guildId, selectedChannel]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedChannel || !content.trim()) return;
    setSaving(true);
    try {
      await saveSticky(guildId, {
        channelId: selectedChannel,
        content: content.trim(),
      });
      showToast("Sticky notice saved and will repin on new messages!");
      setActiveSticky({ channel_id: selectedChannel, content: content.trim() });
    } catch (err) {
      showToast(err.message || "Failed to save sticky notice.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedChannel) return;
    try {
      await deleteSticky(guildId, selectedChannel);
      showToast("Sticky notice removed.");
      setActiveSticky(null);
      setContent("");
    } catch (err) {
      showToast(err.message || "Failed to delete sticky notice.", "error");
    }
  };

  return (
    <DashboardLayout
      user={user}
      botInfo={botInfo}
      breadcrumbs={["Sticky Channel Notice"]}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Pin className="w-6 h-6 text-cyan-400" />
            <span>Sticky Channel Notice</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Pin an announcement or rule set to the bottom of a channel that automatically deletes and reposts whenever someone sends a message.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Edit Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Target Text Channel
                </label>
                <select
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {channels.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      #{ch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Sticky Notice Message (Markdown Supported)
                </label>
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="e.g. 📌 Welcome! Please read #rules and keep discussions on topic."
                  className="w-full p-4 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                {activeSticky && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Sticky</span>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={saving || !content.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 ml-auto"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : "Save Sticky"}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Live Preview Box */}
          <div className="glass-card p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span>Discord Embed Preview</span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/90 border-l-4 border-indigo-500 shadow-xl space-y-2">
              <div className="flex items-center gap-2">
                <Pin className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-bold text-xs text-indigo-300">
                  Channel Notice
                </span>
              </div>
              <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                {content.trim() ||
                  "Your sticky message text preview will appear here formatted as a Discord notice embed."}
              </p>
              <div className="pt-2 text-[10px] text-slate-500 font-mono">
                {botInfo?.username || "Digital Vigital"} • Auto-Repinning Notice
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
