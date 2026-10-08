import { SportsDataProvider } from "./SportsDataProvider.js";
import { VERIFIED_AFI_NATIONAL_RECORDS } from "../nationalRecordsPdfParser.js";

/**
 * NationalRecordsPdfProvider.
 * Serves official Athletics Federation of India (AFI) national records parsed directly
 * from authentic public PDF documents stored in public/records/National/:
 * - National-Record_24NOV2024.pdf (Senior Men & Women)
 * - NYR_01SEP2022-1.pdf (Youth U18 Records)
 * - NYACrec_12SEP2022-1.pdf (Youth Championships Records)
 */
export class NationalRecordsPdfProvider extends SportsDataProvider {
  constructor() {
    super("NationalRecordsPdfProvider");
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

    return VERIFIED_AFI_NATIONAL_RECORDS.filter((r) => {
      // Event match
      const rEv = r.event.toLowerCase();
      const eventMatch = rEv === ev || rEv.includes(ev) || ev.includes(rEv);
      if (!eventMatch) return false;

      // Gender match
      const rG = r.gender.toLowerCase();
      const genderMatch = isMale ? rG === "male" : rG === "female";
      if (!genderMatch) return false;

      // Age category matching:
      // If athlete is U18 or U20, include both their age category record AND the Senior National Record
      if (reqAge === "u18") {
        return r.ageCategory === "u18" || r.ageCategory === "open";
      }
      if (reqAge === "u20") {
        return r.ageCategory === "u20" || r.ageCategory === "u18" || r.ageCategory === "open";
      }

      // Senior / Open athletes match senior records
      return r.ageCategory === "open" || !r.ageCategory;
    });
  }
}
