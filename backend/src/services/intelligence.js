export function age(birthDate) {
  if (!birthDate) return null;
  const n = new Date(),
    b = new Date(birthDate);
  return (
    n.getUTCFullYear() -
    b.getUTCFullYear() -
    (n.getUTCMonth() < b.getUTCMonth() ||
    (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())
      ? 1
      : 0)
  );
}
export function insights(p, records) {
  const sessions = records
      .filter((r) => r.kind === "sessions")
      .sort((a, b) => a.date.localeCompare(b.date)),
    recent = sessions.slice(-7);
  const measured = sessions.filter(
      (r) =>
        r.event === p.event && r.unit === (p.unit || "sec") && r.metric > 0,
    ),
    lower = (p.unit || "sec") === "sec";
  const best = measured.length
    ? (lower ? Math.min : Math.max)(...measured.map((r) => r.metric))
    : null;
  const improvement =
    measured.length > 1
      ? ((measured.at(-1).metric - measured[0].metric) / measured[0].metric) *
        (lower ? -100 : 100)
      : 0;
  const fatigue = recent.length
      ? recent.reduce((n, r) => n + r.fatigue, 0) / recent.length
      : 0,
    pain = Math.max(0, ...recent.map((r) => r.pain));
  const workload = recent.reduce((n, r) => n + r.duration * r.effort, 0),
    active = records.some(
      (r) => r.kind === "injuries" && r.stage !== "Return to play",
    );
  const risk =
    pain >= 6 || active
      ? "Needs attention"
      : fatigue >= 7
        ? "Elevated fatigue"
        : "No flags reported";
  const dimensions = [
    {
      name: "Performance",
      weight: 35,
      value:
        best && p.target
          ? Math.min(100, (lower ? p.target / best : best / p.target) * 100)
          : 0,
      explanation:
        "Personal best relative to your own target, not a national ranking.",
    },
    {
      name: "Consistency",
      weight: 20,
      value: Math.min(
        100,
        (new Set(
          sessions
            .filter((r) => Date.parse(r.date) >= Date.now() - 28 * 86400000)
            .map((r) => r.date),
        ).size /
          12) *
          100,
      ),
      explanation:
        "Distinct training days in the last 28 days, against a target of 12.",
    },
    {
      name: "Improvement",
      weight: 20,
      value:
        measured.length > 1
          ? Math.max(0, Math.min(100, 50 + improvement * 5))
          : 0,
      explanation:
        "First-to-latest result in the same event and unit. Stable results score 50.",
    },
    {
      name: "Fitness",
      weight: 15,
      value: recent.length ? Math.max(0, 100 - fatigue * 10 - pain * 5) : 0,
      explanation:
        "Self-reported pain/fatigue proxy, not a clinical fitness measure.",
    },
    {
      name: "Competition",
      weight: 10,
      value: Math.min(
        100,
        records.filter((r) => r.kind === "achievements" && r.verified).length *
          25,
      ),
      explanation: "25 points per coach-attested achievement, capped at 100.",
    },
  ];
  return {
    sessions: sessions.length,
    best,
    improvement: +improvement.toFixed(1),
    pain,
    fatigue,
    workload,
    risk,
    dimensions,
    score: sessions.length
      ? Math.round(
          dimensions.reduce((n, d) => n + (d.value * d.weight) / 100, 0),
        )
      : null,
    guidance:
      pain >= 6
        ? "Pause strenuous activity and arrange a qualified professional assessment."
        : active
          ? "Follow your clinician-approved recovery plan. Progression needs professional review."
          : fatigue >= 7
            ? "Consider a lighter session and discuss persistent fatigue with your coach."
            : "Keep logging workload, fatigue, and pain to make changes visible.",
  };
}
export function plan(p, s) {
  const limited = s.risk !== "No flags reported",
    adaptive = p.classification && p.classification !== "Open",
    days = p.competitionDate
      ? Math.ceil((Date.parse(p.competitionDate) - Date.now()) / 86400000)
      : null,
    taper = days !== null && days >= 0 && days <= 7;
  const duration = limited
    ? 15
    : taper
      ? 25
      : s.sessions < 3 || s.workload > 2500
        ? 30
        : 45;
  return [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ].map((day, i) => ({
    day,
    title:
      i === 3 || i === 6
        ? "Rest & reflection"
        : limited
          ? "Recovery check-in"
          : i % 2 === 0
            ? `${p.sport || "Sport"} technique`
            : "Strength & mobility",
    duration: i === 3 || i === 6 ? 0 : duration,
    done: false,
    detail:
      i === 3 || i === 6
        ? "Record wellbeing and review the week."
        : limited
          ? "Only activity already approved by your clinician. Record symptoms; do not advance rehab automatically."
          : adaptive
            ? `Review classification-appropriate drills with your qualified coach. Available equipment: ${p.equipment}. Keep effort comfortable.`
            : taper
              ? `Competition is within one week. Keep ${p.event} drills light and familiar. Confirm your taper with your coach.`
              : i % 2 === 0
                ? `10 min warm-up, ${duration - 20} min controlled ${p.event || "sport"} technique, 10 min cool-down. Use ${p.equipment || "open ground"}. Target: ${p.target || "consistency"}.`
                : (p.equipment || "").toLowerCase().includes("band")
                  ? "Warm up, practice controlled band resistance work, then mobility. Keep repetitions comfortable."
                  : "Warm up, perform comfortable bodyweight strength drills, and finish with mobility. No gym needed.",
  }));
}
export function match(p, o) {
  const reasons = [],
    blockers = [],
    years = age(p.birthDate);
  if (o.sport === "All sports" || o.sport === p.sport)
    reasons.push("Sport matches");
  else blockers.push("Different sport");
  if (years === null) blockers.push("Add date of birth");
  else if (years >= o.minAge && years <= o.maxAge) reasons.push("Age eligible");
  else blockers.push("Outside age range");
  if (!o.classification || o.classification === p.classification)
    reasons.push("Classification eligible");
  else blockers.push("Classification does not match");
  if (o.location === "All India" || o.location === p.state)
    reasons.push("Location matches");
  if (o.event && o.event !== p.event) blockers.push("Different event");
  if (o.minResult || o.maxResult) {
    if (!p.bestMetric || o.unit !== p.unit)
      blockers.push("Add a result in the required unit");
    else if (
      (o.minResult && p.bestMetric < o.minResult) ||
      (o.maxResult && p.bestMetric > o.maxResult)
    )
      blockers.push("Performance threshold not met");
    else reasons.push("Performance threshold met");
  }
  if (Date.parse(o.deadline + "T23:59:59") < Date.now())
    blockers.push("Deadline passed");
  return {
    ...o,
    reasons,
    blockers,
    eligible: !blockers.length,
    match: Math.round(
      (reasons.length / (o.minResult || o.maxResult ? 5 : 4)) * 100,
    ),
  };
}
