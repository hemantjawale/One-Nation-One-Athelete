import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDF_THEME, addBrandHeader, addPageNumbersAndFooters } from "./theme";

export function generatePerformancePdf({ profile, sessions = [], benchmarks, comparison }) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const { left, right } = PDF_THEME.margins;
  const contentWidth = PDF_THEME.page.width - left - right;

  let y = addBrandHeader(
    doc,
    "ATHLETE PERFORMANCE PROGRESSION REPORT",
    `OBJECTIVE METRICS, BENCHMARKS & PROGRESSION ANALYSIS · ${profile.name?.toUpperCase() || "ATHLETE"}`
  );

  const sp = profile.sportProfile;
  const unit = sp?.measurement?.unit || profile.unit || "";
  const direction = sp?.measurement?.direction || (unit === "sec" ? "lower_is_better" : "higher_is_better");
  const isLowerBetter = direction === "lower_is_better";

  // Filter valid metric sessions for current event
  const eventSessions = sessions
    .filter((s) => s.metric && Number(s.metric) > 0 && s.event === profile.event)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Compute Personal Best and Progression
  const metricValues = eventSessions.map((s) => Number(s.metric));
  let personalBest = "—";
  if (metricValues.length > 0) {
    personalBest = isLowerBetter ? Math.min(...metricValues) : Math.max(...metricValues);
  }

  // TOP SUMMARY METRICS
  doc.setFillColor(...PDF_THEME.colors.lightBg);
  doc.setDrawColor(...PDF_THEME.colors.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(left, y, contentWidth, 34, 2, 2, "FD");

  const statWidth = contentWidth / 4;
  const stats = [
    ["SPORT & EVENT", `${profile.sport} · ${profile.event}`],
    ["PERSONAL BEST", `${personalBest} ${unit}`],
    ["TARGET GOAL", `${profile.target || "—"} ${unit}`],
    ["METRIC DIRECTION", isLowerBetter ? "Lower is Better (Time)" : "Higher is Better (Score/Dist)"],
  ];

  stats.forEach(([lbl, val], idx) => {
    const sX = left + idx * statWidth + 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_THEME.colors.mutedText);
    doc.text(lbl, sX, y + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_THEME.colors.primaryDark);
    doc.text(doc.splitTextToSize(val, statWidth - 8), sX, y + 19);
  });

  y += 40;

  // VISUAL PROGRESSION TABLE (Chronological Delta Analysis)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_THEME.colors.primaryDark);
  doc.text("1. CHRONOLOGICAL PROGRESSION & TREND ANALYSIS", left, y);
  y += 3;

  let previous = null;
  const progressRows = eventSessions.map((s) => {
    const val = Number(s.metric);
    let deltaStr = "Baseline";
    if (previous !== null) {
      const diff = val - previous;
      const isImprovement = isLowerBetter ? diff < 0 : diff > 0;
      const sign = diff > 0 ? "+" : "";
      deltaStr = `${sign}${diff.toFixed(2)} ${unit} (${isImprovement ? "Improved" : "Regressed"})`;
    }
    previous = val;

    return [
      s.date,
      s.title,
      `${val} ${unit}`,
      deltaStr,
      `${s.duration}m · RPE ${s.effort}/10`,
      s.verified ? "Verified by Coach" : "Self Logged",
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Date", "Session / Test", "Result", "Progression Delta", "Training Load", "Attestation"]],
    body: progressRows.length
      ? progressRows
      : [["No numerical metric sessions logged for this event", "—", "—", "—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: PDF_THEME.colors.dark, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, textColor: PDF_THEME.colors.darkText },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 42 },
      2: { fontStyle: "bold", cellWidth: 26 },
      3: { cellWidth: 36 },
      4: { cellWidth: 24 },
      5: { cellWidth: 22 },
    },
    margin: { left, right },
  });

  y = doc.lastAutoTable.finalY + 8;

  // SECTION 2: AUTOMATIC VERIFIED BENCHMARKS (District, State, National)
  if (comparison) {
    if (y > 220) {
      doc.addPage();
      y = addBrandHeader(doc, "PERFORMANCE PROGRESSION", "VERIFIED BENCHMARKS");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...PDF_THEME.colors.primaryDark);
    const catLabel = comparison.athlete?.ageCategory?.name || comparison.athlete?.ageCategory?.label || "Age Group";
    doc.text(`2. AUTOMATIC VERIFIED BENCHMARKS (${catLabel} · ${comparison.athlete?.gender || "All"})`, left, y);
    y += 3;

    const tiers = [
      ["District", comparison.athlete?.district ? `${comparison.athlete.district} District` : "District", comparison.district],
      ["State", comparison.athlete?.state ? `${comparison.athlete.state} State` : "State", comparison.state],
      ["National", "All India National", comparison.national],
    ];

    const cRows = tiers.map(([tier, loc, st]) => {
      if (!st || !st.available) {
        return [tier, loc, "Unavailable", "—", "—", "—", st?.reason || "No verified records"];
      }
      const gapStr = st.gap !== null ? `${st.gap > 0 ? "+" : ""}${st.gap} ${unit}` : "—";
      const rankStr = st.rank !== null ? `#${st.rank} / ${st.sampleSize}` : "—";
      const pctStr = st.percentile !== null ? `${st.percentile}th` : "—";
      return [
        tier,
        loc,
        `${st.best} ${unit}`,
        `${st.average} ${unit}`,
        rankStr,
        pctStr,
        `${gapStr} (${st.dataQuality})`,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["Tier", "Geographic Scope", "Record Best", "Average", "Rank", "Percentile", "Gap to Record"]],
      body: cRows,
      theme: "grid",
      headStyles: { fillColor: PDF_THEME.colors.primaryDark, fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 22 },
        1: { cellWidth: 36 },
        2: { fontStyle: "bold", cellWidth: 24 },
        3: { cellWidth: 22 },
        4: { cellWidth: 20 },
        5: { cellWidth: 20 },
        6: { cellWidth: 30 },
      },
      margin: { left, right },
    });

    y = doc.lastAutoTable.finalY + 8;
  }

  // SECTION 3: PEER COHORT BENCHMARKS
  if (benchmarks && benchmarks.groups?.length) {
    if (y > 230) {
      doc.addPage();
      y = addBrandHeader(doc, "PERFORMANCE PROGRESSION", "PEER COHORTS");
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...PDF_THEME.colors.primaryDark);
    doc.text(`3. CONSENTED PEER COHORT RESEARCH DISTRIBUTION (Age Band: ${benchmarks.ageBand || "—"})`, left, y);
    y += 3;

    const bRows = benchmarks.groups.map((g) => [
      g.scope.toUpperCase(),
      g.percentile !== null ? `${g.percentile}th Percentile` : "Insufficient cohort (< 5 peers)",
      `${g.count} verified peers`,
      "One best verified result per consenting peer; demo accounts excluded.",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Scope", "Attained Percentile", "Peer Sample Size", "Evaluation Protocol"]],
      body: bRows,
      theme: "striped",
      headStyles: { fillColor: PDF_THEME.colors.dark, fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 32 },
        1: { cellWidth: 36 },
        2: { cellWidth: 32 },
        3: { cellWidth: 74 },
      },
      margin: { left, right },
    });
  }

  addPageNumbersAndFooters(doc, "Performance Progression Report");
  return doc;
}
