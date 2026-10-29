import React from "react";
import { PageHeader } from "../ui";

export default function WarningPunishmentsHeader({ activeCount = 0, enabled = true, onToggle }) {
  return (
    <PageHeader
      category="संयम"
      breadcrumb="Moderation / Automation"
      title="Auto-Punishments"
      description="Automatically take moderation action when members reach configured warning thresholds."
      enabled={enabled}
      onToggle={onToggle}
      stats={[
        { label: activeCount === 1 ? "Threshold Configured" : "Thresholds Configured", value: activeCount },
      ]}
      disabledAlert={{
        title: "Auto-Punishments Disabled",
        message: "Automatic disciplinary actions upon reaching warning thresholds are currently paused server-wide. Warnings will continue to be recorded.",
      }}
    />
  );
}
