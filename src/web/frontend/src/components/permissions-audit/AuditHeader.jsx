import React from "react";
import { Download, RefreshCw } from "lucide-react";
import { exportPermissionsAuditCsv } from "../../utils/permissions-audit";
import { PageHeader, Button } from "../ui";

export default function AuditHeader({ guildId, auditData, onRefresh, refreshing }) {
  const memberCount = auditData?.members?.length || 0;

  return (
    <PageHeader
      category="सुरक्षा ऑडिट"
      breadcrumb="Security / Permissions Audit"
      title="Permissions Audit"
      description="Deep vulnerability scan detecting members and roles with elevated, administrator, or destructive Discord permissions."
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportPermissionsAuditCsv(auditData, guildId)}
            disabled={!memberCount || refreshing}
            icon={Download}
          >
            Export CSV
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onRefresh}
            isLoading={refreshing}
            loadingText="Scanning..."
            icon={RefreshCw}
          >
            Refresh Audit
          </Button>
        </>
      }
    />
  );
}
