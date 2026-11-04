import React, { useState } from "react";
import { FolderHeart, Play, Trash2, Plus, Lock, Globe } from "lucide-react";

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
    <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <FolderHeart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Playlists</h3>
            <p className="text-[11px] text-slate-400">Save and load custom music playlists</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Playlist</span>
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreateSubmit} className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 mb-4 space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Playlist name..."
            required
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description..."
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="rounded accent-indigo-500"
              />
              <span>Private to me only</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !name.trim()}
                className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Create
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 max-h-[420px] pr-1">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500 mb-2 block">
            Your Playlists ({userPlaylists.length})
          </span>
          {userPlaylists.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-2">No personal playlists yet.</p>
          ) : (
            <div className="space-y-2">
              {userPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 hover:bg-slate-950/70 border border-white/5 group transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-200 truncate">{pl.name}</p>
                      {pl.is_private ? (
                        <Lock className="w-3 h-3 text-slate-500" title="Private" />
                      ) : (
                        <Globe className="w-3 h-3 text-indigo-400" title="Public" />
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {pl.track_count || 0} tracks {pl.description ? `• ${pl.description}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onLoadPlaylist(pl.id)}
                      disabled={actionLoading || !pl.track_count}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 text-xs font-semibold transition-all flex items-center gap-1 disabled:opacity-30"
                      title="Load and play"
                    >
                      <Play className="w-3 h-3" />
                      <span>Load</span>
                    </button>
                    <button
                      onClick={() => onDeletePlaylist(pl.id)}
                      disabled={actionLoading}
                      className="p-1.5 rounded-xl text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {publicPlaylists.length > 0 && (
          <div className="pt-2">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-500 mb-2 block">
              Server Community Playlists ({publicPlaylists.length})
            </span>
            <div className="space-y-2">
              {publicPlaylists.map((pl) => (
                <div
                  key={pl.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 hover:bg-slate-950/70 border border-white/5 group transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-200 truncate">{pl.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {pl.track_count || 0} tracks {pl.description ? `• ${pl.description}` : ""}
                    </p>
                  </div>

                  <button
                    onClick={() => onLoadPlaylist(pl.id)}
                    disabled={actionLoading || !pl.track_count}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600/15 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/20 text-xs font-semibold transition-all flex items-center gap-1 disabled:opacity-30 shrink-0"
                  >
                    <Play className="w-3 h-3" />
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
