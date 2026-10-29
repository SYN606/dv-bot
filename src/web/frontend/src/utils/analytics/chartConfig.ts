import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// We rely on standard colors from our tailwind theme / design tokens.
// E.g., indigo-500 is roughly #6366f1, emerald-500 is #10b981
export const analyticsColors = {
  primary: "#6366f1", // indigo-500
  primaryBg: "rgba(99, 102, 241, 0.15)",
  secondary: "#10b981", // emerald-500
  secondaryBg: "rgba(16, 185, 129, 0.2)",
  tertiary: "#a855f7", // purple-500
  tertiaryBg: "rgba(168, 85, 247, 0.65)",
  highlight: "rgba(244, 63, 94, 0.85)", // rose-500
  textMuted: "#94a3b8", // slate-400
  gridLine: "rgba(255, 255, 255, 0.05)",
  tooltipBg: "rgba(15, 23, 42, 0.95)",
  tooltipBorder: "rgba(255, 255, 255, 0.1)",
};

export function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return `${monthNames[m] || parts[1]} ${d}`;
}

export const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: analyticsColors.tooltipBg,
      titleColor: "#fff",
      bodyColor: "#cbd5e1",
      borderColor: analyticsColors.tooltipBorder,
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: { color: analyticsColors.gridLine },
      ticks: { color: analyticsColors.textMuted, font: { size: 10 } },
    },
    y: {
      grid: { color: analyticsColors.gridLine },
      ticks: { color: analyticsColors.textMuted, font: { size: 10 } },
      beginAtZero: true,
    },
  },
};
