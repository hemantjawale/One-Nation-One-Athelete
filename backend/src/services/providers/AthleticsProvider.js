import { SportsDataProvider } from "./SportsDataProvider.js";

/**
 * Athletics External Sports Data Provider (e.g. Velocitra / World Athletics formats).
 * Normalizes sprint, distance, field results into the standard benchmark record format.
 */
export class AthleticsProvider extends SportsDataProvider {
  constructor(options = {}) {
    super("AthleticsProvider");
    this.apiUrl = options.apiUrl || process.env.ATHLETICS_API_URL || null;
    this.apiKey = options.apiKey || process.env.ATHLETICS_API_KEY || null;
  }

  supports(filters) {
    if (!filters?.sport) return false;
    const s = filters.sport.toLowerCase();
    return s === "athletics" || s === "para athletics" || s === "track & field";
  }

  async fetchRecords(filters) {
    if (!this.apiUrl) {
      // No external API endpoint configured; fallback cleanly to internal verified database
      return [];
    }

    try {
      const url = new URL(this.apiUrl + "/results");
      url.searchParams.set("event", filters.event || "");
      url.searchParams.set("gender", filters.gender || "");
      if (filters.ageCategory?.id) url.searchParams.set("category", filters.ageCategory.id);
      if (filters.state) url.searchParams.set("state", filters.state);
      if (filters.country) url.searchParams.set("country", filters.country);

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

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      const results = Array.isArray(data) ? data : data.results || [];

      return results.map((item) => this.normalize(item, filters));
    } catch (_err) {
      // Graceful degradation when external API is unreachable or times out
      return [];
    }
  }

  normalize(raw, filters) {
    return {
      id: raw.id || `ext-ath-${raw.athleteId || Math.random().toString(36).substring(2, 9)}`,
      sport: "Athletics",
      discipline: raw.discipline || filters.discipline || "Track",
      event: raw.event || filters.event,
      gender: raw.gender || filters.gender,
      ageCategory: raw.ageCategory || filters.ageCategory?.id || "open",
      classification: raw.classification || filters.classification || "Open",
      weightCategory: null,
      level: raw.level || "national",
      country: raw.country || "India",
      state: raw.state || null,
      district: raw.district || null,
      performance: {
        value: Number(raw.time || raw.distance || raw.value || raw.mark),
        metricType: filters.metricType || "time",
        unit: raw.unit || filters.unit || "sec",
        direction: filters.direction || "lower_is_better",
      },
      athleteName: raw.athleteName || raw.name || "Anonymous Athlete",
      externalAthleteId: raw.athleteId || raw.id || null,
      competition: {
        name: raw.competitionName || raw.meetName || "Sanctioned Athletics Meet",
        date: raw.date || raw.competitionDate || new Date().toISOString().slice(0, 10),
        location: raw.location || raw.venue || "India",
      },
      source: {
        provider: "Velocitra Athletics API",
        name: raw.sourceName || "Athletics Results Database",
        url: raw.sourceUrl || this.apiUrl,
        retrievedAt: new Date().toISOString(),
      },
      // Note: Never label third-party data as "Official World Athletics" without verification
      verificationStatus: raw.verified ? "verified" : "imported",
    };
  }
}
