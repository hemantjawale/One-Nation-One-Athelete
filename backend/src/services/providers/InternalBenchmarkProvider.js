import { SportsDataProvider } from "./SportsDataProvider.js";

/**
 * InternalBenchmarkProvider.
 * Queries the persistent `benchmarks` collection in the local/MongoDB database.
 * Supports verified federation data, historical records, and admin-imported CSV/JSON data.
 */
export class InternalBenchmarkProvider extends SportsDataProvider {
  constructor(db) {
    super("InternalBenchmarkProvider");
    this.db = db;
  }

  supports(_filters) {
    return true; // Supports any sport stored in the internal database
  }

  async fetchRecords(filters) {
    if (!this.db) return [];

    try {
      const all = await this.db.list("benchmarks");
      if (!Array.isArray(all)) return [];

      return all.filter((r) => {
        // Must match sport
        if (r.sport && filters.sport && r.sport.toLowerCase() !== filters.sport.toLowerCase()) {
          return false;
        }

        // Must match event (case-insensitive substring or exact)
        if (r.event && filters.event) {
          const rEv = r.event.toLowerCase();
          const fEv = filters.event.toLowerCase();
          if (rEv !== fEv && !rEv.includes(fEv) && !fEv.includes(rEv)) {
            return false;
          }
        }

        // Must match gender
        if (r.gender && filters.gender && r.gender !== "All" && r.gender.toLowerCase() !== filters.gender.toLowerCase()) {
          return false;
        }

        // Must match age category if specified
        if (filters.ageCategory?.id && r.ageCategory) {
          const rCat = r.ageCategory.toLowerCase();
          const fCat = filters.ageCategory.id.toLowerCase();
          if (rCat !== "open" && rCat !== "all" && rCat !== fCat) {
            return false;
          }
        }

        // Weight category check for weight-based sports
        if (filters.isWeightSport && filters.weightCategory && r.weightCategory) {
          if (r.weightCategory.toLowerCase() !== filters.weightCategory.toLowerCase()) {
            return false;
          }
        }

        return true;
      });
    } catch (_err) {
      return [];
    }
  }
}
