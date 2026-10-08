/**
 * Centralized Sport Configuration & Metadata System
 * Supports hierarchical sport structures, measurement derivation,
 * age category resolution, weight validation, and profile normalization.
 */

export const sportsRegistry = {
  Athletics: {
    id: "athletics",
    name: "Athletics",
    hierarchyType: "track_field",
    ageCategories: [
      { id: "u14", name: "Under-14", label: "U14", minAge: 10, maxAge: 13 },
      { id: "u16", name: "Under-16", label: "U16", minAge: 14, maxAge: 15 },
      { id: "u18", name: "Under-18", label: "U18", minAge: 16, maxAge: 17 },
      { id: "u20", name: "Under-20", label: "U20", minAge: 18, maxAge: 19 },
      { id: "senior", name: "Senior", label: "Senior", minAge: 20, maxAge: 34 },
      { id: "masters", name: "Masters", label: "Masters (35+)", minAge: 35, maxAge: null },
    ],
    disciplines: [
      {
        id: "sprint",
        name: "Sprint",
        category: "Track Events",
        events: ["60m", "100m", "200m", "400m"],
        measurement: { type: "time", unit: "sec", unitLabel: "seconds", direction: "lower_is_better" },
      },
      {
        id: "middle-distance",
        name: "Middle Distance",
        category: "Track Events",
        events: ["800m", "1500m", "3000m"],
        measurement: { type: "time", unit: "sec", unitLabel: "seconds", direction: "lower_is_better" },
      },
      {
        id: "long-distance",
        name: "Long Distance",
        category: "Track Events",
        events: ["5000m", "10000m", "Marathon"],
        measurement: { type: "time", unit: "sec", unitLabel: "seconds", direction: "lower_is_better" },
      },
      {
        id: "hurdles",
        name: "Hurdles",
        category: "Track Events",
        events: ["100m Hurdles", "110m Hurdles", "400m Hurdles"],
        measurement: { type: "time", unit: "sec", unitLabel: "seconds", direction: "lower_is_better" },
      },
      {
        id: "relays",
        name: "Relays",
        category: "Track Events",
        events: ["4x100m", "4x400m"],
        measurement: { type: "time", unit: "sec", unitLabel: "seconds", direction: "lower_is_better" },
      },
      {
        id: "jumps",
        name: "Jumps",
        category: "Field Events",
        events: ["High Jump", "Long Jump", "Triple Jump", "Pole Vault"],
        measurement: { type: "distance", unit: "m", unitLabel: "meters", direction: "higher_is_better" },
      },
      {
        id: "throws",
        name: "Throws",
        category: "Field Events",
        events: ["Shot Put", "Discus Throw", "Javelin Throw", "Hammer Throw"],
        measurement: { type: "distance", unit: "m", unitLabel: "meters", direction: "higher_is_better" },
      },
      {
        id: "combined",
        name: "Combined Events",
        category: "Combined Events",
        events: ["Decathlon", "Heptathlon"],
        measurement: { type: "score", unit: "points", unitLabel: "points", direction: "higher_is_better" },
      },
      {
        id: "race-walk",
        name: "Race Walking",
        category: "Road / Track",
        events: ["20 km Race Walk", "35 km Race Walk"],
        measurement: { type: "time", unit: "sec", unitLabel: "seconds", direction: "lower_is_better" },
      },
    ],
  },

  Badminton: {
    id: "badminton",
    name: "Badminton",
    hierarchyType: "racket",
    ageCategories: [
      { id: "u13", name: "Under-13", label: "U13", minAge: 9, maxAge: 12 },
      { id: "u15", name: "Under-15", label: "U15", minAge: 13, maxAge: 14 },
      { id: "u17", name: "Under-17", label: "U17", minAge: 15, maxAge: 16 },
      { id: "u19", name: "Under-19", label: "U19", minAge: 17, maxAge: 18 },
      { id: "senior", name: "Senior", label: "Senior", minAge: 19, maxAge: 34 },
      { id: "masters", name: "Masters", label: "Masters (35+)", minAge: 35, maxAge: null },
    ],
    formats: [
      {
        id: "singles",
        name: "Singles",
        events: ["Men's Singles", "Women's Singles", "Open Singles"],
      },
      {
        id: "doubles",
        name: "Doubles",
        events: ["Men's Doubles", "Women's Doubles", "Mixed Doubles"],
      },
    ],
    measurement: { type: "score", unit: "points", unitLabel: "ranking / points", direction: "higher_is_better", optional: true },
  },

  Football: {
    id: "football",
    name: "Football",
    hierarchyType: "team_field",
    ageCategories: [
      { id: "u14", name: "Under-14", label: "U14", minAge: 10, maxAge: 13 },
      { id: "u16", name: "Under-16", label: "U16", minAge: 14, maxAge: 15 },
      { id: "u19", name: "Under-19", label: "U19", minAge: 16, maxAge: 18 },
      { id: "u23", name: "Under-23", label: "U23", minAge: 19, maxAge: 22 },
      { id: "senior", name: "Senior", label: "Senior", minAge: 23, maxAge: null },
    ],
    positionGroups: [
      {
        id: "goalkeeper",
        name: "Goalkeeper",
        positions: ["Goalkeeper"],
      },
      {
        id: "defender",
        name: "Defender",
        positions: ["Centre Back", "Full Back", "Wing Back"],
      },
      {
        id: "midfielder",
        name: "Midfielder",
        positions: ["Defensive Midfielder", "Central Midfielder", "Attacking Midfielder"],
      },
      {
        id: "forward",
        name: "Forward",
        positions: ["Winger", "Striker", "Centre Forward"],
      },
    ],
    measurement: { type: "score", unit: "points", unitLabel: "rating / score", direction: "higher_is_better", optional: true },
  },

  Basketball: {
    id: "basketball",
    name: "Basketball",
    hierarchyType: "team_court",
    ageCategories: [
      { id: "u14", name: "Under-14", label: "U14", minAge: 10, maxAge: 13 },
      { id: "u16", name: "Under-16", label: "U16", minAge: 14, maxAge: 15 },
      { id: "u19", name: "Under-19", label: "U19", minAge: 16, maxAge: 18 },
      { id: "senior", name: "Senior", label: "Senior", minAge: 19, maxAge: null },
    ],
    positionGroups: [
      {
        id: "guard",
        name: "Guard",
        positions: ["Point Guard", "Shooting Guard"],
      },
      {
        id: "forward",
        name: "Forward",
        positions: ["Small Forward", "Power Forward"],
      },
      {
        id: "center",
        name: "Center",
        positions: ["Center"],
      },
    ],
    measurement: { type: "score", unit: "points", unitLabel: "points per game", direction: "higher_is_better", optional: true },
  },

  Cricket: {
    id: "cricket",
    name: "Cricket",
    hierarchyType: "cricket",
    ageCategories: [
      { id: "u14", name: "Under-14", label: "U14", minAge: 10, maxAge: 13 },
      { id: "u16", name: "Under-16", label: "U16", minAge: 14, maxAge: 15 },
      { id: "u19", name: "Under-19", label: "U19", minAge: 16, maxAge: 18 },
      { id: "u23", name: "Under-23", label: "U23", minAge: 19, maxAge: 22 },
      { id: "senior", name: "Senior", label: "Senior", minAge: 23, maxAge: null },
    ],
    roles: [
      {
        id: "batter",
        name: "Batter",
        specializations: ["Top Order", "Middle Order", "Opener", "Finisher"],
      },
      {
        id: "bowler",
        name: "Bowler",
        specializations: ["Fast", "Fast-Medium", "Medium Pace", "Off Spin", "Leg Spin", "Left Arm Spin"],
      },
      {
        id: "all-rounder",
        name: "All-rounder",
        specializations: ["Batting All-rounder", "Bowling All-rounder", "Spin All-rounder", "Pace All-rounder"],
      },
      {
        id: "wicketkeeper-batter",
        name: "Wicketkeeper-Batter",
        specializations: ["Wicketkeeper-Batter"],
      },
    ],
    battingStyles: ["Right-hand bat", "Left-hand bat"],
    bowlingStyles: ["Right-arm fast", "Right-arm medium", "Right-arm spin", "Left-arm fast", "Left-arm spin", "None / Occasional"],
    measurement: { type: "score", unit: "points", unitLabel: "rating / average", direction: "higher_is_better", optional: true },
  },

  Swimming: {
    id: "swimming",
    name: "Swimming",
    hierarchyType: "swimming",
    ageCategories: [
      { id: "u12", name: "Group IV", label: "U12 (Group IV)", minAge: 9, maxAge: 11 },
      { id: "u14", name: "Group III", label: "U14 (Group III)", minAge: 12, maxAge: 13 },
      { id: "u17", name: "Group I/II", label: "U17 (Group I/II)", minAge: 14, maxAge: 17 },
      { id: "senior", name: "Senior", label: "Senior (18+)", minAge: 18, maxAge: null },
    ],
    strokes: [
      { id: "freestyle", name: "Freestyle" },
      { id: "backstroke", name: "Backstroke" },
      { id: "breaststroke", name: "Breaststroke" },
      { id: "butterfly", name: "Butterfly" },
      { id: "medley", name: "Individual Medley" },
    ],
    distances: ["50m", "100m", "200m", "400m", "800m", "1500m"],
    measurement: { type: "time", unit: "sec", unitLabel: "seconds", direction: "lower_is_better" },
  },

  Shooting: {
    id: "shooting",
    name: "Shooting",
    hierarchyType: "target",
    ageCategories: [
      { id: "sub_junior", name: "Sub-Junior", label: "Sub-Junior (U15)", minAge: 10, maxAge: 14 },
      { id: "youth", name: "Youth", label: "Youth (U18)", minAge: 15, maxAge: 17 },
      { id: "junior", name: "Junior", label: "Junior (U21)", minAge: 18, maxAge: 20 },
      { id: "senior", name: "Senior", label: "Senior", minAge: 21, maxAge: null },
    ],
    disciplines: [
      {
        id: "rifle",
        name: "Rifle",
        events: ["10m Air Rifle", "50m Rifle 3 Positions", "50m Rifle Prone"],
      },
      {
        id: "pistol",
        name: "Pistol",
        events: ["10m Air Pistol", "25m Rapid Fire Pistol", "25m Pistol", "50m Pistol"],
      },
      {
        id: "shotgun",
        name: "Shotgun",
        events: ["Trap", "Skeet", "Double Trap"],
      },
    ],
    measurement: { type: "score", unit: "points", unitLabel: "points / score", direction: "higher_is_better" },
  },

  Archery: {
    id: "archery",
    name: "Archery",
    hierarchyType: "archery",
    ageCategories: [
      { id: "sub_junior", name: "Sub-Junior", label: "Sub-Junior (U15)", minAge: 10, maxAge: 14 },
      { id: "youth", name: "Youth", label: "Youth (U18)", minAge: 15, maxAge: 17 },
      { id: "junior", name: "Junior", label: "Junior (U21)", minAge: 18, maxAge: 20 },
      { id: "senior", name: "Senior", label: "Senior", minAge: 21, maxAge: null },
    ],
    categories: [
      { id: "recurve", name: "Recurve", events: ["70m Outdoor", "18m Indoor"] },
      { id: "compound", name: "Compound", events: ["50m Outdoor", "18m Indoor"] },
      { id: "barebow", name: "Barebow", events: ["50m Outdoor", "18m Indoor"] },
    ],
    measurement: { type: "score", unit: "points", unitLabel: "points", direction: "higher_is_better" },
  },

  Wrestling: {
    id: "wrestling",
    name: "Wrestling",
    hierarchyType: "combat",
    isWeightCategorySport: true,
    ageCategories: [
      { id: "u15", name: "U15", label: "Under-15", minAge: 13, maxAge: 14 },
      { id: "u17", name: "Cadet", label: "Cadet (U17)", minAge: 15, maxAge: 16 },
      { id: "u20", name: "Junior", label: "Junior (U20)", minAge: 17, maxAge: 19 },
      { id: "u23", name: "U23", label: "Under-23", minAge: 20, maxAge: 22 },
      { id: "senior", name: "Senior", label: "Senior (23+)", minAge: 23, maxAge: null },
    ],
    styles: [
      {
        id: "freestyle",
        name: "Freestyle",
        weightCategories: ["57 kg", "61 kg", "65 kg", "70 kg", "74 kg", "79 kg", "86 kg", "92 kg", "97 kg", "125 kg"],
      },
      {
        id: "greco-roman",
        name: "Greco-Roman",
        weightCategories: ["55 kg", "60 kg", "63 kg", "67 kg", "72 kg", "77 kg", "82 kg", "87 kg", "97 kg", "130 kg"],
      },
    ],
    measurement: { type: "weight", unit: "kg", unitLabel: "competition weight (kg)", direction: "higher_is_better", optional: true },
  },

  Weightlifting: {
    id: "weightlifting",
    name: "Weightlifting",
    hierarchyType: "strength",
    isWeightCategorySport: true,
    ageCategories: [
      { id: "youth", name: "Youth", label: "Youth (U17)", minAge: 13, maxAge: 17 },
      { id: "junior", name: "Junior", label: "Junior (U20)", minAge: 18, maxAge: 20 },
      { id: "senior", name: "Senior", label: "Senior (21+)", minAge: 21, maxAge: null },
    ],
    weightCategories: {
      Male: ["55 kg", "61 kg", "67 kg", "73 kg", "81 kg", "89 kg", "96 kg", "102 kg", "109 kg", "+109 kg"],
      Female: ["45 kg", "49 kg", "55 kg", "59 kg", "64 kg", "71 kg", "76 kg", "81 kg", "87 kg", "+87 kg"],
      Other: ["55 kg", "61 kg", "67 kg", "73 kg", "81 kg", "89 kg", "96 kg", "+96 kg"],
    },
    lifts: ["Snatch", "Clean & Jerk", "Total"],
    measurement: { type: "weight", unit: "kg", unitLabel: "weight lifted (kg)", direction: "higher_is_better" },
  },

  "Para athletics": {
    id: "para-athletics",
    name: "Para athletics",
    hierarchyType: "para_athletics",
    ageCategories: [
      { id: "u17", name: "Junior", label: "Junior (U17)", minAge: 12, maxAge: 16 },
      { id: "u20", name: "Youth", label: "Youth (U20)", minAge: 17, maxAge: 19 },
      { id: "senior", name: "Senior", label: "Senior", minAge: 20, maxAge: 39 },
      { id: "masters", name: "Masters", label: "Masters", minAge: 40, maxAge: null },
    ],
    disciplines: [
      {
        id: "track-sprint",
        name: "Track - Sprint",
        events: ["100m", "200m", "400m"],
        measurement: { type: "time", unit: "sec", unitLabel: "seconds", direction: "lower_is_better" },
      },
      {
        id: "track-distance",
        name: "Track - Middle & Long",
        events: ["800m", "1500m", "5000m"],
        measurement: { type: "time", unit: "sec", unitLabel: "seconds", direction: "lower_is_better" },
      },
      {
        id: "field-throws",
        name: "Field - Throws",
        events: ["Shot Put", "Discus Throw", "Javelin Throw", "Club Throw"],
        measurement: { type: "distance", unit: "m", unitLabel: "meters", direction: "higher_is_better" },
      },
      {
        id: "field-jumps",
        name: "Field - Jumps",
        events: ["Long Jump", "High Jump"],
        measurement: { type: "distance", unit: "m", unitLabel: "meters", direction: "higher_is_better" },
      },
    ],
    classifications: [
      "T11", "T12", "T13",
      "T20",
      "T32", "T33", "T34", "T35", "T36", "T37", "T38",
      "T40", "T41",
      "T42", "T43", "T44", "T45", "T46", "T47",
      "T51", "T52", "T53", "T54",
      "T61", "T62", "T63", "T64",
      "F11", "F12", "F13",
      "F20",
      "F31", "F32", "F33", "F34", "F35", "F36", "F37", "F38",
      "F40", "F41", "F42", "F43", "F44", "F45", "F46",
      "F51", "F52", "F53", "F54", "F55", "F56", "F57",
      "F61", "F62", "F63", "F64",
      "Open",
    ],
    classificationStatuses: ["Self-reported", "Pending Classification", "Officially Classified"],
  },
};

/**
 * Returns sport metadata by name (case-insensitive) or ID
 */
export function getSportConfig(sportKey) {
  if (!sportKey) return null;
  const match = Object.values(sportsRegistry).find(
    (s) =>
      s.name.toLowerCase() === sportKey.toLowerCase() ||
      s.id.toLowerCase() === sportKey.toLowerCase(),
  );
  return match || null;
}

/**
 * Checks if a sport enforces weight categories
 */
export function requiresWeightCategory(sportKey) {
  const config = getSportConfig(sportKey);
  return Boolean(
    config?.isWeightCategorySport ||
      ["wrestling", "weightlifting", "boxing"].includes(config?.id),
  );
}

/**
 * Calculates current age in full years from date of birth
 */
export function calculateAge(birthDate, asOfDate = new Date()) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return null;
  const asOf = asOfDate instanceof Date ? asOfDate : new Date(asOfDate);
  let age = asOf.getFullYear() - birth.getFullYear();
  const m = asOf.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && asOf.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

/**
 * Derives sport-specific age category automatically from date of birth
 */
export function deriveAgeCategory(sportKey, birthDate, asOfDate = new Date()) {
  const athleteAge = calculateAge(birthDate, asOfDate);
  if (athleteAge === null) {
    return { id: "open", name: "Open Category", label: "Open", age: null };
  }

  const config = getSportConfig(sportKey);
  const categories = config?.ageCategories || [
    { id: "u16", name: "Under-16", label: "U16", minAge: 10, maxAge: 15 },
    { id: "u19", name: "Under-19", label: "U19", minAge: 16, maxAge: 18 },
    { id: "senior", name: "Senior", label: "Senior", minAge: 19, maxAge: 34 },
    { id: "masters", name: "Masters", label: "Masters", minAge: 35, maxAge: null },
  ];

  for (const cat of categories) {
    const minPass = cat.minAge === null || cat.minAge === undefined || athleteAge >= cat.minAge;
    const maxPass = cat.maxAge === null || cat.maxAge === undefined || athleteAge <= cat.maxAge;
    if (minPass && maxPass) {
      return { ...cat, age: athleteAge };
    }
  }

  return { id: "open", name: "Open Category", label: `Age ${athleteAge}`, age: athleteAge };
}

/**
 * Derives measurement metadata (unit, type, direction) from a sportProfile
 */
export function deriveMeasurement(sportKey, disciplineOrCategory, _eventOrPosition) {
  const config = getSportConfig(sportKey);
  if (!config) {
    return { type: "general", unit: "points", unitLabel: "units", direction: "higher_is_better" };
  }

  // Athletics / Para Athletics
  if (config.disciplines) {
    const disc = config.disciplines.find(
      (d) =>
        d.id === disciplineOrCategory ||
        d.name.toLowerCase() === (disciplineOrCategory || "").toLowerCase(),
    );
    if (disc?.measurement) return disc.measurement;
  }

  // Swimming
  if (config.id === "swimming") {
    return config.measurement;
  }

  // Weightlifting
  if (config.id === "weightlifting") {
    return config.measurement;
  }

  // Shooting & Archery
  if (config.measurement) {
    return config.measurement;
  }

  return { type: "general", unit: "points", unitLabel: "points", direction: "higher_is_better" };
}

/**
 * Normalizes state names to standard full state names (e.g., Maharastra -> Maharashtra)
 */
export function normalizeStateName(stateStr) {
  if (!stateStr) return "";
  let clean = String(stateStr).trim().replace(/\s*\((state)\)\s*/gi, "").replace(/\s+state$/gi, "").trim();
  const s = clean.toLowerCase();
  if (s === "maharashtra" || s === "maharastra" || s === "mh" || s.startsWith("maharas")) {
    return "Maharashtra";
  }
  if (s === "karnataka" || s === "ka") return "Karnataka";
  if (s === "tamil nadu" || s === "tamilnadu" || s === "tn") return "Tamil Nadu";
  if (s === "delhi" || s === "dl") return "Delhi";
  if (s === "kerala" || s === "kl") return "Kerala";
  if (s === "haryana" || s === "hr") return "Haryana";
  if (s === "punjab" || s === "pb") return "Punjab";
  if (s === "uttar pradesh" || s === "up") return "Uttar Pradesh";
  if (s === "west bengal" || s === "wb") return "West Bengal";
  if (s === "gujarat" || s === "gj") return "Gujarat";
  if (s === "rajasthan" || s === "rj") return "Rajasthan";
  if (s === "telangana" || s === "tg" || s === "ts") return "Telangana";
  if (s === "andhra pradesh" || s === "ap") return "Andhra Pradesh";
  if (s === "odisha" || s === "orissa" || s === "od") return "Odisha";
  return clean;
}

/**
 * Normalizes district names by trimming, stripping trailing "(District)" or "District" labels, and mapping aliases
 */
export function normalizeDistrictName(distStr) {
  if (!distStr) return "";
  let d = String(distStr).trim();
  d = d.replace(/\s*\((district|dist)\)\s*/gi, "").replace(/\s+district$/gi, "").trim();
  const lower = d.toLowerCase();
  if (lower === "poona" || lower === "pune") return "Pune";
  if (lower === "bombay city" || lower === "mumbai city" || lower === "mumbai") return "Mumbai";
  return d;
}

/**
 * Builds normalized, automatic benchmark comparison filters from an athlete profile
 */
export function buildPerformanceComparisonFilters(profile, asOfDate = new Date()) {
  if (!profile) return null;

  const sportName = profile.sport || profile.sportProfile?.sport || "Athletics";
  const config = getSportConfig(sportName);
  const sp = profile.sportProfile || {};

  const age = calculateAge(profile.birthDate, asOfDate);
  const ageCategory = deriveAgeCategory(sportName, profile.birthDate, asOfDate);

  const event = sp.event || profile.event || "";
  const discipline = sp.discipline || "";
  const gender = profile.gender || "Male";
  const rawState = profile.state || "";
  const rawDistrict = profile.district || "";
  const state = normalizeStateName(rawState);
  const district = normalizeDistrictName(rawDistrict);
  const classification = sp.classification || profile.classification || "Open";
  const weightCategory = sp.weightCategory || "";

  const measurement = sp.measurement || deriveMeasurement(sportName, discipline, event);
  const isWeightSport = requiresWeightCategory(sportName);
  const missingWeight = isWeightSport && !weightCategory;

  return {
    sport: config?.name || sportName,
    sportId: config?.id || sportName.toLowerCase(),
    discipline,
    event,
    gender,
    age,
    ageCategory,
    classification,
    weightCategory,
    isWeightSport,
    missingWeight,
    state,
    district,
    country: "India",
    unit: measurement.unit,
    direction: measurement.direction,
    metricType: measurement.type,
  };
}

/**
 * Creates a clean default sportProfile for any given sport.
 */
export function createDefaultSportProfile(sportInput, gender = "Male") {
  const config = typeof sportInput === "string" ? getSportConfig(sportInput) : sportInput;
  if (!config) return null;

  const sp = {
    sport: config.name,
  };

  if (config.hierarchyType === "track_field") {
    const disc = config.disciplines[0];
    sp.discipline = disc.name;
    sp.event = disc.events[0];
    sp.measurement = disc.measurement;
  } else if (config.hierarchyType === "racket") {
    const fmt = config.formats[0];
    sp.format = fmt.name;
    const defaultEvent = gender === "Female" ? "Women's Singles" : "Men's Singles";
    sp.event = fmt.events.includes(defaultEvent) ? defaultEvent : fmt.events[0];
    sp.measurement = config.measurement;
  } else if (config.hierarchyType === "team_field" || config.hierarchyType === "team_court") {
    const group = config.positionGroups[1] || config.positionGroups[0];
    sp.positionGroup = group.name;
    sp.position = group.positions[0];
    sp.event = group.positions[0];
    sp.measurement = config.measurement;
  } else if (config.hierarchyType === "cricket") {
    const role = config.roles[0];
    sp.role = role.name;
    sp.specialization = role.specializations[0];
    sp.battingStyle = config.battingStyles[0];
    sp.bowlingStyle = config.bowlingStyles[0];
    sp.event = `${sp.role} · ${sp.specialization}`;
    sp.measurement = config.measurement;
  } else if (config.hierarchyType === "swimming") {
    sp.stroke = config.strokes[0].name;
    sp.distance = config.distances[1] || "100m";
    sp.event = `${sp.distance} ${sp.stroke}`;
    sp.measurement = config.measurement;
  } else if (config.hierarchyType === "target") {
    const disc = config.disciplines[0];
    sp.discipline = disc.name;
    sp.event = disc.events[0];
    sp.measurement = config.measurement;
  } else if (config.hierarchyType === "archery") {
    const cat = config.categories[0];
    sp.discipline = cat.name;
    sp.event = cat.events[0];
    sp.measurement = config.measurement;
  } else if (config.hierarchyType === "combat") {
    const style = config.styles[0];
    sp.style = style.name;
    sp.weightCategory = style.weightCategories[2] || style.weightCategories[0];
    sp.event = sp.weightCategory ? `${sp.style} · ${sp.weightCategory}` : style.name;
    sp.measurement = config.measurement;
  } else if (config.hierarchyType === "strength") {
    const gKey = gender === "Female" ? "Female" : "Male";
    const weights = config.weightCategories[gKey] || config.weightCategories.Male;
    sp.weightCategory = weights[3] || weights[0];
    sp.event = config.lifts[0];
    sp.measurement = config.measurement;
  } else if (config.hierarchyType === "para_athletics") {
    const disc = config.disciplines[0];
    sp.discipline = disc.name;
    sp.event = disc.events[0];
    sp.classification = config.classifications[18] || "T47";
    sp.classificationStatus = config.classificationStatuses[0] || "Self-reported";
    sp.measurement = disc.measurement;
  } else {
    sp.event = "General";
    sp.measurement = { type: "score", unit: "points", unitLabel: "points", direction: "higher_is_better" };
  }

  return sp;
}

/**
 * Returns a recommended default performance target based on measurement unit.
 */
export function getDefaultTargetForSport(sp) {
  const unit = sp?.measurement?.unit;
  if (unit === "sec") return 12.0;
  if (unit === "m") return 6.5;
  if (unit === "cm") return 180;
  if (unit === "kg") return 120;
  if (unit === "points") return 100;
  return 100;
}

/**
 * Normalizes an athlete profile to guarantee both the rich sportProfile
 * and the backward-compatible top-level sport, event, unit fields.
 */
export function normalizeProfile(raw) {
  if (!raw) return raw;
  const p = { ...raw };
  const sportName = p.sport || p.sportProfile?.sport || "Athletics";
  const config = getSportConfig(sportName) || getSportConfig("Athletics");

  let rawSp = p.sportProfile ? { ...p.sportProfile } : {};
  const prevSport = rawSp.sport;
  const sportChanged = prevSport && config && prevSport.toLowerCase() !== config.name.toLowerCase();

  // If sport changed, scrub and regenerate clean default sportProfile for the new sport
  let sp = sportChanged ? createDefaultSportProfile(config, p.gender) : rawSp;
  if (!sp) sp = createDefaultSportProfile(config, p.gender);
  sp.sport = config.name;

  // Track & Field (Athletics)
  if (config.hierarchyType === "track_field") {
    delete sp.format;
    delete sp.positionGroup;
    delete sp.position;
    delete sp.role;
    delete sp.specialization;
    delete sp.battingStyle;
    delete sp.bowlingStyle;
    delete sp.stroke;
    delete sp.distance;
    delete sp.style;
    delete sp.classification;
    delete sp.classificationStatus;

    if (!sp.discipline || !config.disciplines.some((d) => d.name === sp.discipline)) {
      const ev = (p.event || sp.event || "100m").toLowerCase();
      if (["60m", "100m", "200m", "400m"].some((x) => ev.includes(x))) sp.discipline = "Sprint";
      else if (["800m", "1500m", "3000m"].some((x) => ev.includes(x))) sp.discipline = "Middle Distance";
      else if (["5000m", "10000m", "marathon"].some((x) => ev.includes(x))) sp.discipline = "Long Distance";
      else if (ev.includes("hurdles")) sp.discipline = "Hurdles";
      else if (ev.includes("jump") || ev.includes("vault")) sp.discipline = "Jumps";
      else if (ev.includes("throw") || ev.includes("shot put")) sp.discipline = "Throws";
      else if (ev.includes("walk")) sp.discipline = "Race Walk";
      else sp.discipline = config.disciplines[0].name;
    }

    const disc = config.disciplines.find((d) => d.name === sp.discipline) || config.disciplines[0];
    sp.discipline = disc.name;

    if (!disc.events.includes(sp.event)) {
      sp.event = disc.events.find((e) => e.toLowerCase() === (p.event || "").toLowerCase()) || disc.events[0];
    }
    sp.measurement = deriveMeasurement(config.name, sp.discipline, sp.event);
  }

  // Racket Sports (Badminton)
  else if (config.hierarchyType === "racket") {
    delete sp.discipline;
    delete sp.positionGroup;
    delete sp.position;
    delete sp.role;
    delete sp.specialization;
    delete sp.battingStyle;
    delete sp.bowlingStyle;
    delete sp.stroke;
    delete sp.distance;
    delete sp.style;
    delete sp.weightCategory;
    delete sp.classification;

    const fmt = config.formats.find((f) => f.name === sp.format) || config.formats[0];
    sp.format = fmt.name;

    if (!fmt.events.includes(sp.event)) {
      const defEv = p.gender === "Female" ? "Women's Singles" : "Men's Singles";
      sp.event = fmt.events.includes(p.event) ? p.event : (fmt.events.includes(defEv) ? defEv : fmt.events[0]);
    }
    sp.measurement = config.measurement;
  }

  // Team Field & Court Sports (Football, Basketball)
  else if (config.hierarchyType === "team_field" || config.hierarchyType === "team_court") {
    delete sp.discipline;
    delete sp.format;
    delete sp.role;
    delete sp.specialization;
    delete sp.battingStyle;
    delete sp.bowlingStyle;
    delete sp.stroke;
    delete sp.distance;
    delete sp.style;
    delete sp.weightCategory;
    delete sp.classification;

    const grp = config.positionGroups.find((g) => g.name === sp.positionGroup) || config.positionGroups[0];
    sp.positionGroup = grp.name;

    if (!grp.positions.includes(sp.position)) {
      sp.position = grp.positions.find((pos) => pos.toLowerCase() === (p.event || "").toLowerCase()) || grp.positions[0];
    }
    sp.event = sp.position;
    sp.measurement = config.measurement;
  }

  // Cricket
  else if (config.hierarchyType === "cricket") {
    delete sp.discipline;
    delete sp.format;
    delete sp.positionGroup;
    delete sp.position;
    delete sp.stroke;
    delete sp.distance;
    delete sp.style;
    delete sp.weightCategory;
    delete sp.classification;

    const role = config.roles.find((r) => r.name === sp.role) || config.roles[0];
    sp.role = role.name;

    if (!role.specializations.includes(sp.specialization)) {
      sp.specialization = role.specializations[0];
    }
    if (!sp.battingStyle || !config.battingStyles.includes(sp.battingStyle)) {
      sp.battingStyle = config.battingStyles[0];
    }
    if (!sp.bowlingStyle || !config.bowlingStyles.includes(sp.bowlingStyle)) {
      sp.bowlingStyle = config.bowlingStyles[0];
    }
    sp.event = `${sp.role} · ${sp.specialization}`;
    sp.measurement = config.measurement;
  }

  // Swimming
  else if (config.hierarchyType === "swimming") {
    delete sp.discipline;
    delete sp.format;
    delete sp.positionGroup;
    delete sp.position;
    delete sp.role;
    delete sp.style;
    delete sp.weightCategory;
    delete sp.classification;

    const stroke = config.strokes.find((s) => s.name === sp.stroke) || config.strokes[0];
    sp.stroke = stroke.name;

    const dist = config.distances.find((d) => d === sp.distance) || config.distances[1] || "100m";
    sp.distance = dist;

    sp.event = `${sp.distance} ${sp.stroke}`;
    sp.measurement = config.measurement;
  }

  // Shooting (Target)
  else if (config.hierarchyType === "target") {
    delete sp.format;
    delete sp.positionGroup;
    delete sp.position;
    delete sp.role;
    delete sp.stroke;
    delete sp.distance;
    delete sp.style;
    delete sp.weightCategory;
    delete sp.classification;

    const disc = config.disciplines.find((d) => d.name === sp.discipline) || config.disciplines[0];
    sp.discipline = disc.name;

    if (!disc.events.includes(sp.event)) {
      sp.event = disc.events.find((e) => e.toLowerCase() === (p.event || "").toLowerCase()) || disc.events[0];
    }
    sp.measurement = config.measurement;
  }

  // Archery
  else if (config.hierarchyType === "archery") {
    delete sp.format;
    delete sp.positionGroup;
    delete sp.position;
    delete sp.role;
    delete sp.stroke;
    delete sp.distance;
    delete sp.style;
    delete sp.weightCategory;
    delete sp.classification;

    const cat = config.categories.find((c) => c.name === sp.discipline) || config.categories[0];
    sp.discipline = cat.name;

    if (!cat.events.includes(sp.event)) {
      sp.event = cat.events.find((e) => e.toLowerCase() === (p.event || "").toLowerCase()) || cat.events[0];
    }
    sp.measurement = config.measurement;
  }

  // Wrestling (Combat)
  else if (config.hierarchyType === "combat") {
    delete sp.discipline;
    delete sp.format;
    delete sp.positionGroup;
    delete sp.position;
    delete sp.role;
    delete sp.stroke;
    delete sp.distance;
    delete sp.classification;

    const style = config.styles.find((s) => s.name === sp.style) || config.styles[0];
    sp.style = style.name;

    if (sp.weightCategory === undefined) {
      sp.weightCategory = "";
    }
    sp.event = sp.weightCategory ? `${sp.style} · ${sp.weightCategory}` : sp.style;
    sp.measurement = config.measurement;
  }

  // Weightlifting (Strength)
  else if (config.hierarchyType === "strength") {
    delete sp.discipline;
    delete sp.format;
    delete sp.positionGroup;
    delete sp.position;
    delete sp.role;
    delete sp.stroke;
    delete sp.distance;
    delete sp.classification;

    if (sp.weightCategory === undefined) {
      sp.weightCategory = "";
    }
    if (!config.lifts.includes(sp.event)) {
      sp.event = config.lifts[0];
    }
    sp.measurement = config.measurement;
  }

  // Para Athletics
  else if (config.hierarchyType === "para_athletics" || config.id === "para-athletics") {
    delete sp.format;
    delete sp.positionGroup;
    delete sp.position;
    delete sp.role;
    delete sp.stroke;
    delete sp.distance;
    delete sp.style;
    delete sp.weightCategory;

    const disc = config.disciplines.find((d) => d.name === sp.discipline) || config.disciplines[0];
    sp.discipline = disc.name;

    if (!disc.events.includes(sp.event)) {
      sp.event = disc.events.find((e) => e.toLowerCase() === (p.event || "").toLowerCase()) || disc.events[0];
    }
    if (!sp.classification || !config.classifications.includes(sp.classification)) {
      sp.classification = p.classification || "T47";
    }
    if (!sp.classificationStatus || !config.classificationStatuses.includes(sp.classificationStatus)) {
      sp.classificationStatus = "Self-reported";
    }
    sp.measurement = deriveMeasurement(config.name, sp.discipline, sp.event);
  }

  // Fallback measurement if missing
  if (!sp.measurement) {
    sp.measurement = deriveMeasurement(config.name, sp.discipline, sp.event) || config.measurement;
  }

  p.sportProfile = sp;

  // Synchronize legacy top-level fields for total backward compatibility
  p.sport = config.name;
  p.event = sp.event || sp.position || "Event";
  p.unit = sp.measurement?.unit || p.unit || "points";
  p.sportLocked = Boolean(raw && (raw.sportLocked !== undefined ? raw.sportLocked : p.sportLocked));

  return p;
}
