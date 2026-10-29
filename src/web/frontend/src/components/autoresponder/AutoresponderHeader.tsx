import React from "react";
import { PageHeader } from "../ui";

export default function AutoresponderHeader({
  activeCount = 0,
  totalCount = 0,
  loading = false,
  onRefresh,
  enabled = true,
  onToggle,
}) {
  return (
    <PageHeader
      category="स्वचालन"
      breadcrumb="Autoresponder / Triggers"
      title="Autoresponder"
      description="Automatically reply, send rich embeds, or add reactions when community messages match configured triggers."
      enabled={enabled}
      onToggle={onToggle}
      onRefresh={onRefresh}
      isRefreshing={loading}
      stats={[
        { label: "Active", value: activeCount },
        { label: "Total", value: totalCount },
      ]}
      disabledAlert={{
        title: "Autoresponder Disabled",
        message: "Automated responses and trigger reactions are currently paused server-wide. Rules can still be configured and saved.",
      }}
    />
  );
}
