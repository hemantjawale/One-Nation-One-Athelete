export async function seedOpportunities(db) {
  if ((await db.list("opportunities")).length) return;
  for (const [i, type] of [
    "Trial",
    "Scholarship",
    "Competition",
    "Academy",
    "Sponsorship",
    "Government scheme",
  ].entries())
    await db.put("opportunities", {
      id: "sample-" + i,
      ownerId: "system",
      sample: true,
      title: [
        "State sprint development trial",
        "Next generation athlete grant",
        "Open district athletics meet",
        "Grassroots training residency",
        "Equipment access fellowship",
        "Inclusive sport support programme",
      ][i],
      type,
      sport: i === 1 || i === 4 ? "All sports" : "Athletics",
      event: "",
      unit: "sec",
      minResult: 0,
      maxResult: 0,
      location: i % 2 ? "All India" : "Maharashtra",
      minAge: 14,
      maxAge: 25,
      deadline: "2027-06-30",
      classification: "",
      url: "",
      description:
        "Illustrative listing for demonstrating eligibility matching. This is not a live opportunity or an affiliation with any organisation.",
    });
}
export async function seedAthlete(db, id) {
  const date = (n) =>
    new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  await db.put("profiles", {
    id,
    ownerId: id,
    name: "Aarav Sharma",
    sport: "Athletics",
    event: "100m",
    unit: "sec",
    state: "Maharashtra",
    district: "Nashik",
    birthDate: "2007-04-18",
    gender: "Male",
    classification: "Open",
    equipment: "Open ground, resistance band",
    target: 11.9,
    goal: "Break the 12-second barrier and qualify for state trials.",
    education: "Class 12",
    competitionDate: "",
    coachId: "",
    sharePerformance: false,
    shareHealth: false,
    allowAnalytics: false,
  });
  for (const [i, metric] of [12.82, 12.65, 12.52, 12.38, 12.21].entries())
    await db.put("sessions", {
      ownerId: id,
      title: [
        "Baseline assessment",
        "Acceleration drills",
        "Sprint mechanics",
        "Speed endurance",
        "Personal best session",
      ][i],
      date: date((4 - i) * 4),
      event: "100m",
      unit: "sec",
      duration: 45 + i * 5,
      effort: 5 + (i % 3),
      metric,
      pain: 0,
      fatigue: 3 + (i % 2),
      notes: "Sample record. Replace with your actual measurements.",
      verified: false,
    });
  await db.put("achievements", {
    ownerId: id,
    title: "District athletics meet",
    date: date(20),
    level: "District",
    result: "100m · Silver medal",
    notes: "Sample achievement awaiting independent attestation.",
    verified: false,
  });
  await db.put("expenses", {
    ownerId: id,
    title: "Competition spikes",
    date: date(2),
    category: "Equipment",
    amount: 4500,
    status: "Planned",
    notes: "",
  });
}
