export function exportAnalyticsCSV(data) {
  if (!data) return;

  const chatters = data.topChatters || [];
  const voice = data.topVoice || [];
  const insights = data.insights || {};
  const summary = data.summary || {};

  let csv = "=== FULL SERVER ANALYTICS REPORT ===\n\n";
  
  csv += "--- SUMMARY ---\n";
  csv += `Total Messages,${summary.totalMessages ?? 0}\n`;
  csv += `Total Voice Hours,${summary.totalVoiceHours ?? 0}\n`;
  csv += `Net Growth,${(summary.netGrowth ?? 0) >= 0 ? "+" : ""}${summary.netGrowth ?? 0}\n`;
  csv += `Retention Rate,${summary.retentionRate != null ? summary.retentionRate + "%" : "-"}\n`;
  csv += `Active Members Tracked,${summary.activeTracked ?? 0}\n\n`;

  csv += "--- INSIGHTS ---\n";
  csv += `Prime Activity Window,"${(insights.primeWindow || "-").replace(/"/g, '""')}"\n`;
  csv += `Peak Traffic Day,"${(insights.busiestDay || "-").replace(/"/g, '""')}"\n`;
  csv += `Most Active Channel,"${(insights.topChannel || "-").replace(/"/g, '""')}"\n`;
  csv += `Growth Momentum,"${(insights.growthSummary || "-").replace(/"/g, '""')}"\n\n`;

  csv += "--- TOP CHATTERS ---\n";
  csv += "Rank,Username,Weekly Messages,Total Messages\n";
  chatters.forEach((u, i) => {
    const uname = (u.username || "Unknown").replace(/"/g, '""');
    const w = u.weeklyMessages ?? u.messages ?? 0;
    const t = u.totalMessages ?? u.messages ?? 0;
    csv += `${i + 1},"${uname}",${w},${t}\n`;
  });
  csv += "\n";

  csv += "--- TOP VOICE ---\n";
  csv += "Rank,Username,Weekly Minutes,Total Minutes\n";
  voice.forEach((u, i) => {
    const uname = (u.username || "Unknown").replace(/"/g, '""');
    const w = u.weeklyMinutes ?? u.vcMinutes ?? 0;
    const t = u.totalMinutes ?? u.vcMinutes ?? 0;
    csv += `${i + 1},"${uname}",${w},${t}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `analytics_export_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
