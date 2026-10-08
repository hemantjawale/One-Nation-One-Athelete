import { jsPDF } from "jspdf";
import { PDF_THEME, addBrandHeader, addPageNumbersAndFooters } from "./theme";

async function fetchImageDataUrl(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve({ dataUrl: reader.result, format: blob.type.includes("png") ? "PNG" : "JPEG" });
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateAchievementPdf({ profile, achievements = [] }) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const { left, right } = PDF_THEME.margins;
  const contentWidth = PDF_THEME.page.width - left - right;

  let y = addBrandHeader(
    doc,
    "ATHLETE ACHIEVEMENT & ATTESTATION REPORT",
    `OFFICIAL MILESTONES & VERIFIED CREDENTIALS · ${profile.name?.toUpperCase() || "ATHLETE"}`
  );

  // SUMMARY CARD
  doc.setFillColor(...PDF_THEME.colors.lightBg);
  doc.setDrawColor(...PDF_THEME.colors.border);
  doc.setLineWidth(0.4);
  doc.roundedRect(left, y, contentWidth, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...PDF_THEME.colors.primaryDark);
  doc.text("ATTESTATION OVERVIEW", left + 6, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_THEME.colors.darkText);
  const verifiedCount = achievements.filter((a) => a.verified).length;
  const certificatesCount = achievements.filter((a) => a.certificate?.url || a.attachmentId).length;

  doc.text(
    `Athlete: ${profile.name || "—"}  |  Sport: ${profile.sport} · ${profile.sportProfile?.discipline || ""} · ${profile.event}`,
    left + 6,
    y + 13
  );
  doc.text(
    `Total Achievements: ${achievements.length}  |  Coach Verified: ${verifiedCount}  |  Attached Proofs: ${certificatesCount}`,
    left + 6,
    y + 19
  );

  y += 30;

  // Render each achievement card
  for (let i = 0; i < achievements.length; i++) {
    const a = achievements[i];

    // Check if we need a new page
    if (y > 230) {
      doc.addPage();
      y = addBrandHeader(doc, "ACHIEVEMENT REPORT", "CONTINUED CREDENTIALS");
    }

    const cardStartY = y;
    const cardH = a.notes ? 38 : 32;

    // Card background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...PDF_THEME.colors.border);
    doc.setLineWidth(0.4);
    doc.roundedRect(left, cardStartY, contentWidth, cardH, 2, 2, "FD");

    // Left accent bar
    doc.setFillColor(...(a.verified ? PDF_THEME.colors.success : PDF_THEME.colors.gold));
    doc.rect(left, cardStartY, 3, cardH, "F");

    // Title & Level
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...PDF_THEME.colors.dark);
    doc.text(`${i + 1}. ${a.title}`, left + 8, cardStartY + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...(a.verified ? PDF_THEME.colors.success : PDF_THEME.colors.primaryDark));
    const statusText = a.verified
      ? `VERIFIED BY ${a.verifiedBy?.toUpperCase() || "COACH"}`
      : (a.verificationStatus?.toUpperCase() || "SELF UPLOADED");
    doc.text(statusText, contentWidth + left - doc.getTextWidth(statusText) - 6, cardStartY + 8);

    // Grid of details
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_THEME.colors.mutedText);

    doc.text("Level:", left + 8, cardStartY + 16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_THEME.colors.darkText);
    doc.text(a.level || "—", left + 22, cardStartY + 16);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_THEME.colors.mutedText);
    doc.text("Result / Standing:", left + 55, cardStartY + 16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_THEME.colors.darkText);
    doc.text(a.result || "—", left + 85, cardStartY + 16);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_THEME.colors.mutedText);
    doc.text("Date:", left + 125, cardStartY + 16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...PDF_THEME.colors.darkText);
    doc.text(a.date || "—", left + 138, cardStartY + 16);

    // Proof / Certificate Status
    const certUrl = a.certificate?.url || (a.attachmentId ? `/api/files/${a.attachmentId}/content` : null);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_THEME.colors.mutedText);
    doc.text("Certificate Proof:", left + 8, cardStartY + 24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(certUrl ? PDF_THEME.colors.accent[0] : PDF_THEME.colors.mutedText[0], certUrl ? PDF_THEME.colors.accent[1] : PDF_THEME.colors.mutedText[1], certUrl ? PDF_THEME.colors.accent[2] : PDF_THEME.colors.mutedText[2]);
    doc.text(certUrl ? `Available (${a.certificate?.originalName || "Certificate File"})` : "No certificate attached", left + 36, cardStartY + 24);

    if (a.notes) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(...PDF_THEME.colors.mutedText);
      const notesSnippet = doc.splitTextToSize(`Notes: ${a.notes}`, contentWidth - 20);
      doc.text(notesSnippet, left + 8, cardStartY + 31);
    }

    y += cardH + 4;

    // If certificate is an image, attempt preview embed
    if (a.certificate?.url && (a.certificate.resourceType === "image" || a.certificate.url.match(/\.(jpeg|jpg|png|webp)/i))) {
      const imgData = await fetchImageDataUrl(a.certificate.url);
      if (imgData) {
        if (y > 210) {
          doc.addPage();
          y = addBrandHeader(doc, "ACHIEVEMENT CERTIFICATE", a.title);
        }
        try {
          const maxImgW = 75;
          const maxImgH = 48;
          doc.addImage(imgData.dataUrl, imgData.format, left + 8, y, maxImgW, maxImgH, undefined, "FAST");
          doc.setDrawColor(...PDF_THEME.colors.border);
          doc.rect(left + 8, y, maxImgW, maxImgH, "D");
          y += maxImgH + 6;
        } catch {
          // Graceful fallback if format not supported by browser canvas
        }
      }
    }
  }

  if (achievements.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_THEME.colors.mutedText);
    doc.text("No achievements recorded for this athlete.", left, y + 10);
  }

  addPageNumbersAndFooters(doc, "Athlete Achievement Report");
  return doc;
}
