import React from "react";
import { ListMusic, Trash2, ArrowUp, ArrowDown, Clock, Music } from "lucide-react";

export default function QueueManager({
  queue,
  onRemoveTrack,
  onMoveTrack,
  onClearQueue,
  actionLoading,
}) {
  const tracks = queue?.tracks || [];

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl flex flex-col h-full space-y-5">
      {/* Queue Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ListMusic className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wide">Upcoming Queue</h3>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              {tracks.length} track{tracks.length === 1 ? "" : "s"} waiting • {queue?.formattedTotalDuration || "00:00"} total duration
            </p>
          </div>
        </div>

        {tracks.length > 0 && (
          <button
            onClick={onClearQueue}
            disabled={actionLoading}
            className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs sm:text-sm font-bold transition-all disabled:opacity-40 hover:shadow-lg hover:shadow-rose-500/10 active:scale-95"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Queue List */}
      {tracks.length === 0 ? (
        <div className="flex-1 min-h-[220px] flex flex-col items-center justify-center text-slate-400 text-center p-8 border border-dashed border-white/5 rounded-2xl">
          <div className="p-4 rounded-3xl bg-slate-950/60 text-slate-500 mb-3 border border-white/5">
            <ListMusic className="w-10 h-10 opacity-40" />
          </div>
          <p className="text-sm sm:text-base font-bold text-slate-300">The playback queue is empty</p>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm">
            Use the search bar above or choose one of the Instant Vibes to add tracks to the queue.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[460px] pr-1.5 scrollbar-thin">
          {tracks.map((track, idx) => (
            <div
              key={`${track.info.identifier}-${idx}`}
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-slate-950/50 hover:bg-slate-950/80 border border-white/5 hover:border-white/10 group transition-all"
            >
              <div className="flex items-center gap-3.5 min-w-0 pr-3">
                <span className="w-7 h-7 rounded-xl bg-white/5 flex items-center justify-center text-xs sm:text-sm font-mono text-slate-400 font-bold shrink-0">
                  {idx + 1}
                </span>

                <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/10 shadow-md">
                  {track.info.artworkUrl ? (
                    <img
                      src={track.info.artworkUrl}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-mono text-slate-500">
                      <Music className="w-5 h-5 text-indigo-400/60" />
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <a
                    href={track.info.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm sm:text-base font-bold text-slate-200 hover:text-indigo-400 truncate block transition-colors leading-snug"
                  >
                    {track.info.title}
                  </a>
                  <p className="text-xs sm:text-sm text-slate-400 truncate mt-0.5">{track.info.author}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{track.formattedDuration}</span>
                </div>

                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                  {idx > 0 && (
                    <button
                      onClick={() => onMoveTrack(idx, idx - 1)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Move up in queue"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                  )}
                  {idx < tracks.length - 1 && (
                    <button
                      onClick={() => onMoveTrack(idx, idx + 1)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Move down in queue"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveTrack(idx)}
                    className="p-1.5 rounded-lg text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/20 transition-colors ml-0.5"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
