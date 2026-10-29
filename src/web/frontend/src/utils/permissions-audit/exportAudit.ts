export function exportPermissionsAuditCsv(auditData, guildId) {
  if (!auditData) return;
  
  const escapeCsv = (str) => {
    if (typeof str !== 'string') return str;
    return `"${str.replace(/"/g, '""')}"`;
  };

  const csvRows = [];

  // Roles Section
  csvRows.push("Role ID,Role Name,Dangerous Perms");
  auditData.roles.forEach(r => {
    const perms = r.permissions.map(p => p.name).join('; ');
    csvRows.push(`${r.id},${escapeCsv(r.name)},${escapeCsv(perms)}`);
  });

  csvRows.push("");
  csvRows.push("");

  // Members Section
  csvRows.push("Member ID,Username,Threat Score,Threat Level");
  auditData.members.forEach(m => {
    csvRows.push(`${m.id},${escapeCsv(m.username)},${m.threatScore},${escapeCsv(m.threatLevel)}`);
  });

  const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
  const encodedUri = encodeURI(csvContent);
  
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `security_audit_${guildId}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
