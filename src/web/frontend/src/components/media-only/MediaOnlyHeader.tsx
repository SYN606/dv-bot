import React from "react";
import { PageHeader } from "../ui";

export default function MediaOnlyHeader({ activeCount = 0, enabled = true, onToggle }) {
  return (
    <PageHeader
      category="नियम"
      breadcrumb="Moderation / Media Control"
      title="Media-Only Channels"
      description="Keep selected channels focused on media by automatically removing unsupported text-only messages."
      enabled={enabled}
      onToggle={onToggle}
      stats={[
        { label: activeCount === 1 ? "Rule Active" : "Rules Active", value: activeCount },
      ]}
      disabledAlert={{
        title: "Media-Only Enforcement Disabled",
        message: "Automatic removal of non-media messages is currently paused server-wide. Channel rules remain intact.",
      }}
    />
  );
}
