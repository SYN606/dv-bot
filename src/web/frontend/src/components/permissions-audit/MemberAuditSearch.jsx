import React from "react";
import { UserSelector } from "../discord";

export default function MemberAuditSearch({ guildId, onAudit, isAuditing, selectedMember }) {
  return (
    <div className="mb-6">
      <div className="mb-4">
        <h2 className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Audit Member</h2>
        <p className="text-sm text-slate-400">Search for a server member to inspect their effective permissions and permission sources.</p>
      </div>
      
      <div className="max-w-md relative z-40">
        <UserSelector 
          guildId={guildId}
          value={selectedMember}
          onChange={onAudit}
          placeholder="Search member or Discord ID..."
        />
      </div>
    </div>
  );
}
