import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDF_THEME, addBrandHeader, addPageNumbersAndFooters } from "./theme";

export function generateJourneyPdf({
  profile,
  records = [],
  filterLabel = "All Time",
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const { left, right } = PDF_THEME.margins;
  const contentWidth = PDF_THEME.page.width - left - right;

  let y = addBrandHeader(
    doc,
    `TRAINING JOURNEY · ${filterLabel.toUpperCase()}`,
    `TIMELINE RECORD & WORKLOAD LOG · ${profile.name?.toUpperCase() || "ATHLETE"}`
  );

  // Compute Summary Metrics for the Filtered Scope
  const sessions = records.filter((r) => r.kind === "sessions");
  const achievements = records.filter((r) => r.kind === "achievements");
  const injuries = records.filter((r) => r.kind === "injuries");

  const totalDuration = sessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  const totalHours = Math.floor(totalDuration / 60);
  const remainingMins = totalDuration % 60;

  const validMetrics = sessions.filter((s) => s.metric && Number(s.metric) > 0);
  const avgMetric = validMetrics.length
    ? (validMetrics.reduce((acc, s) => acc + Number(s.metric), 0) / validMetrics.length).toFixed(2)
    : "—";

  // FILTERED SUMMARY BAR
  doc.setFillColor(...PDF_THEME.colors.lightBg);
  doc.setDrawColor(...PDF_THEME.colors.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(left, y, contentWidth, 28, 2, 2, "FD");

  const statCols = [
    ["TIME WINDOW", filterLabel],
    ["TOTAL LOGGED", `${records.length} Activities`],
    ["TRAINING TIME", `${totalHours}h ${remainingMins}m`],
    ["AVG RESULT", `${avgMetric} ${profile.unit || ""}`],
    ["MILESTONES", `${achievements.length} Ach · ${injuries.length} Rec`],
  ];

  const colW = contentWidth / statCols.length;
  statCols.forEach(([lbl, val], idx) => {
    const cX = left + idx * colW + 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...PDF_THEME.colors.mutedText);
    doc.text(lbl, cX, y + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_THEME.colors.primaryDark);
    doc.text(doc.splitTextToSize(val, colW - 5), cX, y + 16);
  });

  y += 34;

  // CHRONOLOGICAL TIMELINE TABLE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_THEME.colors.primaryDark);
  doc.text("TIMELINE ACTIVITIES IN THIS WINDOW", left, y);
  y += 3;

  const sortedRecords = [...records].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const tableRows = sortedRecords.map((r) => {
    const typeLabel = r.kind === "sessions" ? "Training" : r.kind === "achievements" ? "Achievement" : "Recovery";
    let detailStr = r.event || profile.event || "—";
    if (r.kind === "achievements") detailStr = `${r.level} · ${r.result}`;
    if (r.kind === "injuries") detailStr = `Stage: ${r.stage}`;

    let metricStr = "—";
    if (r.metric) metricStr = `${r.metric} ${r.unit || profile.unit}`;
    else if (r.duration) metricStr = `${r.duration}m (RPE ${r.effort})`;

    return [
      r.date || "—",
      typeLabel,
      r.title || "—",
      detailStr,
      metricStr,
      r.verified ? "Verified" : "Self Logged",
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Date", "Type", "Activity Title", "Event / Detail", "Metric / Load", "Attestation"]],
    body: tableRows.length
      ? tableRows
      : [["No records found within this time window.", "—", "—", "—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: PDF_THEME.colors.dark, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, textColor: PDF_THEME.colors.darkText },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 24, fontStyle: "bold" },
      2: { cellWidth: 44 },
      3: { cellWidth: 40 },
      4: { cellWidth: 26 },
      5: { cellWidth: 16 },
    },
    margin: { left, right },
  });

  addPageNumbersAndFooters(doc, `Training Journey (${filterLabel})`);
  return doc;
}
