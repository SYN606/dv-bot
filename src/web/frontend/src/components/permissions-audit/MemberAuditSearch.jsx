import React from "react";
import { UserSelector } from "../discord";
import { UserCheck } from "lucide-react";

export default function MemberAuditSearch({ guildId, onAudit, isAuditing, selectedMember }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <UserCheck className="w-4 h-4 text-brand-crimson" />
          <h3 className="text-base font-bold text-white tracking-tight">Member Deep-Dive Inspector</h3>
        </div>
        <p className="text-xs text-slate-400">
          Inspect individual user access, origin role hierarchy, effective dangerous rights, and disciplinary records.
        </p>
      </div>

      <div className="w-full md:w-80 relative z-40">
        <UserSelector 
          guildId={guildId}
          value={selectedMember}
          onChange={onAudit}
          placeholder="Search member name or ID..."
        />
      </div>
    </div>
  );
}
