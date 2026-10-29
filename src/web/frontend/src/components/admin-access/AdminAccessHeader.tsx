import React from "react";
import { ShieldCheck } from "lucide-react";
import { PageHeader } from "../ui";

export default function AdminAccessHeader() {
  return (
    <PageHeader
      category="पहुँच नियंत्रण"
      breadcrumb="Dashboard & Bot Access"
      title="Admin & Dashboard Access"
      description="Control which Discord roles and members are authorized to access this web dashboard and configure bot settings."
    >
      <div className="p-4 rounded-2xl glass-panel bg-slate-900/60 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">Access Hierarchy Rules</div>
            <div className="text-[11px] text-slate-400 leading-relaxed">
              Server Owner and Discord Administrators have full access by default. Additional roles and members authorized below can log in and manage the dashboard without requiring server admin permissions.
            </div>
          </div>
        </div>
      </div>
    </PageHeader>
  );
}
