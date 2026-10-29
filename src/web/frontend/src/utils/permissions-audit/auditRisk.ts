export function getRiskLabel(level) {
  switch (level?.toLowerCase()) {
    case "red":
    case "critical":
      return "CRITICAL";
    case "yellow":
    case "high":
    case "elevated":
      return "ELEVATED";
    case "moderate":
      return "MODERATE";
    case "green":
    case "low":
    case "safe":
      return "SAFE";
    default:
      return "UNKNOWN";
  }
}

export function getRiskVariant(level) {
  switch (level?.toLowerCase()) {
    case "red":
    case "critical":
      return "danger";
    case "yellow":
    case "high":
    case "elevated":
      return "warning";
    case "moderate":
      return "warning";
    case "green":
    case "low":
    case "safe":
      return "success";
    default:
      return "default";
  }
}

export function getPermissionPriority(level) {
  switch (level?.toLowerCase()) {
    case "red":
    case "critical":
      return 3;
    case "yellow":
    case "high":
    case "elevated":
    case "moderate":
      return 2;
    case "green":
    case "low":
    case "safe":
      return 1;
    default:
      return 0;
  }
}
