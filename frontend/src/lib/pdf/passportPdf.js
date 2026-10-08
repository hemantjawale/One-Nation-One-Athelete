import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { PDF_THEME, addBrandHeader, addPageNumbersAndFooters } from "./theme";

export function generatePassportPdf({ user, profile, achievements = [], sessions = [] }) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const { left, right } = PDF_THEME.margins;
  const pageWidth = PDF_THEME.page.width;
  const contentWidth = pageWidth - left - right;

  let y = addBrandHeader(
    doc,
    "ATHLETE PASSPORT",
    "OFFICIAL DIGITAL SPORTS IDENTITY & VERIFIED ATTESTATION"
  );

  // Digital Passport Card Container
  const cardStartY = y;
  const cardHeight = 52;
  doc.setFillColor(...PDF_THEME.colors.dark);
  doc.roundedRect(left, cardStartY, contentWidth, cardHeight, 3, 3, "F");

  // Passport Badge Accent
  doc.setFillColor(...PDF_THEME.colors.primary);
  doc.rect(left, cardStartY, 4, cardHeight, "F");

  // Athlete Avatar / Badge Box
  const avatarSize = 36;
  const avatarX = left + 10;
  const avatarY = cardStartY + 8;
  doc.setFillColor(34, 40, 49);
  doc.roundedRect(avatarX, avatarY, avatarSize, avatarSize, 2, 2, "F");
  doc.setDrawColor(...PDF_THEME.colors.primary);
  doc.setLineWidth(0.6);
  doc.roundedRect(avatarX, avatarY, avatarSize, avatarSize, 2, 2, "D");

  // Initials in avatar
  const initials = (profile.name || user?.name || "A")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...PDF_THEME.colors.primary);
  const initWidth = doc.getTextWidth(initials);
  doc.text(initials, avatarX + (avatarSize - initWidth) / 2, avatarY + 22);

  // Card Content
  const textLeft = avatarX + avatarSize + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_THEME.colors.primary);
  doc.text("UNIVERSAL ATHLETE IDENTITY · PASSPORT", textLeft, cardStartY + 14);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text((profile.name || user?.name || "Athlete").toUpperCase(), textLeft, cardStartY + 23);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 205, 215);

  const sp = profile.sportProfile;
  const sportParts = [profile.sport];
  if (sp?.discipline) sportParts.push(sp.discipline);
  if (sp?.event || profile.event) sportParts.push(sp?.event || profile.event);
  doc.text(sportParts.join(" · "), textLeft, cardStartY + 31);

  // Passport ID & Barcode simulation
  const passportId = `IND / ${(user?.id || profile.id || "00000000").slice(0, 18).toUpperCase()}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_THEME.colors.lightMuted);
  doc.text(`PASSPORT ID: ${passportId}`, textLeft, cardStartY + 41);

  const verifiedAchievementsCount = achievements.filter((a) => a.verified).length;
  const statusStr = `ATTESTATION: ${verifiedAchievementsCount} VERIFIED / ${achievements.length} ACHIEVEMENTS`;
  doc.setTextColor(...(verifiedAchievementsCount > 0 ? PDF_THEME.colors.success : PDF_THEME.colors.primary));
  doc.text(statusStr, textLeft, cardStartY + 46);

  y = cardStartY + cardHeight + 8;

  // 2-Column Info Grid: ATHLETE INFORMATION & SPORT PROFILE
  const colWidth = (contentWidth - 6) / 2;
  const col1X = left;
  const col2X = left + colWidth + 6;

  // Box 1: Personal Information
  doc.setFillColor(...PDF_THEME.colors.lightBg);
  doc.setDrawColor(...PDF_THEME.colors.border);
  doc.setLineWidth(0.3);
  doc.roundedRect(col1X, y, colWidth, 48, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_THEME.colors.primaryDark);
  doc.text("ATHLETE PERSONAL DETAILS", col1X + 6, y + 8);

  const personalRows = [
    ["Date of Birth", profile.birthDate || "Not recorded"],
    ["Gender", profile.gender || "Not specified"],
    ["State / UT", profile.state || "Not recorded"],
    ["District", profile.district || "Not recorded"],
    ["Education", profile.education || "Not recorded"],
  ];

  let pY = y + 15;
  personalRows.forEach(([lbl, val]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_THEME.colors.mutedText);
    doc.text(lbl, col1X + 6, pY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_THEME.colors.darkText);
    const valStr = String(val);
    doc.text(valStr, col1X + 42, pY);
    pY += 6.5;
  });

  // Box 2: Sport & Performance Parameters
  doc.setFillColor(...PDF_THEME.colors.lightBg);
  doc.roundedRect(col2X, y, colWidth, 48, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_THEME.colors.primaryDark);
  doc.text("SPORT & PERFORMANCE PROFILE", col2X + 6, y + 8);

  const sportRows = [
    ["Primary Sport", profile.sport || "—"],
    ...(sp?.discipline ? [["Discipline", sp.discipline]] : []),
    ["Event / Position", sp?.event || profile.event || "—"],
    ["Classification", sp?.classification || profile.classification || "Open"],
    ...(profile.target ? [["Personal Target", `${profile.target} ${sp?.measurement?.unit || profile.unit || ""}`]] : []),
  ];

  let sY = y + 15;
  sportRows.slice(0, 5).forEach(([lbl, val]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_THEME.colors.mutedText);
    doc.text(lbl, col2X + 6, sY);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_THEME.colors.darkText);
    doc.text(String(val), col2X + 40, sY);
    sY += 6.5;
  });

  y += 54;

  // Section: ACHIEVEMENTS & ATTESTATIONS
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PDF_THEME.colors.dark);
  doc.text("VERIFIED ACHIEVEMENTS & MILESTONES", left, y);
  y += 3;

  const achievementRows = achievements.length
    ? achievements.map((a) => [
        a.title,
        a.level,
        a.date,
        a.result,
        a.verified
          ? `Verified by ${a.verifiedBy || "Coach"}`
          : a.verificationStatus || "Self Uploaded",
        a.certificate?.url || a.attachmentId ? "Certificate Attached" : "None",
      ])
    : [["No achievements recorded yet", "—", "—", "—", "—", "—"]];

  autoTable(doc, {
    startY: y,
    head: [["Achievement / Event", "Level", "Date", "Result", "Attestation", "Proof"]],
    body: achievementRows,
    theme: "grid",
    headStyles: {
      fillColor: PDF_THEME.colors.dark,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      textColor: PDF_THEME.colors.darkText,
      lineColor: PDF_THEME.colors.border,
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 22 },
      2: { cellWidth: 20 },
      3: { cellWidth: 28 },
      4: { cellWidth: 32 },
      5: { cellWidth: 22 },
    },
    margin: { left, right },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Check if we need space for Recent Performance / Career Goal
  if (y > 240) {
    doc.addPage();
    y = addBrandHeader(doc, "ATHLETE PASSPORT", "CONTINUED RECORD");
  }

  // Section: SPORTING GOAL & CAREER VISION
  if (profile.goal) {
    doc.setFillColor(...PDF_THEME.colors.badgeBg);
    doc.setDrawColor(...PDF_THEME.colors.primary);
    doc.setLineWidth(0.4);
    doc.roundedRect(left, y, contentWidth, 22, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...PDF_THEME.colors.primaryDark);
    doc.text("ATHLETE CAREER GOAL & ASPIRATION", left + 6, y + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_THEME.colors.darkText);
    const splitGoal = doc.splitTextToSize(`"${profile.goal}"`, contentWidth - 12);
    doc.text(splitGoal, left + 6, y + 12);

    y += 26;
  }

  // Recent Training / Performance Snapshots
  const relevantSessions = sessions.slice(0, 5);
  if (relevantSessions.length > 0 && y < 240) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_THEME.colors.dark);
    doc.text("RECENT PERFORMANCE SNAPSHOTS", left, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      head: [["Session", "Event", "Date", "Result / Metric", "Load (min x effort)", "Verification"]],
      body: relevantSessions.map((s) => [
        s.title,
        s.event || profile.event,
        s.date,
        s.metric ? `${s.metric} ${s.unit || profile.unit}` : "—",
        `${s.duration} min (RPE ${s.effort}/10)`,
        s.verified ? "Verified" : "Self Logged",
      ]),
      theme: "striped",
      headStyles: {
        fillColor: PDF_THEME.colors.primaryDark,
        textColor: [255, 255, 255],
        fontSize: 7.5,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        lineColor: PDF_THEME.colors.border,
      },
      margin: { left, right },
    });
  }

  addPageNumbersAndFooters(doc, "Athlete Passport");
  return doc;
}
