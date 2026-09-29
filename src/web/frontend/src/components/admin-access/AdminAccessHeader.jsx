import React from "react";

export default function AdminAccessHeader() {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm font-display text-brand-crimson tracking-wider">पहुँच नियंत्रण</span>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-80">/ Access Control</span>
      </div>
      <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Staff & Admin Access</h1>
      <p className="text-sm text-slate-400">Control which members and Discord roles can configure and manage the bot.</p>
    </div>
  );
}
