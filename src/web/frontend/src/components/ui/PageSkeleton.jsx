import React from "react";

export default function PageSkeleton({
  cards = 2,
  rows = 3,
  hasHeader = true,
  className = "",
}) {
  return (
    <div className={`w-full space-y-8 animate-pulse select-none ${className}`}>
      {hasHeader && (
        <div className="space-y-3 pb-8 border-b border-white/5">
          <div className="h-4 w-32 bg-white/5 rounded-md" />
          <div className="h-8 w-64 bg-white/10 rounded-xl" />
          <div className="h-4 w-96 bg-white/5 rounded-md max-w-full" />
        </div>
      )}

      {cards > 0 && (
        <div className={`grid grid-cols-1 ${cards > 1 ? "lg:grid-cols-2" : ""} gap-6`}>
          {Array.from({ length: cards }).map((_, i) => (
            <div
              key={i}
              className="h-64 sm:h-80 glass-panel bg-slate-900/40 rounded-3xl border border-white/5 p-6 space-y-4"
            >
              <div className="h-6 w-40 bg-white/10 rounded-lg" />
              <div className="h-4 w-full bg-white/5 rounded" />
              <div className="h-4 w-3/4 bg-white/5 rounded" />
              <div className="h-28 bg-white/5 rounded-2xl mt-6" />
            </div>
          ))}
        </div>
      )}

      {rows > 0 && (
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="h-20 glass-panel bg-slate-900/40 rounded-2xl border border-white/5 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 shrink-0" />
                <div className="space-y-2">
                  <div className="h-4 w-36 bg-white/10 rounded" />
                  <div className="h-3 w-24 bg-white/5 rounded" />
                </div>
              </div>
              <div className="h-8 w-20 bg-white/5 rounded-xl" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
