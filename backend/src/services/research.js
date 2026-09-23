import { age, match, insights } from "./intelligence.js";
const cohort = (p) =>
  [
    p.sport,
    p.event,
    p.gender,
    p.classification,
    age(p.birthDate) === null ? "unknown" : Math.floor(age(p.birthDate) / 5),
  ].join("|");
export async function benchmarks(db, p, id) {
  const own = (await db.list("sessions", { ownerId: id })).filter(
      (r) => r.event === p.event && r.unit === p.unit && r.metric > 0,
    ),
    lower = p.unit === "sec",
    best = own.length
      ? (lower ? Math.min : Math.max)(...own.map((r) => r.metric))
      : null;
  const profiles = (await db.list("profiles")).filter(
    (q) =>
      q.allowAnalytics &&
      !q.id.startsWith("demo-") &&
      q.id !== id &&
      cohort(q) === cohort(p),
  );
  const peers = [];
  for (const q of profiles) {
    const rows = (await db.list("sessions", { ownerId: q.id })).filter(
      (r) =>
        r.event === p.event && r.unit === p.unit && r.verified && r.metric > 0,
    );
    if (rows.length)
      peers.push({
        ...q,
        value: (lower ? Math.min : Math.max)(...rows.map((r) => r.metric)),
      });
  }
  return {
    ageBand:
      age(p.birthDate) === null
        ? "Unknown"
        : `${Math.floor(age(p.birthDate) / 5) * 5}–${Math.floor(age(p.birthDate) / 5) * 5 + 4}`,
    groups: [
      ["District", (q) => q.state === p.state && q.district === p.district],
      ["State", (q) => q.state === p.state],
      ["National dataset", () => true],
    ].map(([scope, test]) => {
      const g = peers.filter(test);
      return {
        scope,
        count: g.length >= 5 ? g.length : null,
        percentile:
          g.length >= 5 && best !== null
            ? Math.round(
                ((g.filter((q) => (lower ? best < q.value : best > q.value))
                  .length +
                  0.5 * g.filter((q) => q.value === best).length) /
                  g.length) *
                  100,
              )
            : null,
      };
    }),
  };
}
export async function fairness(db) {
  const profiles = (await db.list("profiles")).filter(
      (p) => p.allowAnalytics && !p.id.startsWith("demo-"),
    ),
    ops = (await db.list("opportunities")).filter(
      (o) => !o.sample && Date.parse(o.deadline + "T23:59:59") >= Date.now(),
    ),
    groups = [];
  if (!ops.length) return { status: "Awaiting live opportunities", groups };
  const data = [];
  for (const p of profiles) {
    const s = insights(p, await db.list("sessions", { ownerId: p.id }));
    data.push({
      ...p,
      matched: ops.some((o) => match({ ...p, bestMetric: s.best }, o).eligible),
    });
  }
  for (const dimension of ["state", "gender", "classification"]) {
    const buckets = new Map();
    for (const p of data) {
      const key = p[dimension] || "Unspecified",
        g = buckets.get(key) || { n: 0, x: 0 };
      g.n++;
      if (p.matched) g.x++;
      buckets.set(key, g);
    }
    const visible = [...buckets].filter(([, g]) => g.n >= 5),
      highest = Math.max(0, ...visible.map(([, g]) => g.x / g.n));
    for (const [label, g] of visible) {
      const rate = g.x / g.n,
        denom = 1 + 3.8416 / g.n,
        center = (rate + 3.8416 / (2 * g.n)) / denom,
        margin =
          (1.96 *
            Math.sqrt((rate * (1 - rate)) / g.n + 3.8416 / (4 * g.n * g.n))) /
          denom;
      groups.push({
        dimension,
        label,
        count: g.n,
        rate: Math.round(rate * 100),
        gap: Math.round((highest - rate) * 100),
        interval: [
          Math.max(0, Math.round((center - margin) * 100)),
          Math.min(100, Math.round((center + margin) * 100)),
        ],
      });
    }
  }
  return {
    status: groups.length
      ? "Exploratory audit available"
      : "Insufficient consented group sizes",
    groups,
  };
}
