import React from "react";
import { useParams } from "react-router-dom";
import { usePermissionsAudit } from "../../hooks/permissions-audit";
import { Key } from "lucide-react";

import {
  AuditHeader,
  SecurityOverview,
  MemberAuditSearch,
  MemberAuditResult,
  PrivilegedMembers,
  ElevatedRoles
} from "../../components/permissions-audit";

export default function PermissionsAuditPage({ showToast }) {
  const { guildId } = useParams();

  const {
    auditData,
    loading,
    refreshing,
    error,
    selectedMember,
    memberAudit,
    memberAuditLoading,
    setSelectedMember,
    refresh,
    auditMember
  } = usePermissionsAudit(guildId, showToast);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] animate-in fade-in zoom-in-[0.98] duration-500">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/5 text-center space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">Unable to load permission audit</h2>
          <p className="text-sm text-slate-400">The server audit could not be retrieved.</p>
          <button onClick={refresh} className="mt-4 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
        <div className="h-24 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        <div className="h-32 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        <div className="h-48 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
          <div className="h-96 glass-panel rounded-3xl border border-white/5 animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto animate-in fade-in duration-500 pb-32">
      <AuditHeader 
        guildId={guildId} 
        auditData={auditData} 
        onRefresh={refresh} 
        refreshing={refreshing} 
      />

      <SecurityOverview auditData={auditData} />

      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/5 mb-12">
        <MemberAuditSearch 
          guildId={guildId}
          selectedMember={selectedMember}
          onAudit={auditMember}
          isAuditing={memberAuditLoading}
        />

        <MemberAuditResult 
          memberAudit={memberAudit} 
          loading={memberAuditLoading} 
        />
      </div>

      <div className="mb-6 flex items-center gap-2">
        <Key className="w-5 h-5 text-white" />
        <h2 className="text-xl font-bold text-white tracking-tight">Server Permission Findings</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <PrivilegedMembers 
          members={auditData?.members} 
          onInspect={auditMember}
        />
        
        <ElevatedRoles 
          roles={auditData?.roles} 
        />
      </div>
    </div>
  );
}
