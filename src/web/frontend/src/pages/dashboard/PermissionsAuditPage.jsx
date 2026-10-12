import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { usePermissionsAudit } from "../../hooks/permissions-audit";
import { Key, Users, UserCheck, ShieldAlert, SlidersHorizontal } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState("members"); // "members", "roles", "inspector"

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

  const handleInspectMember = (memberId) => {
    setActiveTab("inspector");
    auditMember(memberId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh] animate-in fade-in zoom-in-[0.98] duration-500">
        <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-white/5 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-crimson/10 border border-brand-crimson/20 text-brand-crimson flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Unable to load permission audit</h2>
          <p className="text-xs text-slate-400">The server vulnerability audit could not be retrieved from the bot gateway.</p>
          <button
            onClick={refresh}
            className="mt-4 px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors border border-white/10"
          >
            Retry Scan
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="h-20 glass-panel rounded-2xl border border-white/5" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-28 glass-panel rounded-2xl border border-white/5" />
          <div className="h-28 glass-panel rounded-2xl border border-white/5" />
          <div className="h-28 glass-panel rounded-2xl border border-white/5" />
          <div className="h-28 glass-panel rounded-2xl border border-white/5" />
        </div>
        <div className="h-96 glass-panel rounded-2xl border border-white/5" />
      </div>
    );
  }

  const memberCount = auditData?.members?.length || 0;
  const roleCount = auditData?.roles?.length || 0;

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300">
      {/* 1. Header with Samarkan Hinglish title and Export / Refresh controls */}
      <AuditHeader 
        guildId={guildId} 
        auditData={auditData} 
        onRefresh={refresh} 
        refreshing={refreshing} 
      />

      {/* 2. Executive Security Overview with 4 Telemetry Cards & Risk Spectrum */}
      <SecurityOverview auditData={auditData} />

      {/* 3. Security Command Workbench Tabs */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "members"
                ? "bg-white/15 text-white shadow-md border border-white/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span>Privileged Members</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-900 border border-white/10 text-slate-300">
              {memberCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("roles")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "roles"
                ? "bg-white/15 text-white shadow-md border border-white/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>Elevated Roles</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-900 border border-white/10 text-slate-300">
              {roleCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("inspector")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative ${
              activeTab === "inspector"
                ? "bg-white/15 text-white shadow-md border border-white/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-brand-crimson" />
            <span>Member Inspector</span>
            {memberAudit && (
              <span className="w-2 h-2 rounded-full bg-brand-crimson animate-pulse" title="Active member loaded" />
            )}
          </button>
        </div>

        <div className="text-xs font-mono text-slate-500 hidden sm:block">
          {activeTab === "members" && "Viewing user accounts with elevated rights"}
          {activeTab === "roles" && "Viewing roles bestowing dangerous permissions"}
          {activeTab === "inspector" && "Deep-dive analysis of individual permissions"}
        </div>
      </div>

      {/* 4. Active Workbench View */}
      {activeTab === "members" && (
        <PrivilegedMembers 
          members={auditData?.members} 
          onInspect={handleInspectMember}
        />
      )}

      {activeTab === "roles" && (
        <ElevatedRoles 
          roles={auditData?.roles} 
        />
      )}

      {activeTab === "inspector" && (
        <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-white/5 space-y-6">
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
      )}
    </div>
  );
}
