import React from "react";
import { PageHeader } from "../ui";

export default function VerificationHeader({ enabled, onToggle }) {
  return (
    <PageHeader
      category="सुरक्षा"
      breadcrumb="Security / Access"
      title="Verification Gate"
      description="Configure how new members receive server access to prevent raids and automated accounts."
      enabled={enabled}
      onToggle={onToggle}
      disabledAlert={{
        title: "Verification Gate Disabled",
        message: "New verification attempts are currently paused. Configuration can still be edited and saved.",
      }}
    />
  );
}
