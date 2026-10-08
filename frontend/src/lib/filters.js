// Reusable, timezone-safe date and journey filtering utilities

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const QUICK_FILTERS = [
  { id: "all", label: "All Time" },
  { id: "this_month", label: "This Month" },
  { id: "last_month", label: "Last Month" },
  { id: "last_3_months", label: "Last 3 Months" },
  { id: "this_year", label: "This Year" },
  { id: "last_year", label: "Last Year" },
  { id: "custom", label: "Custom Range" },
];

/**
 * Returns today's ISO date string (YYYY-MM-DD) based on local browser time (India standard friendly)
 */
export function getLocalToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates start and end ISO dates for a given quick filter
 */
export function getQuickFilterRange(quickFilterId) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed

  switch (quickFilterId) {
    case "this_month": {
      const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { from: start, to: end };
    }
    case "last_month": {
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const start = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
      const end = `${prevYear}-${String(prevMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { from: start, to: end };
    }
    case "last_3_months": {
      const threeMonthsAgo = new Date(year, month - 2, 1);
      const start = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { from: start, to: end };
    }
    case "this_year": {
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    }
    case "last_year": {
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
    }
    case "all":
    default:
      return { from: "", to: "" };
  }
}

/**
 * Filter an array of records (sessions, achievements, injuries) by date and criteria
 */
export function filterRecords(records, filters = {}) {
  const {
    quickFilter = "all",
    year = "",
    month = "",
    from = "",
    to = "",
    kind = "all",
    event = "",
  } = filters;

  // Determine effective date range
  let effectiveFrom = from;
  let effectiveTo = to;

  if (quickFilter !== "all" && quickFilter !== "custom") {
    const range = getQuickFilterRange(quickFilter);
    effectiveFrom = range.from;
    effectiveTo = range.to;
  } else if (year) {
    if (month) {
      const padM = String(month).padStart(2, "0");
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      effectiveFrom = `${year}-${padM}-01`;
      effectiveTo = `${year}-${padM}-${String(lastDay).padStart(2, "0")}`;
    } else {
      effectiveFrom = `${year}-01-01`;
      effectiveTo = `${year}-12-31`;
    }
  }

  return records.filter((r) => {
    // Filter by kind (sessions, achievements, injuries)
    if (kind !== "all" && r.kind !== kind) return false;

    // Filter by event/discipline
    if (event && r.event && r.event.toLowerCase() !== event.toLowerCase()) return false;

    // Date filtering (records must have ISO date YYYY-MM-DD)
    if (!r.date) return true;

    if (effectiveFrom && r.date < effectiveFrom) return false;
    if (effectiveTo && r.date > effectiveTo) return false;

    return true;
  });
}

/**
 * Generates human readable title of active filter (e.g. "October 2026")
 */
export function getFilterLabel(filters = {}) {
  const { quickFilter, year, month, from, to } = filters;

  if (quickFilter && quickFilter !== "all" && quickFilter !== "custom") {
    const found = QUICK_FILTERS.find((q) => q.id === quickFilter);
    if (found) return found.label;
  }

  if (year && month) {
    const mName = MONTH_NAMES[Number(month) - 1] || `Month ${month}`;
    return `${mName} ${year}`;
  }

  if (year) return `Year ${year}`;

  if (from && to) {
    return `${from} to ${to}`;
  }
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;

  return "All Time";
}

/**
 * Computes summary statistics for a filtered set of records
 */
export function calculateJourneySummary(records = [], profile = {}) {
  const sessions = records.filter((r) => r.kind === "sessions");
  const achievements = records.filter((r) => r.kind === "achievements");
  const injuries = records.filter((r) => r.kind === "injuries");

  const totalDuration = sessions.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
  const totalHours = Math.floor(totalDuration / 60);
  const remainingMins = totalDuration % 60;

  const validMetrics = sessions.filter((s) => s.metric && Number(s.metric) > 0);
  const avgMetric = validMetrics.length
    ? (validMetrics.reduce((acc, s) => acc + Number(s.metric), 0) / validMetrics.length).toFixed(2)
    : null;

  const verifiedSessions = sessions.filter((s) => s.verified).length;
  const verifiedAchievements = achievements.filter((a) => a.verified).length;

  return {
    totalRecords: records.length,
    sessionsCount: sessions.length,
    achievementsCount: achievements.length,
    injuriesCount: injuries.length,
    totalDurationMinutes: totalDuration,
    formattedDuration: `${totalHours}h ${remainingMins}m`,
    avgMetric,
    unit: profile.unit || "",
    verifiedSessions,
    verifiedAchievements,
  };
}
