import React from "react";
import { PageHeader } from "../ui";

export default function StickyHeader({ activeCount = 0, totalRepins = 0, enabled = true, onToggle }) {
  return (
    <PageHeader
      category="स्वचालन"
      breadcrumb="Automation / Messaging"
      title="Sticky Notices"
      description="Keep important announcements visible by automatically reposting them after channel activity."
      enabled={enabled}
      onToggle={onToggle}
      stats={[
        { label: "Active", value: activeCount },
        { label: "Repins", value: Number(totalRepins || 0).toLocaleString() },
      ]}
      disabledAlert={{
        title: "Sticky Notices Disabled",
        message: "Automatic notice reposting is currently paused server-wide. Sticky message configurations remain saved.",
      }}
    />
  );
}
