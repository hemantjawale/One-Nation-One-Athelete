import { SportsDataProvider } from "./SportsDataProvider.js";

/**
 * MultiSportProvider for multi-sport APIs (e.g., SportsDataIO, Olympic/Commonwealth databases).
 */
export class MultiSportProvider extends SportsDataProvider {
  constructor(options = {}) {
    super("MultiSportProvider");
    this.apiUrl = options.apiUrl || process.env.SPORTS_API_URL || null;
    this.apiKey = options.apiKey || process.env.SPORTS_API_KEY || null;
  }

  supports(filters) {
    if (!filters?.sport) return false;
    const multiSports = ["swimming", "weightlifting", "wrestling", "shooting", "archery", "boxing"];
    return multiSports.includes(filters.sport.toLowerCase());
  }

  async fetchRecords(filters) {
    if (!this.apiUrl) return [];

    try {
      const url = new URL(this.apiUrl + "/benchmarks");
      url.searchParams.set("sport", filters.sport);
      url.searchParams.set("event", filters.event);
      if (filters.gender) url.searchParams.set("gender", filters.gender);
      if (filters.weightCategory) url.searchParams.set("weightCategory", filters.weightCategory);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url.toString(), {
        headers: {
          Accept: "application/json",
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) return [];

      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.records || [];
      return rows.map((r) => this.normalize(r, filters));
    } catch (_err) {
      return [];
    }
  }

  normalize(raw, filters) {
    return {
      id: raw.id || `ext-multi-${Math.random().toString(36).substring(2, 9)}`,
      sport: filters.sport,
      discipline: raw.discipline || filters.discipline || "",
      event: raw.event || filters.event,
      gender: raw.gender || filters.gender,
      ageCategory: raw.ageCategory || filters.ageCategory?.id || "open",
      classification: raw.classification || filters.classification || "Open",
      weightCategory: raw.weightCategory || filters.weightCategory || null,
      level: raw.level || "national",
      country: raw.country || "India",
      state: raw.state || null,
      district: raw.district || null,
      performance: {
        value: Number(raw.value || raw.mark || 0),
        metricType: filters.metricType || "general",
        unit: raw.unit || filters.unit || "points",
        direction: filters.direction || "higher_is_better",
      },
      athleteName: raw.athleteName || "Competitor",
      externalAthleteId: raw.externalId || null,
      competition: {
        name: raw.competition || "National Sports Meet",
        date: raw.date || new Date().toISOString().slice(0, 10),
        location: raw.location || "India",
      },
      source: {
        provider: "Multi-Sport Data Provider",
        name: "National Competition Records",
        url: this.apiUrl,
        retrievedAt: new Date().toISOString(),
      },
      verificationStatus: raw.verified ? "verified" : "imported",
    };
  }
}
