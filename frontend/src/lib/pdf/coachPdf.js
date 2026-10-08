import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDF_THEME, addBrandHeader, addPageNumbersAndFooters } from "./theme";

export function generateCoachPdf({ user, coachData = [] }) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const { left, right } = PDF_THEME.margins;
  const contentWidth = PDF_THEME.page.width - left - right;

  let y = addBrandHeader(
    doc,
    "COACH PROFILE & ATHLETE ROSTER",
    `OFFICIAL COACHING & ATTESTATION DOSSIER · ${user.name?.toUpperCase() || "COACH"}`
  );

  // COACH HEADER CARD
  const cardHeight = 44;
  doc.setFillColor(...PDF_THEME.colors.dark);
  doc.roundedRect(left, y, contentWidth, cardHeight, 3, 3, "F");

  // Coach Accent
  doc.setFillColor(...PDF_THEME.colors.accent);
  doc.rect(left, y, 4, cardHeight, "F");

  // Coach Badge Box
  const avatarSize = 30;
  const avatarX = left + 8;
  const avatarY = y + 7;
  doc.setFillColor(34, 40, 49);
  doc.roundedRect(avatarX, avatarY, avatarSize, avatarSize, 2, 2, "F");
  doc.setDrawColor(...PDF_THEME.colors.accent);
  doc.setLineWidth(0.6);
  doc.roundedRect(avatarX, avatarY, avatarSize, avatarSize, 2, 2, "D");

  const initials = (user.name || "C")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...PDF_THEME.colors.accent);
  const initWidth = doc.getTextWidth(initials);
  doc.text(initials, avatarX + (avatarSize - initWidth) / 2, avatarY + 18);

  const textLeft = avatarX + avatarSize + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_THEME.colors.accent);
  doc.text("VERIFIED COACH & MENTOR IDENTIFIER", textLeft, y + 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text((user.name || "Coach").toUpperCase(), textLeft, y + 21);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 205, 215);
  doc.text(`Official Email: ${user.email} · Role: ${user.role?.toUpperCase() || "COACH"}`, textLeft, y + 28);
  doc.text(`Linked Athletes: ${coachData.length} mentored athletes under active attestation`, textLeft, y + 34);

  y += cardHeight + 8;

  // SECTION 1: COACHING ATTESTATION SUMMARY
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_THEME.colors.primaryDark);
  doc.text("1. COACHING WORKSPACE & ATTESTATION SUMMARY", left, y);
  y += 2;

  const totalSharedSessions = coachData.reduce((acc, a) => acc + (a.sessions?.length || 0), 0);
  const totalAchievements = coachData.reduce((acc, a) => acc + (a.achievements?.length || 0), 0);
  const pendingAchievements = coachData.reduce(
    (acc, a) => acc + (a.achievements?.filter((r) => !r.verified)?.length || 0),
    0
  );
  const verifiedAchievements = totalAchievements - pendingAchievements;

  autoTable(doc, {
    startY: y,
    body: [
      [
        `Active Roster: ${coachData.length} Athletes`,
        `Shared Sessions: ${totalSharedSessions} Sessions`,
        `Verified Records: ${verifiedAchievements} Milestones`,
        `Pending Review: ${pendingAchievements} Items`,
      ],
    ],
    theme: "plain",
    styles: {
      fontSize: 8.5,
      fontStyle: "bold",
      textColor: PDF_THEME.colors.primaryDark,
      fillColor: PDF_THEME.colors.lightBg,
      cellPadding: 3,
    },
    margin: { left, right },
  });

  y = doc.lastAutoTable.finalY + 8;

  // SECTION 2: LINKED ATHLETE ROSTER
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_THEME.colors.primaryDark);
  doc.text("2. LINKED ATHLETE ROSTER & PERFORMANCE PRIVACY", left, y);
  y += 2;

  const rosterRows = coachData.map((a) => {
    const p = a.profile;
    const sharedSessionsCount = a.sessions?.length || 0;
    const unverifiedAchCount = a.achievements?.filter((r) => !r.verified)?.length || 0;
    return [
      p.name,
      p.sport || "—",
      p.event || "—",
      p.sharePerformance ? "Performance Shared" : "Restricted",
      p.shareHealth ? "Health Shared" : "Restricted",
      `${sharedSessionsCount} sessions`,
      `${unverifiedAchCount} pending`,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [["Athlete Name", "Sport", "Event / Position", "Performance Access", "Health Access", "Shared Log", "Reviews"]],
    body: rosterRows.length ? rosterRows : [["No athletes currently linked to this coach account", "—", "—", "—", "—", "—", "—"]],
    theme: "grid",
    headStyles: { fillColor: PDF_THEME.colors.dark, fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2, textColor: PDF_THEME.colors.darkText },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 36 },
      1: { cellWidth: 24 },
      2: { cellWidth: 26 },
      3: { cellWidth: 26 },
      4: { cellWidth: 22 },
      5: { cellWidth: 20 },
      6: { cellWidth: 20 },
    },
    margin: { left, right },
  });

  y = doc.lastAutoTable.finalY + 8;

  // SECTION 3: RECENT ATTESTATION AUDIT LOG / REVIEWS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...PDF_THEME.colors.primaryDark);
  doc.text("3. REVIEW & VERIFICATION WORKLIST", left, y);
  y += 2;

  const reviewItems = [];
  coachData.forEach((a) => {
    (a.achievements || []).forEach((ach) => {
      reviewItems.push([
        a.profile.name,
        "Achievement",
        ach.title,
        ach.result || "—",
        ach.date || "—",
        ach.verified ? "Verified" : "Pending Coach Review",
      ]);
    });
  });

  autoTable(doc, {
    startY: y,
    head: [["Athlete", "Record Type", "Milestone Title", "Result", "Date", "Status"]],
    body: reviewItems.length ? reviewItems.slice(0, 15) : [["No milestone reviews recorded", "—", "—", "—", "—", "—"]],
    theme: "striped",
    headStyles: { fillColor: PDF_THEME.colors.accent, textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 32 },
      1: { cellWidth: 24 },
      2: { cellWidth: 48 },
      3: { cellWidth: 26 },
      4: { cellWidth: 20 },
      5: { cellWidth: 24 },
    },
    margin: { left, right },
  });

  addPageNumbersAndFooters(doc, "Coach Dossier & Roster");
  return doc;
}
