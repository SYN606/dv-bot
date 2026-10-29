import React from "react";
import { PageHeader } from "../ui";

export default function ConfigHeader() {
  return (
    <PageHeader
      category="सर्वर"
      breadcrumb="Server / Configuration"
      title="Roles & Audit Logs"
      description="Configure moderation logging, automatic voice roles, and temporary isolation behavior."
    />
  );
}
