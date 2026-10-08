import { SportsDataProvider } from "./SportsDataProvider.js";
import { VERIFIED_MAA_STATE_RECORDS } from "../maharashtraStateRecordsParser.js";

/**
 * MaharashtraStatePdfProvider.
 * Serves verified Maharashtra state-level athletics competition results parsed
 * directly from the official MAA PDF stored in public/records/state/:
 *   - Maharashtra_State_Sprint_Results_Research(1).pdf
 *
 * Covers Senior, U23, and U20 sprint events (100m, 200m) with district-level
 * granularity for Maharashtra athletes.
 */
export class MaharashtraStatePdfProvider extends SportsDataProvider {
  constructor() {
    super("MaharashtraStatePdfProvider");
  }

  supports(filters) {
    if (!filters?.sport) return false;
    const s = filters.sport.toLowerCase();
    return s === "athletics" || s === "track & field" || s === "para athletics";
  }

  async fetchRecords(filters) {
    if (!filters?.event) return [];
    const ev = (filters.event || "").toLowerCase().trim();
    const g = (filters.gender || "").toLowerCase().trim();
    const isMale = g === "male" || g === "m" || g === "boys";
    const reqAge = filters.ageCategory?.id?.toLowerCase();

    return VERIFIED_MAA_STATE_RECORDS.filter((r) => {
      // Event match
      const rEv = r.event.toLowerCase();
      const eventMatch = rEv === ev || rEv.includes(ev) || ev.includes(rEv);
      if (!eventMatch) return false;

      // Gender match
      const rG = r.gender.toLowerCase();
      const genderMatch = isMale ? rG === "male" : rG === "female";
      if (!genderMatch) return false;

      // Age category matching:
      // An U20 athlete should see U20 results AND the senior open results for
      // cross-category comparison. U23 sees U23 + open. Senior sees open only.
      if (reqAge === "u18") {
        return r.ageCategory === "u18" || r.ageCategory === "u20" || r.ageCategory === "open";
      }
      if (reqAge === "u20") {
        return r.ageCategory === "u20" || r.ageCategory === "open";
      }
      if (reqAge === "u23") {
        return r.ageCategory === "u23" || r.ageCategory === "u20" || r.ageCategory === "open";
      }

      // Senior / Open athletes get all age categories for breadth
      return true;
    });
  }
}
