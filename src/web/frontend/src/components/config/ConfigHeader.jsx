import React from "react";

export default function ConfigHeader() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm font-display text-brand-crimson tracking-wider">सर्वर</span>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Server / Configuration</span>
      </div>
      <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Roles & Audit Logs</h1>
      <p className="text-sm text-slate-400">Configure moderation logging, automatic voice roles, and temporary isolation behavior.</p>
    </div>
  );
}
