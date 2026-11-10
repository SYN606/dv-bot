import React from "react";
import { PageHeader } from "../ui";

export default function AutoRoleHeader({ enabled, isEnabled = false, onToggle }: any) {
  const active = enabled !== undefined ? enabled : Boolean(isEnabled);

  return (
    <PageHeader
      category="AUTOMATION"
      breadcrumb="Rewards / Automation"
      title="Leaderboard Auto-Roles"
      description="Automatically reward the most active community members with weekly Discord roles."
      enabled={active}
      onToggle={onToggle}
      disabledAlert={{
        title: "Auto-Roles Disabled",
        message: "Automated weekly leaderboard role distribution is currently paused. Configuration can still be edited and saved.",
      }}
    />
  );
}
