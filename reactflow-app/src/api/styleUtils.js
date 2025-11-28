/**
 * Utility functions for KPI-based styling
 */

/**
 * Get color based on delta value (for heatmap effect)
 * Green (low delta) to Red (high delta)
 */
export const getDeltaColor = (delta, maxDelta = 100) => {
  const ratio = Math.min(delta / maxDelta, 1);
  // Green (0) to Red (1)
  const hue = (1 - ratio) * 120; // 120 = green, 0 = red
  return `hsl(${hue}, 70%, 50%)`;
};

/**
 * Get background color for macro nodes
 */
export const getMacroNodeColor = (delta) => {
  if (delta <= 20) return "#4CAF50"; // Green - good
  if (delta <= 40) return "#FFC107"; // Yellow - warning
  if (delta <= 60) return "#FF9800"; // Orange - critical
  return "#F44336"; // Red - very critical
};

/**
 * Get criticité badge color
 */
export const getCriticityColor = (criticite) => {
  switch (criticite) {
    case "Critique":
      return "#F44336"; // Red
    case "Majeure":
      return "#FF9800"; // Orange
    case "Mineure":
      return "#FFC107"; // Yellow
    default:
      return "#4CAF50"; // Green
  }
};

/**
 * Get criticité icon
 */
export const getCriticityIcon = (criticite) => {
  switch (criticite) {
    case "Critique":
      return "⚠️";
    case "Majeure":
      return "⚡";
    case "Mineure":
      return "ℹ️";
    default:
      return "✓";
  }
};

/**
 * Format time in minutes to readable format (MM:SS)
 */
export const formatTime = (minutes) => {
  if (typeof minutes !== "number") return "N/A";
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Get issue type badge color
 */
export const getIssueTypeColor = (issueTypes) => {
  if (issueTypes.includes("bottleneck")) return "#F44336";
  if (issueTypes.includes("high_risk_part")) return "#FF9800";
  return "#FFC107";
};
