import React, { useState } from "react";
import { FolderHeart, Play, Trash2, Plus, Lock, Globe, ListMusic } from "lucide-react";

export default function PlaylistManager({
  playlists,
  onCreatePlaylist,
  onDeletePlaylist,
  onLoadPlaylist,
  actionLoading,
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const userPlaylists = playlists?.userPlaylists || [];
  const publicPlaylists = playlists?.publicPlaylists || [];

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreatePlaylist({
      name: name.trim(),
      description: description.trim(),
      isPrivate,
    });
    setName("");
    setDescription("");
    setShowCreate(false);
  };

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl flex flex-col h-full space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <FolderHeart className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wide">Saved Playlists</h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">Save and load custom queues for this server</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>New Playlist</span>
        </button>
      </div>

      {/* Creation Modal / Inline Drawer */}
      {showCreate && (
        <form onSubmit={handleCreateSubmit} className="p-5 rounded-2xl bg-slate-950/70 border border-white/10 space-y-4 animate-fade-in shadow-inner">
          <h4 className="text-sm font-bold text-slate-200">Create New Playlist</h4>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Playlist title (e.g. Chill Study Vibes)..."
            required
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-500"
              />
              <span>Private to me only</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !name.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Playlists List */}
      <div className="flex-1 overflow-y-auto space-y-4 max-h-[440px] pr-1.5 scrollbar-thin">
        <div>
          <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-400 mb-2.5 block">
            Your Playlists ({userPlaylists.length})
          </span>
          {userPlaylists.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-950/30 border border-white/5 text-center text-xs sm:text-sm text-slate-500">
              No personal playlists created yet. Click "New Playlist" or use <span className="font-mono text-indigo-300">/playlist save</span> in Discord.
            </div>
          ) : (
            <div className="space-y-2.5">
              {userPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/50 hover:bg-slate-950/80 border border-white/5 hover:border-white/10 group transition-all"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm sm:text-base font-bold text-slate-200 truncate">{pl.name}</p>
                      {pl.is_private ? (
                        <Lock className="w-3.5 h-3.5 text-slate-500" title="Private" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-indigo-400" title="Public" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      {pl.track_count || 0} track{pl.track_count === 1 ? "" : "s"} {pl.description ? `• ${pl.description}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onLoadPlaylist(pl.id)}
                      disabled={actionLoading || !pl.track_count}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 disabled:opacity-30 active:scale-95 shadow-sm"
                      title="Load playlist into queue"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Load</span>
                    </button>
                    <button
                      onClick={() => onDeletePlaylist(pl.id)}
                      disabled={actionLoading}
                      className="p-2 rounded-xl text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                      title="Delete playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {publicPlaylists.length > 0 && (
          <div className="pt-2">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-400 mb-2.5 block">
              Server Community Playlists ({publicPlaylists.length})
            </span>
            <div className="space-y-2.5">
              {publicPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/50 hover:bg-slate-950/80 border border-white/5 group transition-all"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-sm sm:text-base font-bold text-slate-200 truncate">{pl.name}</p>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      {pl.track_count || 0} tracks {pl.description ? `• ${pl.description}` : ""}
                    </p>
                  </div>

                  <button
                    onClick={() => onLoadPlaylist(pl.id)}
                    disabled={actionLoading || !pl.track_count}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 disabled:opacity-30 shrink-0"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Load</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
