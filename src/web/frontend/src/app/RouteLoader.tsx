import React from "react";


export default function RouteLoader() {
  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-28 glass-panel rounded-3xl border border-white/5" />
      {/* Content skeletons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 glass-panel rounded-3xl border border-white/5" />
        <div className="h-64 glass-panel rounded-3xl border border-white/5" />
      </div>
      <div className="h-48 glass-panel rounded-3xl border border-white/5" />
    </div>
  );
}
