// Master PDF Export Hub for One Nation One Athlete
import { generatePassportPdf } from "./passportPdf";
import { generateProfilePdf } from "./profilePdf";
import { generateCoachPdf } from "./coachPdf";
import { generateAchievementPdf } from "./achievementPdf";
import { generatePerformancePdf } from "./performancePdf";
import { generateJourneyPdf } from "./journeyPdf";

export {
  generatePassportPdf,
  generateProfilePdf,
  generateCoachPdf,
  generateAchievementPdf,
  generatePerformancePdf,
  generateJourneyPdf,
};

export function downloadPdf(doc, filename = "athlete-document.pdf") {
  const safeName = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  doc.save(safeName);
}

export async function exportPdfByType({
  type,
  user,
  data,
  coachData,
  filteredRecords,
  filterLabel,
}) {
  const athleteName = (data?.profile?.name || user?.name || "athlete")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-");

  switch (type) {
    case "passport": {
      const doc = generatePassportPdf({
        user,
        profile: data.profile,
        achievements: data.achievements || [],
        sessions: data.sessions || [],
      });
      downloadPdf(doc, `${athleteName}-passport.pdf`);
      break;
    }

    case "profile": {
      const doc = generateProfilePdf({
        user,
        profile: data.profile,
        insights: data.insights,
        sessions: data.sessions || [],
        achievements: data.achievements || [],
        injuries: data.injuries || [],
        plans: data.plans || [],
        files: data.files || [],
      });
      downloadPdf(doc, `${athleteName}-full-profile.pdf`);
      break;
    }

    case "performance": {
      const doc = generatePerformancePdf({
        profile: data.profile,
        sessions: data.sessions || [],
        benchmarks: data.benchmarks,
        comparison: data.comparison,
      });
      downloadPdf(doc, `${athleteName}-performance-report.pdf`);
      break;
    }

    case "achievements": {
      const doc = await generateAchievementPdf({
        profile: data.profile,
        achievements: data.achievements || [],
      });
      downloadPdf(doc, `${athleteName}-achievements-report.pdf`);
      break;
    }

    case "journey": {
      const recordsToExport =
        filteredRecords || [
          ...(data.sessions || []),
          ...(data.achievements || []),
          ...(data.injuries || []),
        ];
      const doc = generateJourneyPdf({
        profile: data.profile,
        records: recordsToExport,
        filterLabel: filterLabel || "All Time",
      });
      const slug = (filterLabel || "all-time")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");
      downloadPdf(doc, `${athleteName}-training-journey-${slug}.pdf`);
      break;
    }

    case "coach": {
      const coachName = (user?.name || "coach")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-");
      const doc = generateCoachPdf({
        user,
        coachData: coachData || data?.coach || [],
      });
      downloadPdf(doc, `${coachName}-roster-dossier.pdf`);
      break;
    }

    default:
      throw new Error(`Unknown PDF export type: ${type}`);
  }
}
