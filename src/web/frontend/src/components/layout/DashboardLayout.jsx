import React from "react";
import Base from "./Base";

/**
 * DashboardLayout wraps Base layout to guarantee backward compatibility
 * across all existing guild dashboard pages.
 */
export default function DashboardLayout(props) {
  return <Base {...props} />;
}
