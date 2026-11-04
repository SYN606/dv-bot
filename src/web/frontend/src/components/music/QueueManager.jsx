import React from "react";
import { ListMusic, Trash2, ArrowUp, ArrowDown, Clock } from "lucide-react";

export default function QueueManager({
  queue,
  onRemoveTrack,
  onMoveTrack,
  onClearQueue,
  actionLoading,
}) {
  const tracks = queue?.tracks || [];

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/10 bg-slate-900/60 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ListMusic className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Queue</h3>
            <p className="text-[11px] text-slate-400">
              {tracks.length} upcoming tracks • {queue?.formattedTotalDuration || "00:00"}
            </p>
          </div>
        </div>

        {tracks.length > 0 && (
          <button
            onClick={onClearQueue}
            disabled={actionLoading}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors disabled:opacity-40"
          >
            Clear Queue
          </button>
        )}
      </div>

      {tracks.length === 0 ? (
        <div className="flex-1 min-h-[160px] flex flex-col items-center justify-center text-slate-500 text-center p-6">
          <ListMusic className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-xs font-medium">The queue is currently empty.</p>
          <p className="text-[10px] text-slate-600 mt-0.5">Use the search bar above to queue tracks.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 max-h-[420px] pr-1 scrollbar-thin">
          {tracks.map((track, idx) => (
            <div
              key={`${track.info.identifier}-${idx}`}
              className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/40 hover:bg-slate-950/70 border border-white/5 group transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <span className="w-5 text-center text-xs font-mono text-slate-500 font-bold">
                  {idx + 1}
                </span>

                <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/5">
                  {track.info.artworkUrl ? (
                    <img
                      src={track.info.artworkUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-slate-500">
                      DV
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <a
                    href={track.info.uri}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-slate-200 hover:text-indigo-400 truncate block transition-colors"
                  >
                    {track.info.title}
                  </a>
                  <p className="text-[10px] text-slate-500 truncate">{track.info.author}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{track.formattedDuration}</span>
                </div>

                <div className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity">
                  {idx > 0 && (
                    <button
                      onClick={() => onMoveTrack(idx, idx - 1)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {idx < tracks.length - 1 && (
                    <button
                      onClick={() => onMoveTrack(idx, idx + 1)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveTrack(idx)}
                    className="p-1 rounded-lg text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 ml-1"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
