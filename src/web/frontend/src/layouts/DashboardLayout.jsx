import React from "react";
import Base from "./Base";

/**
 * DashboardLayout wraps Base layout to guarantee backward compatibility
 * across all existing guild dashboard pages.
 * 
 * We hide the public Navbar and Footer inside the dashboard to prevent
 * overlapping and sticky-header bugs in the control center viewport.
 */
export default function DashboardLayout(props) {
  return <Base {...props} hideNavbar={true} hideFooter={true} />;
}
