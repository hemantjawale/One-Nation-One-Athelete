import {
  buildPerformanceComparisonFilters,
  normalizeStateName,
  normalizeDistrictName,
} from "./sports.js";
import { AthleticsProvider } from "./providers/AthleticsProvider.js";
import { BadmintonProvider } from "./providers/BadmintonProvider.js";
import { MultiSportProvider } from "./providers/MultiSportProvider.js";
import { InternalBenchmarkProvider } from "./providers/InternalBenchmarkProvider.js";
import { NationalRecordsPdfProvider } from "./providers/NationalRecordsPdfProvider.js";
import { MaharashtraStatePdfProvider } from "./providers/MaharashtraStatePdfProvider.js";
import {
  findOfficialNationalRecord,
  findYouthNationalRecord,
  VERIFIED_AFI_NATIONAL_RECORDS,
} from "./nationalRecordsPdfParser.js";
import { findMaharashtraStateBest } from "./maharashtraStateRecordsParser.js";

// In-memory benchmark cache with TTL (15 minutes)
const CACHE_TTL_MS = 15 * 60 * 1000;
const benchmarkCache = new Map();

/**
 * Generates deterministic cache key for given comparison filters
 */
export function buildCacheKey(filters) {
  if (!filters) return "benchmark:none";
  const parts = [
    "benchmark",
    filters.sport || "none",
    filters.discipline || "none",
    filters.event || "none",
    filters.gender || "none",
    filters.ageCategory?.id || "open",
    filters.weightCategory || "none",
    filters.classification || "Open",
    normalizeStateName(filters.state) || "none",
    normalizeDistrictName(filters.district) || "none",
  ];
  return parts.join(":").toLowerCase();
}

/**
 * Calculates percentile value at percentile p (0-100) from an array of numbers
 */
function quantile(sortedArr, p) {
  if (!sortedArr.length) return null;
  const index = (p / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  return Number(
    (sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight).toFixed(2),
  );
}

/**
 * Generates a unique duplicate key for a benchmark record
 */
export function generateDuplicateKey(r) {
  return [
    r.sport || "",
    r.event || "",
    r.gender || "",
    r.ageCategory || "",
    r.weightCategory || "",
    r.classification || "",
    r.level || "",
    r.state || "",
    r.district || "",
    r.athleteName || "",
    r.performance?.value ?? "",
    r.competition?.name || "",
    r.competition?.date || "",
  ]
    .map((s) => String(s).trim().toLowerCase())
    .join("|");
}

/**
 * Calculates detailed statistics for a specific tier cohort
 */
function calculateTierStats(records, athleteBestMetric, direction, tierName) {
  if (!records || records.length === 0) {
    return {
      available: false,
      reason:
        tierName === "District"
          ? "District comparison unavailable: No verified district-level records found for this event/category."
          : `No verified ${tierName.toLowerCase()}-level records found for this event/category.`,
      sampleSize: 0,
      dataQuality: "No data",
      best: null,
      worst: null,
      average: null,
      median: null,
      p25: null,
      p50: null,
      p75: null,
      p90: null,
      rank: null,
      percentile: null,
      gap: null,
      records: [],
      sources: [],
    };
  }

  const values = records.map((r) => r.performance.value).filter((v) => !isNaN(v));
  const lower = direction === "lower_is_better";
  const sortedValues = [...values].sort((a, b) => a - b);
  const count = values.length;

  const best = lower ? Math.min(...values) : Math.max(...values);
  const worst = lower ? Math.max(...values) : Math.min(...values);
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  const average = Number((sum / count).toFixed(2));

  const p25 = quantile(sortedValues, 25);
  const p50 = quantile(sortedValues, 50);
  const p75 = quantile(sortedValues, 75);
  const p90 = quantile(sortedValues, 90);
  const median = p50;

  let rank = null;
  let percentile = null;
  let gap = null;

  if (athleteBestMetric !== null && !isNaN(athleteBestMetric)) {
    // Gap relative to the record / best
    // For lower_is_better (e.g. 100m sprint): athlete 12.21s vs best 11.98s => +0.23s
    // For higher_is_better (e.g. long jump): athlete 6.80m vs best 7.20m => -0.40m
    const rawGap = lower
      ? athleteBestMetric - best
      : athleteBestMetric - best;
    gap = Number(rawGap.toFixed(2));

    // Rank calculation
    const betterThanAthlete = records.filter((r) =>
      lower
        ? r.performance.value < athleteBestMetric
        : r.performance.value > athleteBestMetric,
    ).length;
    rank = betterThanAthlete + 1;

    // Percentile calculation
    // Percentile = percentage of peers athlete outperforms
    const beaten = records.filter((r) =>
      lower
        ? athleteBestMetric < r.performance.value
        : athleteBestMetric > r.performance.value,
    ).length;
    const tied = records.filter((r) => r.performance.value === athleteBestMetric).length;
    percentile = Math.round(((beaten + 0.5 * tied) / count) * 100);
    percentile = Math.max(1, Math.min(99, percentile));
  }

  // Data quality rating based on verified sample size
  const dataQuality =
    count < 3
      ? "Limited data"
      : count < 8
        ? "Moderate data"
        : "Strong dataset";

  const sources = [
    ...new Map(
      records
        .filter((r) => r.source)
        .map((r) => [
          r.source.name || r.source.provider,
          {
            provider: r.source.provider,
            name: r.source.name,
            url: r.source.url,
            verificationStatus: r.verificationStatus || "verified",
          },
        ]),
    ).values(),
  ];

  return {
    available: true,
    sampleSize: count,
    dataQuality,
    best,
    worst,
    average,
    median,
    p25,
    p50,
    p75,
    p90,
    rank,
    percentile,
    gap,
    records: records.slice(0, 10), // Return top preview records
    sources,
  };
}

export class BenchmarkService {
  constructor(db) {
    this.db = db;
    this.providers = [
      new NationalRecordsPdfProvider(),
      new MaharashtraStatePdfProvider(),
      new AthleticsProvider(),
      new BadmintonProvider(),
      new MultiSportProvider(),
      new InternalBenchmarkProvider(db),
    ];
  }

  /**
   * Invalidates cached benchmarks. If userId or filterPrefix provided,
   * invalidates matching entries, otherwise clears cache.
   */
  invalidateCache(filterPrefix = null) {
    if (!filterPrefix) {
      benchmarkCache.clear();
      return;
    }
    const prefix = filterPrefix.toLowerCase();
    for (const key of benchmarkCache.keys()) {
      if (key.includes(prefix)) {
        benchmarkCache.delete(key);
      }
    }
  }

  /**
   * Main automatic comparison engine method
   */
  async getComparison(profile, sessions = []) {
    if (!profile) {
      return { error: "Athlete profile required" };
    }

    const filters = buildPerformanceComparisonFilters(profile);
    if (!filters) {
      return { error: "Unable to build comparison filters from profile" };
    }

    // Weight Category Check:
    // If sport requires weight category and it's missing, DO NOT GUESS.
    if (filters.missingWeight) {
      return {
        athlete: {
          sport: filters.sport,
          event: filters.event,
          gender: filters.gender,
          age: filters.age,
          ageCategory: filters.ageCategory,
          classification: filters.classification,
          weightCategory: null,
          state: filters.state,
          district: filters.district,
          unit: filters.unit,
        },
        missingWeight: true,
        message: "Add your weight category to see an accurate comparison.",
        district: {
          available: false,
          reason: "Add your weight category to see an accurate comparison.",
        },
        state: {
          available: false,
          reason: "Add your weight category to see an accurate comparison.",
        },
        national: {
          available: false,
          reason: "Add your weight category to see an accurate comparison.",
        },
        metadata: {
          sampleSizes: { district: 0, state: 0, national: 0 },
          sources: [],
          updatedAt: new Date().toISOString(),
          dataQuality: {
            district: "No data",
            state: "No data",
            national: "No data",
          },
        },
      };
    }

    // Determine Athlete's Best Personal Metric
    const matchingSessions = sessions.filter((s) => {
      if (s.metric <= 0) return false;
      const sEv = (s.event || "").toLowerCase();
      const fEv = (filters.event || "").toLowerCase();
      const eventMatch = sEv === fEv || sEv.includes(fEv) || fEv.includes(sEv);
      return eventMatch && s.unit === filters.unit;
    });

    const lower = filters.direction === "lower_is_better";
    const athleteBestMetric = matchingSessions.length
      ? (lower ? Math.min : Math.max)(...matchingSessions.map((s) => s.metric))
      : null;

    // Check Cache
    const cacheKey = buildCacheKey(filters);
    const cached = benchmarkCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      // Recompute athlete personal rank/gap against cached records if sessions changed
      return {
        ...cached.data,
        athlete: {
          ...cached.data.athlete,
          personalBest: athleteBestMetric,
        },
      };
    }

    // Gather records across providers
    let allRecords = [];
    for (const provider of this.providers) {
      if (provider.supports(filters)) {
        try {
          const rows = await provider.fetchRecords(filters);
          if (Array.isArray(rows)) {
            allRecords.push(...rows);
          }
        } catch (_err) {
          // Failure in one provider must not break other providers
        }
      }
    }

    // Deduplicate records
    const seen = new Set();
    const uniqueRecords = [];
    for (const r of allRecords) {
      const key = r.id || generateDuplicateKey(r);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueRecords.push(r);
      }
    }

    // Segregate records into District, State, and National tiers
    const normFilterState = normalizeStateName(filters.state);
    const normFilterDist = normalizeDistrictName(filters.district);

    const districtRecords = uniqueRecords.filter((r) => {
      if (r.level !== "district") return false;
      if (!normFilterState || !normFilterDist) return false;
      const matchState = normalizeStateName(r.state).toLowerCase() === normFilterState.toLowerCase();
      const matchDist = normalizeDistrictName(r.district).toLowerCase() === normFilterDist.toLowerCase();
      return matchState && matchDist;
    });

    const stateRecords = uniqueRecords.filter((r) => {
      if (r.level !== "state" && r.level !== "district") return false;
      if (!normFilterState) return false;
      return normalizeStateName(r.state).toLowerCase() === normFilterState.toLowerCase();
    });

    const nationalRecords = uniqueRecords.filter((r) => {
      return r.level === "national" || r.level === "state" || r.level === "district";
    });

    // Compute statistical metrics for each tier
    const districtStats = calculateTierStats(
      districtRecords,
      athleteBestMetric,
      filters.direction,
      "District",
    );
    const stateStats = calculateTierStats(
      stateRecords,
      athleteBestMetric,
      filters.direction,
      "State",
    );
    const nationalStats = calculateTierStats(
      nationalRecords,
      athleteBestMetric,
      filters.direction,
      "National",
    );

    // Official AFI National Record and Youth Record directly from PDF
    const officialNR = findOfficialNationalRecord({
      event: filters.event,
      gender: filters.gender,
      ageCategory: filters.ageCategory?.id,
    });
    const youthNR = findYouthNationalRecord({
      event: filters.event,
      gender: filters.gender,
    });

    let nationalRecordDetails = null;
    if (officialNR) {
      const nrGap =
        athleteBestMetric !== null && !isNaN(athleteBestMetric)
          ? lower
            ? athleteBestMetric - officialNR.performance.value
            : athleteBestMetric - officialNR.performance.value
          : null;
      nationalRecordDetails = {
        ...officialNR,
        gap: nrGap !== null ? Number(nrGap.toFixed(2)) : null,
      };
    }

    let youthRecordDetails = null;
    if (youthNR) {
      const yGap =
        athleteBestMetric !== null && !isNaN(athleteBestMetric)
          ? lower
            ? athleteBestMetric - youthNR.performance.value
            : athleteBestMetric - youthNR.performance.value
          : null;
      youthRecordDetails = {
        ...youthNR,
        gap: yGap !== null ? Number(yGap.toFixed(2)) : null,
      };
    }

    // Embed into nationalStats
    if (nationalRecordDetails) {
      nationalStats.nationalRecord = nationalRecordDetails;
      if (nationalStats.best === null || (lower ? nationalRecordDetails.performance.value < nationalStats.best : nationalRecordDetails.performance.value > nationalStats.best)) {
        nationalStats.best = nationalRecordDetails.performance.value;
      }
    }
    if (youthRecordDetails) {
      nationalStats.youthNationalRecord = youthRecordDetails;
    }

    // Maharashtra State Best (from official MAA PDF)
    if (normFilterState.toLowerCase() === "maharashtra") {
      const mahaStateBest = findMaharashtraStateBest({
        event: filters.event,
        gender: filters.gender,
        ageCategory: filters.ageCategory?.id,
      });
      if (mahaStateBest) {
        const msGap =
          athleteBestMetric !== null && !isNaN(athleteBestMetric)
            ? lower
              ? athleteBestMetric - mahaStateBest.performance.value
              : athleteBestMetric - mahaStateBest.performance.value
            : null;
        stateStats.stateRecord = {
          ...mahaStateBest,
          gap: msGap !== null ? Number(msGap.toFixed(2)) : null,
        };
      }
    }

    const allSources = [
      ...new Map(
        uniqueRecords
          .filter((r) => r.source)
          .map((r) => [
            r.source.name || r.source.provider,
            {
              provider: r.source.provider,
              name: r.source.name,
              url: r.source.url,
              verificationStatus: r.verificationStatus || "verified",
            },
          ]),
      ).values(),
    ];

    const result = {
      athlete: {
        sport: filters.sport,
        discipline: filters.discipline,
        event: filters.event,
        gender: filters.gender,
        age: filters.age,
        ageCategory: filters.ageCategory,
        classification: filters.classification,
        weightCategory: filters.weightCategory,
        state: filters.state,
        district: filters.district,
        unit: filters.unit,
        direction: filters.direction,
        personalBest: athleteBestMetric,
      },
      district: districtStats,
      state: stateStats,
      national: nationalStats,
      nationalRecord: nationalRecordDetails,
      youthNationalRecord: youthRecordDetails,
      metadata: {
        sampleSizes: {
          district: districtStats.sampleSize,
          state: stateStats.sampleSize,
          national: nationalStats.sampleSize,
        },
        sources: allSources,
        updatedAt: new Date().toISOString(),
        dataQuality: {
          district: districtStats.dataQuality,
          state: stateStats.dataQuality,
          national: nationalStats.dataQuality,
        },
      },
    };

    // Store in cache
    benchmarkCache.set(cacheKey, { data: result, timestamp: Date.now() });

    return result;
  }

  /**
   * Returns all official AFI National Records parsed from public/records/National/*.pdf
   */
  getNationalRecordsCatalog() {
    return VERIFIED_AFI_NATIONAL_RECORDS;
  }

  /**
   * Admin bulk import for verified benchmark records
   */
  async importRecords(records) {
    if (!Array.isArray(records) || records.length === 0) {
      return { imported: 0, skipped: 0, errors: ["No records provided"] };
    }

    const existing = await this.db.list("benchmarks");
    const existingKeys = new Set(existing.map((r) => generateDuplicateKey(r)));

    let imported = 0;
    let skipped = 0;
    const errors = [];

    for (const r of records) {
      if (!r.sport || !r.event || !r.level || !r.performance?.value) {
        skipped++;
        errors.push(`Record missing required fields: ${JSON.stringify(r)}`);
        continue;
      }

      const dupKey = generateDuplicateKey(r);
      if (existingKeys.has(dupKey)) {
        skipped++;
        continue;
      }

      const row = {
        ...r,
        verificationStatus: r.verificationStatus || "verified",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await this.db.put("benchmarks", row);
      existingKeys.add(dupKey);
      imported++;
    }

    // Invalidate caches when new benchmarks are imported
    this.invalidateCache();

    return { imported, skipped, total: records.length, errors };
  }
}
