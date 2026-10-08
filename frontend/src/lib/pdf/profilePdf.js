import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDF_THEME, addBrandHeader, addPageNumbersAndFooters } from "./theme";

export function generateProfilePdf({
  user,
  profile,
  insights,
  sessions = [],
  achievements = [],
  injuries = [],
  plans = [],
  files = [],
}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const { left, right } = PDF_THEME.margins;

  let y = addBrandHeader(
    doc,
    "FULL ATHLETE DOSSIER & PROFILE",
    `COMPREHENSIVE SPORTING & PERFORMANCE RECORD · ${profile.name?.toUpperCase() || "ATHLETE"}`
  );

  // SECTION 1: PERSONAL & CONTACT INFORMATION
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_THEME.colors.primaryDark);
  doc.text("1. PERSONAL & DEMOGRAPHIC RECORD", left, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    head: [["Field", "Details", "Field", "Details"]],
    body: [
      ["Full Name", profile.name || user?.name || "—", "Account Email", user?.email || "—"],
      ["Date of Birth", profile.birthDate || "—", "Gender", profile.gender || "—"],
      ["State / UT", profile.state || "—", "District", profile.district || "—"],
      ["Education", profile.education || "—", "Linked Coach", profile.coachId || "None linked"],
    ],
    theme: "grid",
    headStyles: { fillColor: PDF_THEME.colors.dark, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, textColor: PDF_THEME.colors.darkText },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 32, fillColor: PDF_THEME.colors.lightBg },
      1: { cellWidth: 55 },
      2: { fontStyle: "bold", cellWidth: 32, fillColor: PDF_THEME.colors.lightBg },
      3: { cellWidth: 55 },
    },
    margin: { left, right },
  });

  y = doc.lastAutoTable.finalY + 8;

  // SECTION 2: SPORT-SPECIFIC PROFILE & EQUIPMENT
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_THEME.colors.primaryDark);
  doc.text("2. SPORT PROFILE & DISCIPLINE ATTRIBUTES", left, y);
  y += 2;

  const sp = profile.sportProfile;
  const sportRows = [
    ["Primary Sport", profile.sport || "—", "Event / Position", sp?.event || profile.event || "—"],
    ["Discipline", sp?.discipline || "Standard", "Category / Class", sp?.classification || profile.classification || "Open"],
    ["Measurement Unit", sp?.measurement?.unit || profile.unit || "—", "Evaluation Rule", sp?.measurement?.direction === "lower_is_better" ? "Lower is better (Time/Speed)" : "Higher is better (Dist/Pts/Kg)"],
    ["Target Metric", profile.target ? `${profile.target} ${sp?.measurement?.unit || profile.unit}` : "—", "Next Competition", profile.competitionDate || "None scheduled"],
    ["Training Equipment", profile.equipment || "Standard", "Classification Status", sp?.classificationStatus || "Confirmed"],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Attribute", "Specification", "Attribute", "Specification"]],
    body: sportRows,
    theme: "grid",
    headStyles: { fillColor: PDF_THEME.colors.dark, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, textColor: PDF_THEME.colors.darkText },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 38, fillColor: PDF_THEME.colors.lightBg },
      1: { cellWidth: 49 },
      2: { fontStyle: "bold", cellWidth: 38, fillColor: PDF_THEME.colors.lightBg },
      3: { cellWidth: 49 },
    },
    margin: { left, right },
  });

  y = doc.lastAutoTable.finalY + 8;

  // SECTION 3: EXPLAINABLE PROGRESS INDEX & PERFORMANCE SUMMARY
  if (insights) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...PDF_THEME.colors.primaryDark);
    doc.text("3. PERFORMANCE INTELLIGENCE & PROGRESS INDEX", left, y);
    y += 2;

    const dimensionRows = insights.dimensions
      ? insights.dimensions.map((d) => [d.name, `${Math.round(d.value)} / 100`, `${d.weight}%`, d.explanation])
      : [];

    autoTable(doc, {
      startY: y,
      head: [["Dimension", "Score", "Weight", "Explainable Rationale"]],
      body: [
        [
          "Overall Progress Score",
          `${insights.score || "—"} / 100`,
          "100%",
          insights.risk || "Consistent baseline progression",
        ],
        ...dimensionRows,
      ],
      theme: "striped",
      headStyles: { fillColor: PDF_THEME.colors.primaryDark, fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 42 },
        1: { cellWidth: 24 },
        2: { cellWidth: 18 },
        3: { cellWidth: 90 },
      },
      margin: { left, right },
    });

    y = doc.lastAutoTable.finalY + 8;
  }

  // Check page boundary
  if (y > 220) {
    doc.addPage();
    y = addBrandHeader(doc, "FULL ATHLETE DOSSIER", "TRAINING & RECOVERY RECORDS");
  }

  // SECTION 4: TRAINING & WORKLOAD ADHERENCE
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_THEME.colors.primaryDark);
  doc.text("4. TRAINING SESSIONS & WORKLOAD SUMMARY", left, y);
  y += 2;

  const totalDuration = sessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  const avgEffort = sessions.length
    ? (sessions.reduce((acc, s) => acc + (Number(s.effort) || 0), 0) / sessions.length).toFixed(1)
    : "—";

  const trainingSummary = [
    [
      `Total Logged Sessions: ${sessions.length}`,
      `Total Training Time: ${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`,
      `Average Effort: ${avgEffort} / 10`,
      `Verified Sessions: ${sessions.filter((s) => s.verified).length}`,
    ],
  ];

  autoTable(doc, {
    startY: y,
    body: trainingSummary,
    theme: "plain",
    styles: { fontSize: 8, fontStyle: "bold", textColor: PDF_THEME.colors.primaryDark, cellPadding: 2 },
    margin: { left, right },
  });

  y = doc.lastAutoTable.finalY + 2;

  const sessionTableBody = sessions.slice(0, 10).map((s) => [
    s.date,
    s.title,
    s.event || profile.event,
    s.metric ? `${s.metric} ${s.unit || profile.unit}` : "—",
    `${s.duration}m (Effort ${s.effort})`,
    `Pain ${s.pain}/10 · Fatg ${s.fatigue}/10`,
    s.verified ? "Verified" : "Self Logged",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Date", "Session Name", "Event", "Metric", "Workload", "Wellbeing", "Status"]],
    body: sessionTableBody.length ? sessionTableBody : [["No sessions logged", "—", "—", "—", "—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: PDF_THEME.colors.dark, fontSize: 7.5 },
    styles: { fontSize: 7, cellPadding: 1.8, textColor: PDF_THEME.colors.darkText },
    margin: { left, right },
  });

  y = doc.lastAutoTable.finalY + 8;

  // New Page for Recovery, Achievements, Goals
  doc.addPage();
  y = addBrandHeader(doc, "FULL ATHLETE DOSSIER", "RECOVERY, ACHIEVEMENTS & CAREER GOALS");

  // SECTION 5: RECOVERY & RETURN-TO-PLAY
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_THEME.colors.primaryDark);
  doc.text("5. RECOVERY & HEALTH MILESTONES", left, y);
  y += 2;

  const injuryRows = injuries.map((inj) => [
    inj.date,
    inj.title,
    inj.stage,
    inj.cleared ? "Clinically Cleared" : "Under Rehabilitation",
    inj.notes || "None",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Onset Date", "Concern / Injury", "Current Stage", "Clearance Status", "Clinical Notes"]],
    body: injuryRows.length ? injuryRows : [["No injury or rehabilitation records reported.", "—", "—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: PDF_THEME.colors.dark, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 38 },
      2: { cellWidth: 32 },
      3: { cellWidth: 34 },
      4: { cellWidth: 46 },
    },
    margin: { left, right },
  });

  y = doc.lastAutoTable.finalY + 8;

  // SECTION 6: ACHIEVEMENTS & ATTESTATIONS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_THEME.colors.primaryDark);
  doc.text("6. SPORTING ACHIEVEMENTS & RECOGNITION", left, y);
  y += 2;

  const achievementRows = achievements.map((a) => [
    a.date,
    a.title,
    a.level,
    a.result,
    a.verified ? `Verified (${a.verifiedBy || "Coach"})` : a.verificationStatus || "Self Uploaded",
    a.certificate?.url || a.attachmentId ? "Attached" : "None",
    a.notes || "—",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Date", "Achievement / Competition", "Level", "Result", "Attestation", "Proof", "Notes"]],
    body: achievementRows.length ? achievementRows : [["No achievements registered", "—", "—", "—", "—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: PDF_THEME.colors.dark, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 42 },
      2: { cellWidth: 22 },
      3: { cellWidth: 26 },
      4: { cellWidth: 28 },
      5: { cellWidth: 16 },
      6: { cellWidth: 20 },
    },
    margin: { left, right },
  });

  y = doc.lastAutoTable.finalY + 8;

  // SECTION 7: CAREER GOALS & SUPPORTING DOCUMENTS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_THEME.colors.primaryDark);
  doc.text("7. ASPIRATION & SUPPORTING EVIDENCE", left, y);
  y += 3;

  const fileCount = files.length;
  const planCount = plans.length;

  autoTable(doc, {
    startY: y,
    head: [["Dimension", "Details"]],
    body: [
      ["Sporting & Career Goal", profile.goal || "Not recorded yet"],
      ["Available Equipment", profile.equipment || "Open ground"],
      ["Training Plans Saved", `${planCount} weekly curriculum plan(s)`],
      ["Stored Media & Documents", `${fileCount} uploaded file(s) on record`],
    ],
    theme: "striped",
    headStyles: { fillColor: PDF_THEME.colors.primaryDark, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 2.2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 50 },
      1: { cellWidth: 124 },
    },
    margin: { left, right },
  });

  addPageNumbersAndFooters(doc, "Full Athlete Profile Dossier");
  return doc;
}
