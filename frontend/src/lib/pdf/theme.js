// PDF Theme Constants & Helper Utilities for One Nation One Athlete

export const PDF_THEME = {
  colors: {
    primary: [255, 87, 34],      // #FF5722 - Brand Vibrant Orange
    primaryDark: [216, 67, 21],  // #D84315
    dark: [22, 27, 34],          // #161B22 - Premium Dark Slate
    darkText: [33, 37, 41],      // #212529
    mutedText: [108, 117, 125],  // #6C757D
    lightMuted: [142, 150, 160], // #8E96A0
    border: [226, 232, 240],     // #E2E8F0 - Clean slate border
    lightBg: [248, 250, 252],    // #F8FAFC
    cardBg: [255, 255, 255],     // White
    badgeBg: [255, 243, 238],    // Warm tint
    success: [22, 163, 74],      // Green
    accent: [14, 165, 233],      // Sky Blue
    gold: [217, 119, 6],         // Trophy Gold
  },
  margins: {
    top: 20,
    bottom: 22,
    left: 18,
    right: 18,
  },
  page: {
    width: 210, // A4 mm
    height: 297,
  },
};

export function addBrandHeader(doc, title, subtitle = "") {
  const { left, right } = PDF_THEME.margins;
  const pageWidth = PDF_THEME.page.width;

  // Top Accent Stripe
  doc.setFillColor(...PDF_THEME.colors.primary);
  doc.rect(0, 0, pageWidth, 4, "F");

  // National Brand Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PDF_THEME.colors.primary);
  doc.text("ONE NATION ONE ATHLETE", left, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PDF_THEME.colors.mutedText);
  doc.text("UNIVERSAL SPORTS DATA INFRASTRUCTURE", left + 52, 12);

  // Document Confidentiality & Verification Tag
  const tag = "CONFIDENTIAL ATHLETE RECORD";
  doc.text(tag, pageWidth - right - doc.getTextWidth(tag), 12);

  // Divider Line
  doc.setDrawColor(...PDF_THEME.colors.border);
  doc.setLineWidth(0.4);
  doc.line(left, 15, pageWidth - right, 15);

  // Title Block
  let currentY = 23;
  if (title) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...PDF_THEME.colors.dark);
    doc.text(title, left, currentY);
    currentY += 6;
  }

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...PDF_THEME.colors.mutedText);
    doc.text(subtitle, left, currentY);
    currentY += 6;
  }

  return currentY + 2;
}

export function addPageNumbersAndFooters(doc, documentType = "Athlete Record") {
  const totalPages = doc.getNumberOfPages();
  const { left, right } = PDF_THEME.margins;
  const pageWidth = PDF_THEME.page.width;
  const pageHeight = PDF_THEME.page.height;
  const generatedDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Bottom divider
    doc.setDrawColor(...PDF_THEME.colors.border);
    doc.setLineWidth(0.4);
    doc.line(left, pageHeight - 14, pageWidth - right, pageHeight - 14);

    // Footer Text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...PDF_THEME.colors.mutedText);
    doc.text(`One Nation One Athlete · ${documentType} · Generated ${generatedDate}`, left, pageHeight - 9);

    const pageStr = `Page ${i} of ${totalPages}`;
    doc.text(pageStr, pageWidth - right - doc.getTextWidth(pageStr), pageHeight - 9);
  }
}
