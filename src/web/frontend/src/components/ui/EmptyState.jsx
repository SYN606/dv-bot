import React from "react";

export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="glass-panel p-12 rounded-3xl border border-dashed border-white/5 text-center flex flex-col items-center justify-center min-h-[300px]">
      {Icon && <Icon className="w-10 h-10 text-slate-600 mb-4" />}
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-sm text-slate-400 max-w-md mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
