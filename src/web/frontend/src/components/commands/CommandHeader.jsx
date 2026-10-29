import React from "react";
import { PageHeader } from "../ui";

export default function CommandHeader({ totalCommands = 43, activeCommands = 34 }) {
  return (
    <PageHeader
      category="नियंत्रण"
      breadcrumb="Core / Command Permissions"
      title="Command Control Center"
      description="Manage command availability, enforce channel-specific restrictions, and toggle functional modules across your server in real time."
      actions={
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 shrink-0"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shrink-0"></span>
          </span>
          <span className="font-semibold text-white">Live Gateway Synced</span>
        </div>
      }
    />
  );
}
