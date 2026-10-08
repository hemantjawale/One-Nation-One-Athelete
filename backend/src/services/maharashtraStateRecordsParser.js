/**
 * maharashtraStateRecordsParser.js
 *
 * Verified Maharashtra state-level athletics competition results parsed directly
 * from the official PDF stored in:
 *   public/records/state/Maharashtra_State_Sprint_Results_Research(1).pdf
 *
 * Source: Maharashtra Athletics Association (MAA), affiliated to AFI.
 * These are COMPETITION RESULTS, not official state records (unless separately
 * verified from the federation's record list).
 *
 * Data includes:
 *   - Maharashtra State Senior Athletics Championships 2024, Nagpur (1–3 Jun 2024)
 *   - Maharashtra State Senior Athletics Championship 2023, Pune (21–23 May 2023)
 *   - Maharashtra State Senior (U23) Athletics Meet 2024, Ulwe (14–15 Sep 2024)
 *   - 39th Maharashtra State Junior Athletics Championships 2025, Pune (2–5 Sep 2025)
 */

const SOURCE_PDF = {
  provider: "MAA",
  name: "Maharashtra Athletics Association Official Competition Results",
  url: "/records/state/Maharashtra_State_Sprint_Results_Research(1).pdf",
  pdfFile: "Maharashtra_State_Sprint_Results_Research(1).pdf",
};

function makeId(prefix, event, gender, year, pos) {
  return `maa-${prefix}-${event.replace(/\s+/g, "")}-${gender[0].toLowerCase()}-${year}-p${pos}`;
}

function makeRecord({
  prefix, event, gender, ageCategory, classification,
  pos, athlete, district, time,
  competition, competitionDate, location, year,
}) {
  return {
    id: makeId(prefix, event, gender, year, pos),
    sport: "Athletics",
    discipline: "Sprint",
    event,
    gender,
    ageCategory,
    classification,
    level: "state",
    country: "India",
    state: "Maharashtra",
    district: district || null,
    performance: {
      value: time,
      display: `${time}s`,
      metricType: "time",
      unit: "sec",
      direction: "lower_is_better",
    },
    athleteName: athlete,
    competition: { name: competition, date: competitionDate, location },
    round: "Final",
    source: { ...SOURCE_PDF, asOfDate: "2026-10-08" },
    verificationStatus: "verified_official",
  };
}

// ─── Maharashtra State Senior Athletics Championships 2024 — Nagpur ──────────
const SENIOR_2024_COMPETITION = "Maharashtra State Senior Athletics Championships 2024";
const SENIOR_2024_DATE = "2024-06-01";
const SENIOR_2024_LOCATION = "Nagpur, Maharashtra";

const SENIOR_2024_MEN_100M = [
  { pos: 1, athlete: "Gopal Palandurkar", district: "Nagpur", time: 10.71 },
  { pos: 2, athlete: "Pranav Gurav", district: "Poona", time: 10.76 },
  { pos: 3, athlete: "Adarsh Bhure", district: "Nagpur", time: 10.80 },
  { pos: 4, athlete: "Jay Shah", district: "Bombay City", time: 10.83 },
  { pos: 5, athlete: "Sahib Singh", district: "Mumbai Suburban", time: 10.86 },
  { pos: 6, athlete: "Nayan S. Shah", district: "Palghar", time: 10.87 },
  { pos: 7, athlete: "Vinit Dinkar", district: "Solapur", time: 10.88 },
  { pos: 8, athlete: "Smith S. D'souza", district: "Palghar", time: 10.98 },
].map((r) =>
  makeRecord({
    ...r, prefix: "sr24", event: "100m", gender: "Male",
    ageCategory: "open", classification: "Open", year: 2024,
    competition: SENIOR_2024_COMPETITION, competitionDate: SENIOR_2024_DATE,
    location: SENIOR_2024_LOCATION,
  }),
);

const SENIOR_2024_WOMEN_100M = [
  { pos: 1, athlete: "Sudeshna Shivankar", district: "Satara", time: 11.89 },
  { pos: 2, athlete: "Avantika Narale", district: "Poona", time: 12.14 },
  { pos: 3, athlete: "Saroj Shetty", district: "Bombay City", time: 12.37 },
  { pos: 4, athlete: "Aliza Mulla", district: "Thane", time: 12.44 },
  { pos: 5, athlete: "Rujula Bhonsle", district: "Poona", time: 12.46 },
  { pos: 6, athlete: "Manjusha S. Shetty", district: "Palghar", time: 12.51 },
  { pos: 7, athlete: "Chaarvi Poojari", district: "Thane", time: 12.54 },
  { pos: 8, athlete: "Aditi Parab", district: "Mumbai Suburban", time: 12.64 },
].map((r) =>
  makeRecord({
    ...r, prefix: "sr24", event: "100m", gender: "Female",
    ageCategory: "open", classification: "Open", year: 2024,
    competition: SENIOR_2024_COMPETITION, competitionDate: SENIOR_2024_DATE,
    location: SENIOR_2024_LOCATION,
  }),
);

// ─── Maharashtra State Senior Athletics Championship 2023 — Pune ─────────────
const SENIOR_2023_COMPETITION = "71st Maharashtra State Senior Athletics Championship 2023";
const SENIOR_2023_DATE = "2023-05-21";
const SENIOR_2023_LOCATION = "Pune, Maharashtra";

const SENIOR_2023_WOMEN_100M = [
  { pos: 1, athlete: "Avantika S Narale", district: "Poona", time: 11.78 },
  { pos: 2, athlete: "Sudeshna H Shivankar", district: "Satara", time: 12.16 },
  { pos: 3, athlete: "Saroj Pushparaj Shetty", district: "Bombay City", time: 12.32 },
  { pos: 4, athlete: "Nameira Nizamud Shaikh", district: "Mumbai Suburban", time: 12.42 },
  { pos: 5, athlete: "Chaitrali Kalid Gujar", district: "Satara", time: 12.47 },
  { pos: 6, athlete: "Sai Sunil Sawant", district: "Thane", time: 12.70 },
  { pos: 7, athlete: "Sanika Prashant Nate", district: "Thane", time: 12.95 },
  { pos: 8, athlete: "Akshaya Ganesh Iyer", district: "Raigad", time: 12.97 },
].map((r) =>
  makeRecord({
    ...r, prefix: "sr23", event: "100m", gender: "Female",
    ageCategory: "open", classification: "Open", year: 2023,
    competition: SENIOR_2023_COMPETITION, competitionDate: SENIOR_2023_DATE,
    location: SENIOR_2023_LOCATION,
  }),
);

// ─── Maharashtra State Senior (U23) Athletics Meet 2024 — Ulwe ───────────────
const U23_2024_COMPETITION = "Maharashtra State Senior (U23) Athletics Meet 2024";
const U23_2024_DATE = "2024-09-14";
const U23_2024_LOCATION = "Jio Institute, Ulwe, Maharashtra";

const U23_2024_MEN_100M = [
  { pos: 1, athlete: "Ajay Khade", district: "Kolhapur", time: 11.12 },
  { pos: 2, athlete: "Shantanu Singh", district: "Amravati", time: 11.13 },
  { pos: 3, athlete: "Pratham Kotiyan", district: "Thane", time: 11.14 },
  { pos: 4, athlete: "Aryan Francis", district: "Poona", time: 11.21 },
  { pos: 5, athlete: "Vinit Dinkar", district: "Solapur", time: 11.22 },
  { pos: 6, athlete: "Prashant Patil", district: "Dhule", time: 11.40 },
  { pos: 7, athlete: "Om Lokegaonkar", district: "Mumbai Suburban", time: 11.41 },
  { pos: 8, athlete: "Shreyash Malusare", district: "Raigad", time: 11.56 },
].map((r) =>
  makeRecord({
    ...r, prefix: "u23-24", event: "100m", gender: "Male",
    ageCategory: "u23", classification: "U23", year: 2024,
    competition: U23_2024_COMPETITION, competitionDate: U23_2024_DATE,
    location: U23_2024_LOCATION,
  }),
);

const U23_2024_MEN_200M = [
  { pos: 1, athlete: "Ajay Khade", district: "Kolhapur", time: 22.03 },
  { pos: 2, athlete: "Vinit Dinkar", district: "Solapur", time: 22.04 },
  { pos: 3, athlete: "Shailesh Parshu Mokal", district: "Raigad", time: 22.42 },
  { pos: 4, athlete: "Pratham Kotiyan", district: "Thane", time: 22.57 },
  { pos: 5, athlete: "Piyush Sonar", district: "Nashik", time: 22.62 },
  { pos: 6, athlete: "Sarthak Chavan", district: "Poona", time: 23.05 },
  { pos: 7, athlete: "Sumit Gaikwad", district: "Nashik", time: 23.12 },
  { pos: 8, athlete: "Omkar Dahiphale", district: "Ahmednagar", time: 23.28 },
].map((r) =>
  makeRecord({
    ...r, prefix: "u23-24", event: "200m", gender: "Male",
    ageCategory: "u23", classification: "U23", year: 2024,
    competition: U23_2024_COMPETITION, competitionDate: U23_2024_DATE,
    location: U23_2024_LOCATION,
  }),
);

// ─── 39th Maharashtra State Junior Athletics Championships 2025 — Pune ───────
const JR_2025_COMPETITION = "39th Maharashtra State Junior Athletics Championships 2025";
const JR_2025_DATE = "2025-09-02";
const JR_2025_LOCATION = "Shiv Chhatrapati Sports Complex, Mahalunge–Balewadi, Pune, Maharashtra";

const JR_2025_MEN_U20_100M = [
  { pos: 1, athlete: "Aadi Poojary", district: "Bombay City", time: 10.65 },
  { pos: 2, athlete: "Arnav Takalkar", district: "Poona", time: 10.66 },
  { pos: 3, athlete: "Soham Mokal", district: "Raigad", time: 10.73 },
  { pos: 4, athlete: "Kshitij Changire", district: "Poona", time: 10.74 },
  { pos: 5, athlete: "Rudra Shinde", district: "Thane", time: 10.75 },
  { pos: 6, athlete: "Bhavishya Wagh", district: "Nashik", time: 10.80 },
  { pos: 7, athlete: "Laxman Rathod", district: "Aurangabad", time: 11.30 },
  // Saif Chafekar — DNS, excluded from numeric rankings
].map((r) =>
  makeRecord({
    ...r, prefix: "jr25", event: "100m", gender: "Male",
    ageCategory: "u20", classification: "U20", year: 2025,
    competition: JR_2025_COMPETITION, competitionDate: JR_2025_DATE,
    location: JR_2025_LOCATION,
  }),
);

const JR_2025_WOMEN_U20_100M = [
  { pos: 1, athlete: "Rujula Bhonsle", district: "Poona", time: 12.10 },
  { pos: 2, athlete: "Gauravi Naik", district: "Poona", time: 12.13 },
  { pos: 3, athlete: "Divyangi Lande", district: "Ahmednagar", time: 12.21 },
  { pos: 4, athlete: "Aliza Mulla", district: "Thane", time: 12.44 },
  { pos: 5, athlete: "Pooja Rathod", district: "Solapur", time: 12.47 },
  { pos: 6, athlete: "Siya Sawant", district: "Bombay City", time: 12.70 },
  { pos: 7, athlete: "Poonam Bangale", district: "Buldana", time: 13.01 },
  { pos: 8, athlete: "Srilakshmi V.M", district: "Raigad", time: 13.04 },
].map((r) =>
  makeRecord({
    ...r, prefix: "jr25", event: "100m", gender: "Female",
    ageCategory: "u20", classification: "U20", year: 2025,
    competition: JR_2025_COMPETITION, competitionDate: JR_2025_DATE,
    location: JR_2025_LOCATION,
  }),
);

// ─── Combined export ─────────────────────────────────────────────────────────
export const VERIFIED_MAA_STATE_RECORDS = [
  ...SENIOR_2024_MEN_100M,
  ...SENIOR_2024_WOMEN_100M,
  ...SENIOR_2023_WOMEN_100M,
  ...U23_2024_MEN_100M,
  ...U23_2024_MEN_200M,
  ...JR_2025_MEN_U20_100M,
  ...JR_2025_WOMEN_U20_100M,
];

/**
 * All unique Maharashtra districts found in the competition results.
 * Useful for district-level drill-down lookups.
 */
export const MAA_DISTRICTS = [
  ...new Set(VERIFIED_MAA_STATE_RECORDS.map((r) => r.district).filter(Boolean)),
].sort();

/**
 * Finds the best Maharashtra state result for a given event/gender/ageCategory.
 * Returns the single best (fastest) verified result, or null if unavailable.
 */
export function findMaharashtraStateBest({ event, gender, ageCategory }) {
  const ev = (event || "").toLowerCase().trim();
  const g = (gender || "").toLowerCase().trim();
  const isMale = g === "male" || g === "m" || g === "boys";
  const reqAge = (ageCategory || "").toLowerCase();

  const matches = VERIFIED_MAA_STATE_RECORDS.filter((r) => {
    const rEv = r.event.toLowerCase();
    if (rEv !== ev && !rEv.includes(ev) && !ev.includes(rEv)) return false;

    const rG = r.gender.toLowerCase();
    if (isMale ? rG !== "male" : rG !== "female") return false;

    // Age category matching: include both specific and open records
    if (reqAge === "u18") {
      return r.ageCategory === "u18" || r.ageCategory === "u20" || r.ageCategory === "open";
    }
    if (reqAge === "u20") {
      return r.ageCategory === "u20" || r.ageCategory === "open";
    }
    if (reqAge === "u23") {
      return r.ageCategory === "u23" || r.ageCategory === "open";
    }
    return r.ageCategory === "open" || !r.ageCategory;
  });

  if (matches.length === 0) return null;
  return matches.reduce((best, cur) =>
    cur.performance.value < best.performance.value ? cur : best,
  );
}
