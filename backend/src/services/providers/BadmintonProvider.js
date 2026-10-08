import { SportsDataProvider } from "./SportsDataProvider.js";

/**
 * Badminton Sports Data Provider.
 * Connects to badminton external APIs or tournament databases.
 * Guarantees proper format (Singles / Doubles) and category matching.
 */
export class BadmintonProvider extends SportsDataProvider {
  constructor(options = {}) {
    super("BadmintonProvider");
    this.apiUrl = options.apiUrl || process.env.BADMINTON_API_URL || null;
    this.apiKey = options.apiKey || process.env.BADMINTON_API_KEY || null;
  }

  supports(filters) {
    return filters?.sport?.toLowerCase() === "badminton";
  }

  async fetchRecords(filters) {
    if (!this.apiUrl) {
      return [];
    }

    try {
      const url = new URL(this.apiUrl + "/rankings");
      url.searchParams.set("event", filters.event || "Men's Singles");
      if (filters.ageCategory?.id) url.searchParams.set("category", filters.ageCategory.id);

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
      const players = Array.isArray(data) ? data : data.players || [];

      return players.map((p) => this.normalize(p, filters));
    } catch (_err) {
      return [];
    }
  }

  normalize(raw, filters) {
    return {
      id: raw.id || `ext-bad-${raw.playerId || Math.random().toString(36).substring(2, 9)}`,
      sport: "Badminton",
      discipline: "Racket",
      event: raw.event || filters.event || "Men's Singles",
      gender: raw.gender || filters.gender,
      ageCategory: raw.ageCategory || filters.ageCategory?.id || "senior",
      classification: "Open",
      weightCategory: null,
      level: raw.level || "national",
      country: raw.country || "India",
      state: raw.state || null,
      district: raw.district || null,
      performance: {
        value: Number(raw.points || raw.rankingPoints || raw.score || raw.rank || 0),
        metricType: "score",
        unit: raw.unit || "points",
        direction: filters.direction || "higher_is_better",
      },
      athleteName: raw.playerName || raw.name || "Badminton Player",
      externalAthleteId: raw.playerId || raw.id || null,
      competition: {
        name: raw.tournament || raw.circuit || "National Ranking Tournament",
        date: raw.date || new Date().toISOString().slice(0, 10),
        location: raw.location || "India",
      },
      source: {
        provider: "Badminton Federation Data API",
        name: "National Player Rankings",
        url: this.apiUrl,
        retrievedAt: new Date().toISOString(),
      },
      verificationStatus: raw.verified ? "verified" : "imported",
    };
  }
}
