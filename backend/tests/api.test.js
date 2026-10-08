import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { benchmarks, fairness } from "../src/services/research.js";
let server, athlete, other, coach, profile, session;
const base = "http://127.0.0.1:4101/api";
async function call(url, method = "GET", body, cookie) {
  const response = await fetch(base + url, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    body: await response.json().catch(() => null),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
before(async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "onona-test-"));
  server = spawn(process.execPath, ["src/index.js"], {
    env: {
      ...process.env,
      PORT: "4101",
      DATA_DIR: path.join(directory, ".data"),
      MONGODB_URI: "",
      JWT_SECRET: "test-only-secret",
      NODE_ENV: "test",
    },
    stdio: "pipe",
  });
  let errors = "";
  server.stderr.on("data", (d) => (errors += d));
  for (let i = 0; i < 80; i++) {
    try {
      if ((await call("/health")).status === 200) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw Error(errors || "Server did not start");
});
after(() => server?.kill());
test("authentication blocks unauthorised access", async () =>
  assert.equal((await call("/records/sessions")).status, 401));
test("demo creates isolated persistent records", async () => {
  athlete = (await call("/auth/demo", "POST")).cookie;
  other = (await call("/auth/demo", "POST")).cookie;
  assert.notEqual(athlete, other);
  profile = (await call("/profile", "GET", null, athlete)).body;
  assert.equal(
    (await call("/records/sessions", "GET", null, athlete)).body.length,
    5,
  );
});
test("session CRUD validates data and enforces ownership", async () => {
  const body = {
    title: "Integration sprint",
    date: "2026-09-20",
    event: "100m",
    unit: "sec",
    duration: 35,
    effort: 5,
    metric: 11.8,
    pain: 2,
    fatigue: 3,
    notes: "",
  };
  const result = await call("/records/sessions", "POST", body, athlete);
  assert.equal(result.status, 201);
  session = result.body;
  assert.equal(
    (
      await call(
        "/records/sessions/" + session.id,
        "PUT",
        { ...body, metric: 11.7 },
        other,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await call(
        "/records/sessions/" + session.id,
        "PUT",
        { ...body, metric: 11.7 },
        athlete,
      )
    ).body.metric,
    11.7,
  );
  assert.equal(
    (await call("/records/sessions", "POST", { ...body, pain: 90 }, athlete))
      .status,
    400,
  );
  assert.equal(
    (
      await call(
        "/records/sessions",
        "POST",
        { ...body, date: "2026-02-30" },
        athlete,
      )
    ).status,
    400,
  );
  assert.equal((await call("/insights", "GET", null, athlete)).body.best, 11.7);
});
test("offline retry keys prevent duplicate records", async () => {
  const rows = [];
  for (let i = 0; i < 2; i++) {
    const response = await fetch(base + "/records/sessions", {
      method: "POST",
      headers: {
        cookie: athlete,
        "Content-Type": "application/json",
        "Idempotency-Key": "offline-sprint",
      },
      body: JSON.stringify(session),
    });
    rows.push(await response.json());
  }
  assert.equal(rows[0].id, rows[1].id);
});
test("consent protects health and verification is invalidated by edits", async () => {
  coach = (
    await call("/auth/register", "POST", {
      name: "Test Coach",
      email: "coach@example.test",
      password: "password123",
      role: "coach",
    })
  ).cookie;
  assert.deepEqual((await call("/coach", "GET", null, coach)).body, []);
  await call(
    "/profile",
    "PUT",
    {
      ...profile,
      coachId: "coach@example.test",
      sharePerformance: true,
      shareHealth: false,
    },
    athlete,
  );
  let team = (await call("/coach", "GET", null, coach)).body;
  assert.equal(team.length, 1);
  assert.equal(team[0].wellbeing.length, 0);
  assert.equal(team[0].sessions[0].pain, undefined);
  assert.equal(team[0].sessions[0].notes, undefined);
  const a = (await call("/records/achievements", "GET", null, athlete)).body[0];
  assert.equal(
    (await call("/verify/achievements/" + a.id, "POST", {}, other)).status,
    403,
  );
  assert.equal(
    (await call("/verify/achievements/" + a.id, "POST", {}, coach)).body
      .verified,
    true,
  );
  await call(
    "/records/achievements/" + a.id,
    "PUT",
    { ...a, result: "Corrected result" },
    athlete,
  );
  assert.equal(
    (await call("/records/achievements", "GET", null, athlete)).body[0]
      .verified,
    false,
  );
  await call(
    "/profile",
    "PUT",
    {
      ...profile,
      coachId: "coach@example.test",
      sharePerformance: false,
      shareHealth: false,
    },
    athlete,
  );
  team = (await call("/coach", "GET", null, coach)).body;
  assert.equal(team[0].sessions.length, 0);
  assert.equal(
    (await call("/verify/sessions/" + session.id, "POST", {}, coach)).status,
    403,
  );
});
test("return to play requires clearance", async () => {
  const body = {
    title: "Ankle recovery",
    date: "2026-09-20",
    stage: "Return to play",
    notes: "",
    cleared: false,
  };
  assert.equal(
    (await call("/records/injuries", "POST", body, athlete)).status,
    400,
  );
  assert.equal(
    (
      await call(
        "/records/injuries",
        "POST",
        { ...body, cleared: true },
        athlete,
      )
    ).status,
    201,
  );
});
test("applications respect eligibility and withdrawal ownership", async () => {
  const o = (await call("/opportunities", "GET", null, athlete)).body.find(
    (o) => o.eligible,
  );
  assert.ok(o);
  const a = await call(
    "/applications",
    "POST",
    { opportunityId: o.id },
    athlete,
  );
  assert.equal(a.body.status, "Demo application");
  assert.equal(
    (
      await call(
        "/applications/" + encodeURIComponent(a.body.id),
        "DELETE",
        null,
        other,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await call(
        "/applications/" + encodeURIComponent(a.body.id),
        "DELETE",
        null,
        athlete,
      )
    ).status,
    200,
  );
  assert.equal((await call("/opportunities", "POST", {}, athlete)).status, 403);
});
test("expense CRUD and export", async () => {
  const e = await call(
    "/records/expenses",
    "POST",
    {
      title: "Train fare",
      date: "2026-09-20",
      category: "Travel",
      amount: 350,
      status: "Planned",
      notes: "",
    },
    athlete,
  );
  assert.equal(e.status, 201);
  assert.equal(
    (
      await call(
        "/records/expenses/" + e.body.id,
        "PUT",
        { ...e.body, status: "Paid" },
        athlete,
      )
    ).body.status,
    "Paid",
  );
  assert.ok(
    (await call("/export", "GET", null, athlete)).body.records.some(
      (r) => r.id === e.body.id,
    ),
  );
  assert.equal(
    (await call("/records/expenses/" + e.body.id, "DELETE", null, athlete))
      .status,
    200,
  );
});
test("file signatures and private content access", async () => {
  let form = new FormData();
  form.append(
    "file",
    new Blob(["<script>bad</script>"], { type: "image/png" }),
    "fake.png",
  );
  let response = await fetch(base + "/files", {
    method: "POST",
    headers: { cookie: athlete },
    body: form,
  });
  assert.equal(response.status, 400);
  form = new FormData();
  form.append(
    "file",
    new Blob(["%PDF-1.4\ntest"], { type: "application/pdf" }),
    "certificate.pdf",
  );
  response = await fetch(base + "/files", {
    method: "POST",
    headers: { cookie: athlete },
    body: form,
  });
  assert.equal(response.status, 201);
  const f = await response.json();
  assert.equal(
    (
      await fetch(base + "/files/" + f.id + "/content", {
        headers: { cookie: other },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/files/" + f.id + "/content", {
        headers: { cookie: athlete },
      })
    ).status,
    200,
  );
  assert.equal(
    (await call("/files/" + f.id, "DELETE", null, athlete)).status,
    200,
  );
});
test("small cohorts are suppressed and verified consented cohorts produce percentiles", async () => {
  const p = {
    id: "athlete",
    sport: "Athletics",
    event: "100m",
    unit: "sec",
    birthDate: "2005-01-01",
    gender: "Female",
    classification: "Open",
    state: "Maharashtra",
    district: "Nashik",
    allowAnalytics: true,
  };
  const profiles = Array.from({ length: 5 }, (_, i) => ({
      ...p,
      id: "peer-" + i,
    })),
    sessions = [
      {
        kind: "sessions",
        ownerId: "athlete",
        event: "100m",
        unit: "sec",
        metric: 11,
      },
      ...profiles.map((q, i) => ({
        kind: "sessions",
        ownerId: q.id,
        event: "100m",
        unit: "sec",
        metric: 12 + i,
        verified: true,
      })),
    ];
  const db = {
    list: async (kind, q = {}) =>
      (kind === "profiles"
        ? profiles
        : kind === "sessions"
          ? sessions
          : []
      ).filter((r) => Object.entries(q).every(([k, v]) => r[k] === v)),
  };
  assert.equal((await benchmarks(db, p, "athlete")).groups[0].percentile, 100);
  profiles.pop();
  assert.equal((await benchmarks(db, p, "athlete")).groups[0].percentile, null);
  assert.equal((await fairness(db)).groups.length, 0);
});
test("sport-specific schema updates and derives metrics accurately", async () => {
  // 1. Athletics Throws (Javelin) -> meters, higher is better
  const javelinUpdate = await call(
    "/profile",
    "PUT",
    {
      ...profile,
      sport: "Athletics",
      sportProfile: {
        sport: "Athletics",
        discipline: "Throws",
        event: "Javelin Throw",
      },
    },
    athlete,
  );
  assert.equal(javelinUpdate.status, 200);
  assert.equal(javelinUpdate.body.sportProfile.discipline, "Throws");
  assert.equal(javelinUpdate.body.sportProfile.event, "Javelin Throw");
  assert.equal(javelinUpdate.body.sportProfile.measurement.unit, "m");
  assert.equal(javelinUpdate.body.sportProfile.measurement.direction, "higher_is_better");
  assert.equal(javelinUpdate.body.unit, "m");

  // 2. Badminton Doubles -> Mixed Doubles
  const badmintonUpdate = await call(
    "/profile",
    "PUT",
    {
      ...profile,
      sport: "Badminton",
      sportProfile: {
        sport: "Badminton",
        format: "Doubles",
        event: "Mixed Doubles",
      },
    },
    athlete,
  );
  assert.equal(badmintonUpdate.status, 200);
  assert.equal(badmintonUpdate.body.sportProfile.format, "Doubles");
  assert.equal(badmintonUpdate.body.sportProfile.event, "Mixed Doubles");

  // 3. Football -> Midfielder -> Central Midfielder
  const footballUpdate = await call(
    "/profile",
    "PUT",
    {
      ...profile,
      sport: "Football",
      sportProfile: {
        sport: "Football",
        positionGroup: "Midfielder",
        position: "Central Midfielder",
      },
    },
    athlete,
  );
  assert.equal(footballUpdate.status, 200);
  assert.equal(footballUpdate.body.sportProfile.positionGroup, "Midfielder");
  assert.equal(footballUpdate.body.sportProfile.position, "Central Midfielder");
  assert.equal(footballUpdate.body.event, "Central Midfielder");

  // 4. Wrestling -> Freestyle -> 65 kg
  const wrestlingUpdate = await call(
    "/profile",
    "PUT",
    {
      ...profile,
      sport: "Wrestling",
      sportProfile: {
        sport: "Wrestling",
        style: "Freestyle",
        weightCategory: "65 kg",
      },
    },
    athlete,
  );
  assert.equal(wrestlingUpdate.status, 200);
  assert.equal(wrestlingUpdate.body.sportProfile.style, "Freestyle");
  assert.equal(wrestlingUpdate.body.sportProfile.weightCategory, "65 kg");

  // 5. Swimming -> 100m Freestyle -> seconds, lower is better
  const swimUpdate = await call(
    "/profile",
    "PUT",
    {
      ...profile,
      sport: "Swimming",
      sportProfile: {
        sport: "Swimming",
        stroke: "Freestyle",
        distance: "100m",
      },
    },
    athlete,
  );
  assert.equal(swimUpdate.status, 200);
  assert.equal(swimUpdate.body.sportProfile.measurement.unit, "sec");
  assert.equal(swimUpdate.body.sportProfile.measurement.direction, "lower_is_better");

  // 6. Para Athletics -> Sprint -> 100m -> T47
  const paraUpdate = await call(
    "/profile",
    "PUT",
    {
      ...profile,
      sport: "Para athletics",
      sportProfile: {
        sport: "Para athletics",
        discipline: "Track - Sprint",
        event: "100m",
        classification: "T47",
        classificationStatus: "Officially Classified",
      },
    },
    athlete,
  );
  assert.equal(paraUpdate.status, 200);
  assert.equal(paraUpdate.body.sportProfile.classification, "T47");
  assert.equal(paraUpdate.body.sportProfile.classificationStatus, "Officially Classified");

  // 7. Athlete switches sport from Para athletics to Badminton with stale sportProfile
  const switchBadminton = await call(
    "/profile",
    "PUT",
    {
      ...profile,
      sport: "Badminton",
      sportProfile: {
        sport: "Para athletics", // Stale sport!
        discipline: "Track - Sprint",
        event: "100m",
      },
    },
    athlete,
  );
  assert.equal(switchBadminton.status, 200);
  assert.equal(switchBadminton.body.sport, "Badminton");
  assert.equal(switchBadminton.body.sportProfile.sport, "Badminton");
  assert.equal(switchBadminton.body.sportProfile.format, "Singles");
  assert.equal(switchBadminton.body.unit, "points");
  assert.equal(switchBadminton.body.sportProfile.discipline, undefined); // Stale discipline purged!

  // 8. Athlete switches from Badminton to Football
  const switchFootball = await call(
    "/profile",
    "PUT",
    {
      ...profile,
      sport: "Football",
      sportProfile: switchBadminton.body.sportProfile, // Stale badminton profile!
    },
    athlete,
  );
  assert.equal(switchFootball.status, 200);
  assert.equal(switchFootball.body.sport, "Football");
  assert.equal(switchFootball.body.sportProfile.sport, "Football");
  assert.equal(switchFootball.body.sportProfile.positionGroup, "Defender");
  assert.equal(switchFootball.body.sportProfile.position, "Centre Back");
  assert.equal(switchFootball.body.sportProfile.format, undefined); // Stale format purged!

  // 9. Restore profile back to Athletics
  await call("/profile", "PUT", profile, athlete);
});

test("achievements support certificates, verification status, and timeline filtering", async () => {
  // 1. Verify certificate upload without Cloudinary returns clean configuration error (PART 46)
  const unconfiguredUpload = await call(
    "/records/certificates/upload",
    "POST",
    null,
    athlete,
  );
  assert.equal(unconfiguredUpload.status, 400);

  // 2. Ensure athlete links coach and enables sharePerformance
  await call(
    "/profile",
    "PUT",
    {
      ...profile,
      coachId: "coach@example.test",
      sharePerformance: true,
      shareHealth: true,
    },
    athlete,
  );

  // 3. Create achievement with certificate metadata
  const achRes = await call(
    "/records/achievements",
    "POST",
    {
      title: "State Athletics Championship",
      date: "2026-10-05",
      level: "State",
      result: "Gold Medal · 1st Place",
      notes: "Official championship record with photo proof",
      certificate: {
        url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        publicId: "one-nation-one-athlete/achievements/demo/sample",
        resourceType: "image",
        format: "jpg",
        originalName: "state-gold-certificate.jpg",
      },
      verificationStatus: "Self Uploaded",
    },
    athlete,
  );
  assert.equal(achRes.status, 201);
  assert.equal(achRes.body.title, "State Athletics Championship");
  assert.equal(achRes.body.certificate.format, "jpg");
  assert.equal(achRes.body.verificationStatus, "Self Uploaded");
  assert.equal(achRes.body.verified, false);

  // 4. Coach verifies achievement
  const coachVerify = await call(
    `/verify/achievements/${achRes.body.id}`,
    "POST",
    {},
    coach,
  );
  assert.equal(coachVerify.status, 200);
  assert.equal(coachVerify.body.verified, true);
  assert.equal(coachVerify.body.verificationStatus, "Coach Verified");

  // 5. Query timeline with year/month filter
  const timeline = await call(
    "/records/timeline?year=2026&month=10",
    "GET",
    null,
    athlete,
  );
  assert.equal(timeline.status, 200);
  assert.ok(Array.isArray(timeline.body));
  assert.ok(timeline.body.some((r) => r.id === achRes.body.id));
});

test("automatic sport-aware performance comparison derives age category, location benchmarks, and statistics", async () => {
  // Scenario 1: Athletics 100m Male U20 Maharashtra Nashik (Aarav Sharma seed athlete)
  // Profile: DOB 2007-04-18 => 19 years old => U20
  const compRes = await call("/performance/compare", "GET", null, athlete);
  assert.equal(compRes.status, 200);
  const data = compRes.body;

  assert.equal(data.athlete.sport, "Athletics");
  assert.equal(data.athlete.event, "100m");
  assert.equal(data.athlete.gender, "Male");
  assert.equal(data.athlete.ageCategory.id, "u20");
  assert.equal(data.athlete.state, "Maharashtra");
  assert.equal(data.athlete.district, "Nashik");

  // District tier must be populated from verified NDAA records
  assert.equal(data.district.available, true);
  assert.equal(data.district.best, 11.98);
  assert.ok(data.district.sampleSize >= 5);
  assert.equal(typeof data.district.percentile, "number");
  assert.ok(data.district.gap !== null);

  // State tier must be populated from MAA records
  assert.equal(data.state.available, true);
  assert.equal(data.state.best, 11.62);
  assert.ok(data.state.sampleSize >= 5);

  // National tier must be populated from AFI records (including PDF National Record)
  assert.equal(data.national.available, true);
  assert.ok([10.23, 10.95].includes(data.national.best));
  assert.ok(data.nationalRecord !== undefined);
  assert.equal(data.nationalRecord.athleteName, "Manikanta Hoblidhar");
  assert.equal(data.nationalRecord.performance.value, 10.23);
  assert.ok(data.nationalRecord.source.url.includes("National-Record_24NOV2024.pdf"));
  assert.equal(data.youthNationalRecord.athleteName, "Ritik Malik");
  assert.ok(data.youthNationalRecord.source.url.includes("NYR_01SEP2022-1.pdf"));
  assert.ok(data.national.sampleSize >= 5);

  // Test /benchmarks/national-records endpoint
  const nrCatalog = await call("/benchmarks/national-records", "GET", null, athlete);
  assert.equal(nrCatalog.status, 200);
  assert.ok(Array.isArray(nrCatalog.body));
  assert.ok(nrCatalog.body.length >= 20);

  // Test Profile Event Switch: 100m -> 200m
  const updatedProfile = await call(
    "/profile",
    "PUT",
    {
      ...profile,
      event: "200m",
      sportProfile: {
        sport: "Athletics",
        discipline: "Sprint",
        event: "200m",
      },
    },
    athlete,
  );
  assert.equal(updatedProfile.status, 200);

  const comp200m = await call("/performance/compare", "GET", null, athlete);
  assert.equal(comp200m.body.athlete.event, "200m");
  assert.ok([20.52, 21.8].includes(comp200m.body.national.best));
  assert.ok(comp200m.body.nationalRecord?.performance?.value === 20.52);
  // District 200m has no records -> must show fallback without faking data
  assert.equal(comp200m.body.district.available, false);
  assert.ok(comp200m.body.district.reason.includes("unavailable"));

  // Restore 100m
  await call(
    "/profile",
    "PUT",
    {
      ...profile,
      event: "100m",
      sportProfile: {
        sport: "Athletics",
        discipline: "Sprint",
        event: "100m",
      },
    },
    athlete,
  );
});

test("weight-category sports require weight and comparison automatically adapts to category updates", async () => {
  // Scenario: Wrestling without weight category shows prompt
  const pWrestlingMissing = {
    ...profile,
    sport: "Wrestling",
    event: "Freestyle",
    gender: "Male",
    birthDate: "2000-01-01", // Senior
    sportProfile: {
      sport: "Wrestling",
      style: "Freestyle",
      event: "Freestyle",
      weightCategory: "", // Missing weight!
    },
  };
  await call("/profile", "PUT", pWrestlingMissing, athlete);

  const compMissing = await call("/performance/compare", "GET", null, athlete);
  assert.equal(compMissing.status, 200);
  assert.equal(compMissing.body.missingWeight, true);
  assert.equal(
    compMissing.body.message,
    "Add your weight category to see an accurate comparison.",
  );
  assert.equal(compMissing.body.district.available, false);

  // Now athlete adds 65 kg category
  const pWrestling65 = {
    ...profile,
    sport: "Wrestling",
    event: "Freestyle · 65 kg",
    gender: "Male",
    birthDate: "2000-01-01",
    sportProfile: {
      sport: "Wrestling",
      style: "Freestyle",
      event: "Freestyle · 65 kg",
      weightCategory: "65 kg",
    },
  };
  await call("/profile", "PUT", pWrestling65, athlete);

  const comp65 = await call("/performance/compare", "GET", null, athlete);
  assert.equal(comp65.status, 200);
  assert.equal(comp65.body.athlete.weightCategory, "65 kg");
  assert.equal(comp65.body.state.best, 92);
  assert.equal(comp65.body.national.best, 120);

  // Now athlete updates weight to 74 kg
  const pWrestling74 = {
    ...profile,
    sport: "Wrestling",
    event: "Freestyle · 74 kg",
    gender: "Male",
    birthDate: "2000-01-01",
    sportProfile: {
      sport: "Wrestling",
      style: "Freestyle",
      event: "Freestyle · 74 kg",
      weightCategory: "74 kg",
    },
  };
  await call("/profile", "PUT", pWrestling74, athlete);

  const comp74 = await call("/performance/compare", "GET", null, athlete);
  assert.equal(comp74.status, 200);
  assert.equal(comp74.body.athlete.weightCategory, "74 kg");
  assert.equal(comp74.body.state.best, 88);
  assert.equal(comp74.body.national.best, 115);

  // Restore Aarav profile
  await call("/profile", "PUT", profile, athlete);
});

test("training sessions are strictly ordered by trainingDate descending and retain chronological order upon edit", async () => {
  // Create an older training session with trainingDate = 2026-09-01
  const oldSessionRes = await call(
    "/records/sessions",
    "POST",
    {
      title: "September Baseline",
      date: "2026-09-01",
      trainingDate: "2026-09-01",
      event: "100m",
      unit: "sec",
      duration: 40,
      effort: 6,
      metric: 12.4,
      pain: 1,
      fatigue: 2,
      notes: "Early month evaluation",
    },
    athlete,
  );
  assert.equal(oldSessionRes.status, 201);
  const oldSessionId = oldSessionRes.body.id;

  // Create a newer session with trainingDate = 2026-10-01
  const newSessionRes = await call(
    "/records/sessions",
    "POST",
    {
      title: "October Speed Work",
      date: "2026-10-01",
      trainingDate: "2026-10-01",
      event: "100m",
      unit: "sec",
      duration: 45,
      effort: 8,
      metric: 12.1,
      pain: 0,
      fatigue: 3,
      notes: "October session",
    },
    athlete,
  );
  assert.equal(newSessionRes.status, 201);

  // Fetch all sessions: newest trainingDate first
  let list = (await call("/records/sessions", "GET", null, athlete)).body;
  assert.ok(list.length >= 2);
  const octIdx = list.findIndex((s) => s.id === newSessionRes.body.id);
  const sepIdx = list.findIndex((s) => s.id === oldSessionId);
  assert.ok(octIdx < sepIdx, "October session must appear before September session");

  // Now edit the September session on 2026-10-08 (today)
  const editRes = await call(
    `/records/sessions/${oldSessionId}`,
    "PUT",
    {
      title: "September Baseline (Edited with Coach Review)",
      date: "2026-09-01",
      trainingDate: "2026-09-01",
      event: "100m",
      unit: "sec",
      duration: 42,
      effort: 6,
      metric: 12.38,
      pain: 1,
      fatigue: 2,
      notes: "Updated analysis",
    },
    athlete,
  );
  assert.equal(editRes.status, 200);

  // Even though it was updated today, it MUST stay sorted under 2026-09-01!
  list = (await call("/records/sessions", "GET", null, athlete)).body;
  const newOctIdx = list.findIndex((s) => s.id === newSessionRes.body.id);
  const newSepIdx = list.findIndex((s) => s.id === oldSessionId);
  assert.ok(
    newOctIdx < newSepIdx,
    "Updated September session must remain positioned chronologically by trainingDate",
  );
  assert.equal(list[newSepIdx].trainingDate, "2026-09-01");
});

test("admin benchmarks import supports deduplication and updates comparison pool", async () => {
  const newRecord = {
    sport: "Athletics",
    discipline: "Sprint",
    event: "100m",
    gender: "Male",
    ageCategory: "u20",
    classification: "Open",
    level: "district",
    country: "India",
    state: "Maharashtra",
    district: "Nashik",
    performance: { value: 11.85, metricType: "time", unit: "sec", direction: "lower_is_better" },
    athleteName: "Rohan Varma",
    competition: { name: "Nashik Spring Invitational", date: "2026-03-25", location: "Nashik" },
    source: { provider: "NDAA", name: "Nashik District Athletics Association" },
    verificationStatus: "verified",
  };

  const importRes = await call(
    "/benchmarks/import",
    "POST",
    [newRecord, newRecord], // Test duplicate in payload
    athlete,
  );
  assert.equal(importRes.status, 201);
  assert.equal(importRes.body.imported, 1);
  assert.equal(importRes.body.skipped, 1);

  // Verified district record 11.85s should now be the new district best (beating 11.98s)
  const comp = await call("/performance/compare", "GET", null, athlete);
  assert.equal(comp.body.district.best, 11.85);
});

test("adaptive sprint training lifecycle: roadmap, goals, weekly plan, check-in, and reality check", async () => {
  // 1. Roadmap inspection
  const roadmapRes = await call("/training/roadmap", "GET", null, athlete);
  assert.equal(roadmapRes.status, 200);
  assert.equal(roadmapRes.body.sport, "Athletics");
  assert.ok(Array.isArray(roadmapRes.body.levels));
  assert.equal(roadmapRes.body.levels.length, 6);
  assert.ok(roadmapRes.body.levels[0].criteria.length > 0);

  // 2. Goal inspection and update
  const goalsRes = await call("/training/goals", "GET", null, athlete);
  assert.equal(goalsRes.status, 200);
  assert.ok(goalsRes.body.yearGoal);
  assert.ok(goalsRes.body.monthGoal);

  const updatedGoals = await call(
    "/training/goals",
    "PUT",
    {
      yearGoal: { targetValue: 11.7, targetDate: "2027-06-20", competitionTarget: "State Championship" },
      monthGoal: {
        primaryObjective: "Improve 0-20m acceleration",
        targets: { sprint10m: 1.98, standingBroadJump: 2.45 },
      },
    },
    athlete,
  );
  assert.equal(updatedGoals.status, 200);
  assert.equal(updatedGoals.body.goals.yearGoal.targetValue, 11.7);
  assert.equal(updatedGoals.body.goals.monthGoal.targets.sprint10m, 1.98);

  // 3. Weekly plan generation and inspection
  const planRes = await call("/training/plan", "GET", null, athlete);
  assert.equal(planRes.status, 200);
  const plan = planRes.body;
  assert.ok(plan.id);
  assert.equal(plan.days.length, 7);
  assert.equal(plan.days[0].dayOfWeek, "Monday");
  assert.equal(plan.days[6].dayOfWeek, "Sunday");

  // 4. Daily check-in: Complete Monday
  const checkinMon = await call(
    `/training/plan/${plan.id}/session/0`,
    "PUT",
    {
      status: "completed",
      rpe: 7,
      recovery: "Good",
      painFlag: false,
      notes: "Felt crisp through 20m drive phase.",
      actualExercises: [{ name: "30m Sprint", actualSets: 4, actualReps: 1, actualMetric: "3.20s", completed: true }],
    },
    athlete,
  );
  assert.equal(checkinMon.status, 200);
  assert.equal(checkinMon.body.plan.days[0].athleteCompletion.status, "completed");

  // 5. Daily check-in: Miss Tuesday with reason (no workload stacking)
  const checkinTue = await call(
    `/training/plan/${plan.id}/session/1`,
    "PUT",
    {
      status: "missed",
      missedReason: "No time",
      notes: "School exam",
    },
    athlete,
  );
  assert.equal(checkinTue.status, 200);
  assert.equal(checkinTue.body.plan.days[1].athleteCompletion.status, "missed");
  assert.equal(checkinTue.body.plan.days[1].athleteCompletion.missedReason, "No time");

  // 6. Daily check-in: Partial Wednesday with pain flag (triggers safety alert)
  const checkinWed = await call(
    `/training/plan/${plan.id}/session/2`,
    "PUT",
    {
      status: "partial",
      rpe: 8,
      recovery: "Sore",
      painFlag: true,
      notes: "Mild tightness in left proximal hamstring.",
    },
    athlete,
  );
  assert.equal(checkinWed.status, 200);
  assert.equal(checkinWed.body.plan.days[2].athleteCompletion.painFlag, true);

  // 7. Sunday review reflects adherence and safety flags
  const reviewRes = await call(`/training/review/${plan.id}`, "GET", null, athlete);
  assert.equal(reviewRes.status, 200);
  assert.ok(reviewRes.body.review.adherenceScore !== undefined);
  assert.ok(reviewRes.body.review.safetyAlert, "Review must flag safety alert due to reported pain");

  // 8. Reality check calculation
  const realityRes = await call("/training/reality-check", "GET", null, athlete);
  assert.equal(realityRes.status, 200);
  assert.ok(realityRes.body.assessment);
  assert.ok(realityRes.body.recommendation);
  assert.ok(realityRes.body.gap !== undefined);

  // 9. Centralized sprint exercise library
  const libRes = await call("/training/library", "GET", null, athlete);
  assert.equal(libRes.status, 200);
  assert.ok(libRes.body.exercises.length >= 10);
});

test("coach training management: athlete list, dossier, plan builder, versioning, overrides, RBAC", async () => {
  // Ensure athlete profile has coachId set
  await call(
    "/profile",
    "PUT",
    {
      ...profile,
      sport: "Athletics",
      discipline: "Sprint",
      event: "100m",
      coachId: "coach@example.test",
      sharePerformance: true,
      shareHealth: true,
    },
    athlete,
  );

  // 1. Role-based access: Athlete cannot call coach-hub endpoints
  const athDenied = await call("/coach-hub/athletes", "GET", null, athlete);
  assert.equal(athDenied.status, 403);

  // 2. Coach calls /coach-hub/athletes
  const coachList = await call("/coach-hub/athletes", "GET", null, coach);
  assert.equal(coachList.status, 200);
  assert.ok(coachList.body.summary);
  assert.ok(Array.isArray(coachList.body.athletes));

  // The athlete linked to coach@example.test should appear
  const athleteItem = coachList.body.athletes.find((a) => a.athleteId === profile.id);
  assert.ok(athleteItem, "Linked athlete should appear in coach list");

  // 3. Coach fetches full athlete dossier
  const dossier = await call(`/coach-hub/athlete/${profile.id}`, "GET", null, coach);
  assert.equal(dossier.status, 200);
  assert.equal(dossier.body.profile.id, profile.id);
  assert.ok(dossier.body.currentPlan);
  assert.ok(dossier.body.goals);
  assert.ok(dossier.body.roadmap);

  // 4. Coach publishes weekly plan (version 1)
  const newCoachPlan = {
    weekStart: "2026-10-12",
    weekEnd: "2026-10-18",
    phase: "Competition Preparation",
    weeklyObjective: "Race Model Execution & Starts",
    days: [
      {
        dayOfWeek: "Monday",
        sessionType: "Acceleration & Block Starts",
        objective: "0-30m block starts at 98%",
        expectedDuration: 75,
        targetIntensity: "Maximal (95-100%)",
        coachNotes: "Focus on low heel recovery in steps 1-3.",
        exercises: [{ name: "Block Starts 30m", sets: 4, reps: 1, distance: "30m", intensity: "100%", rest: "4 min" }],
      },
      {
        dayOfWeek: "Tuesday",
        sessionType: "Sprint Strength",
        objective: "Posterior chain power",
        expectedDuration: 60,
        targetIntensity: "High (90-95%)",
        exercises: [{ name: "Trap Bar Deadlift", sets: 4, reps: 3, rest: "3 min" }],
      },
      { dayOfWeek: "Wednesday", sessionType: "Recovery & Mobility", expectedDuration: 45 },
      { dayOfWeek: "Thursday", sessionType: "Maximum Velocity", objective: "Flying 20m", expectedDuration: 60 },
      { dayOfWeek: "Friday", sessionType: "Power & Plyometrics", expectedDuration: 50 },
      { dayOfWeek: "Saturday", sessionType: "Active Recovery", expectedDuration: 30 },
      { dayOfWeek: "Sunday", sessionType: "Rest & Weekly Review", expectedDuration: 0 },
    ],
  };

  const publishRes1 = await call(`/coach-hub/athlete/${profile.id}/plan`, "POST", newCoachPlan, coach);
  assert.equal(publishRes1.status, 201);
  assert.equal(publishRes1.body.plan.source, "coach");
  assert.equal(publishRes1.body.plan.version, 1);

  // 5. Coach modifies and republishes plan -> version increments to 2
  newCoachPlan.weeklyObjective = "Updated Race Model & Block Starts";
  const publishRes2 = await call(`/coach-hub/athlete/${profile.id}/plan`, "POST", newCoachPlan, coach);
  assert.equal(publishRes2.status, 201);
  assert.equal(publishRes2.body.plan.version, 2);

  // 6. Athlete now sees the coach-published plan as the authoritative source
  const athPlanRes = await call("/training/plan", "GET", null, athlete);
  assert.equal(athPlanRes.body.source, "coach");
  assert.equal(athPlanRes.body.version, 2);
  assert.equal(athPlanRes.body.weeklyObjective, "Updated Race Model & Block Starts");

  // 7. Coach submits override recommendation with audit reason
  const overrideRes = await call(
    `/coach-hub/athlete/${profile.id}/override`,
    "POST",
    {
      reason: "Athlete entering State Trials next weekend; tapering acceleration volume.",
      action: "reduce_volume",
    },
    coach,
  );
  assert.equal(overrideRes.status, 200);
  assert.ok(overrideRes.body.override.timestamp);
  assert.equal(overrideRes.body.override.reason, "Athlete entering State Trials next weekend; tapering acceleration volume.");

  // 8. Coach cannot access unrelated athlete
  const forbiddenRes = await call(`/coach-hub/athlete/unrelated-athlete-id`, "GET", null, coach);
  assert.equal(forbiddenRes.status, 404);
});

test("complete coach module endpoints: dashboard, athletes, dossiers, draft/publish lifecycle, notifications, profile, security", async () => {
  // 1. Dashboard
  const dashRes = await call("/coach/dashboard", "GET", null, coach);
  assert.equal(dashRes.status, 200);
  assert.ok(dashRes.body.summary);
  assert.ok(dashRes.body.summary.totalAthletes >= 1);
  assert.ok(Array.isArray(dashRes.body.recentAthletes));
  assert.ok(Array.isArray(dashRes.body.todaySessions));
  assert.ok(Array.isArray(dashRes.body.safetyAlerts));

  // 2. Athletes list with filtering
  const athListRes = await call("/coach/athletes?search=Aarav", "GET", null, coach);
  assert.equal(athListRes.status, 200);
  assert.ok(athListRes.body.athletes.length >= 1);
  assert.equal(athListRes.body.athletes[0].name, "Aarav Sharma");
  assert.ok(athListRes.body.athletes[0].trainingStatus);

  // 3. Performance Tab
  const perfRes = await call(`/coach/athletes/${profile.id}/performance`, "GET", null, coach);
  assert.equal(perfRes.status, 200);
  assert.ok(perfRes.body.currentPB !== undefined);
  assert.ok(Array.isArray(perfRes.body.progression));

  // 4. Training Tab
  const trainRes = await call(`/coach/athletes/${profile.id}/training`, "GET", null, coach);
  assert.equal(trainRes.status, 200);
  assert.ok(trainRes.body.sessions);
  assert.ok(trainRes.body.adherencePercentage !== undefined);

  // 5. Recovery Tab
  const recRes = await call(`/coach/athletes/${profile.id}/recovery`, "GET", null, coach);
  assert.equal(recRes.status, 200);
  assert.ok(recRes.body.wellbeing);
  assert.ok(recRes.body.recoveryStatus);

  // 6. Goals Tab (GET & PUT)
  const goalsRes = await call(`/coach/athletes/${profile.id}/goals`, "GET", null, coach);
  assert.equal(goalsRes.status, 200);
  const updatedGoals = await call(
    `/coach/athletes/${profile.id}/goals`,
    "PUT",
    {
      yearGoal: { ...goalsRes.body.yearGoal, targetPB: 11.65 },
      monthGoal: { ...goalsRes.body.monthGoal, primaryObjective: "Speed Endurance 60-100m" },
    },
    coach,
  );
  assert.equal(updatedGoals.status, 200);
  assert.equal(updatedGoals.body.goals.yearGoal.targetPB, 11.65);

  // 7. Roadmap Tab
  const roadmapRes = await call(`/coach/athletes/${profile.id}/roadmap`, "GET", null, coach);
  assert.equal(roadmapRes.status, 200);
  assert.ok(roadmapRes.body.currentLevel);
  assert.ok(Array.isArray(roadmapRes.body.levels));

  // 8. Plan Builder: Create Draft Plan -> Athlete should NOT see draft!
  const draftWeekStart = "2026-11-02";
  const draftWeekEnd = "2026-11-08";
  const draftPlanPayload = {
    athleteId: profile.id,
    weekStart: draftWeekStart,
    weekEnd: draftWeekEnd,
    phase: "Speed Endurance",
    weeklyObjective: "Speed maintenance under lactic fatigue",
    status: "draft",
    days: [
      { dayIndex: 0, dayOfWeek: "Monday", sessionType: "Speed Endurance", expectedDuration: 60, targetIntensity: 95, date: "2026-11-02" },
      { dayIndex: 1, dayOfWeek: "Tuesday", sessionType: "Strength", expectedDuration: 50, targetIntensity: 90, date: "2026-11-03" },
      { dayIndex: 2, dayOfWeek: "Wednesday", sessionType: "Recovery", expectedDuration: 30, targetIntensity: 60, date: "2026-11-04" },
      { dayIndex: 3, dayOfWeek: "Thursday", sessionType: "Max Velocity", expectedDuration: 60, targetIntensity: 95, date: "2026-11-05" },
      { dayIndex: 4, dayOfWeek: "Friday", sessionType: "Plyometrics", expectedDuration: 45, targetIntensity: 90, date: "2026-11-06" },
      { dayIndex: 5, dayOfWeek: "Saturday", sessionType: "Mobility", expectedDuration: 30, targetIntensity: 50, date: "2026-11-07" },
      { dayIndex: 6, dayOfWeek: "Sunday", sessionType: "Review", expectedDuration: 0, targetIntensity: 0, date: "2026-11-08" },
    ],
  };

  const draftRes = await call("/coach/training-plans", "POST", draftPlanPayload, coach);
  assert.equal(draftRes.status, 201);
  assert.equal(draftRes.body.plan.status, "draft");

  // Athlete fetches plan for that week: should NOT see the draft!
  const athPlanCheck = await call(`/training/plan?weekStart=${draftWeekStart}`, "GET", null, athlete);
  assert.ok(!athPlanCheck.body || athPlanCheck.body.status !== "draft", "Athlete must not see coach draft plan");

  // 9. Coach publishes the plan
  const publishRes = await call(`/coach/training-plans/${draftRes.body.plan.id}/publish`, "POST", {}, coach);
  assert.equal(publishRes.status, 200);
  assert.equal(publishRes.body.plan.status, "published");

  // Now athlete sees the published plan!
  const athPublishedPlan = await call(`/training/plan?weekStart=${draftWeekStart}`, "GET", null, athlete);
  assert.equal(athPublishedPlan.status, 200);
  assert.equal(athPublishedPlan.body.id, draftRes.body.plan.id);
  assert.equal(athPublishedPlan.body.status, "published");

  // 10. Coach reschedules Wednesday session
  const reschedRes = await call(
    `/coach/training-plans/${draftRes.body.plan.id}/reschedule`,
    "POST",
    { dayIndex: 2, newDate: "2026-11-04", coachNotes: "Shifted to light pool flush due to travel" },
    coach,
  );
  assert.equal(reschedRes.status, 200);
  assert.ok(reschedRes.body.plan.days[2].coachNotes.includes("Shifted to light pool flush"));

  // 11. Notifications
  const notifRes = await call("/coach/notifications", "GET", null, coach);
  assert.equal(notifRes.status, 200);
  assert.ok(Array.isArray(notifRes.body));

  // 12. Coach Profile (GET & PUT)
  const profGet = await call("/coach/profile", "GET", null, coach);
  assert.equal(profGet.status, 200);
  assert.equal(profGet.body.email, "coach@example.test");

  const profUpdate = await call(
    "/coach/profile",
    "PUT",
    {
      name: "Senior Coach Sharma",
      specialization: "Olympic Sprint & Relay Specialist",
      sports: ["Athletics"],
      events: ["100m", "200m", "4x100m"],
      experienceYears: 12,
      certifications: [
        { name: "World Athletics Level 2 Coach", issuer: "World Athletics", year: "2024", verificationStatus: "Unverified" },
      ],
      organization: "National Elite Sprint Center",
      state: "Maharashtra",
      district: "Nashik",
      bio: "High performance sprint coach training national level junior athletes.",
      contactPhone: "+91 98765 43210",
    },
    coach,
  );
  assert.equal(profUpdate.status, 200);
  assert.equal(profUpdate.body.name, "Senior Coach Sharma");
  assert.equal(profUpdate.body.certifications[0].verificationStatus, "Unverified");

  // 13. Security: Coach 2 cannot access Coach 1's athlete
  const coach2 = (
    await call("/auth/register", "POST", {
      name: "Coach Two",
      email: "coach2@example.test",
      password: "Password123!",
      role: "coach",
    })
  ).cookie;

  const forbiddenDetail = await call(`/coach/athletes/${profile.id}`, "GET", null, coach2);
  assert.equal(forbiddenDetail.status, 403);
});

test("athlete cannot change sport once sport is locked", async () => {
  // First lock the sport to Athletics
  const lockRes = await call(
    "/profile",
    "PUT",
    {
      ...profile,
      sport: "Athletics",
      sportLocked: true,
    },
    athlete,
  );
  assert.equal(lockRes.status, 200);
  assert.equal(lockRes.body.sportLocked, true);
  assert.equal(lockRes.body.sport, "Athletics");

  // Attempting to change sport to Badminton must be rejected with 400
  const changeRes = await call(
    "/profile",
    "PUT",
    {
      ...profile,
      sport: "Badminton",
      sportLocked: false,
    },
    athlete,
  );
  assert.equal(changeRes.status, 400);
  assert.match(changeRes.body.error, /permanently locked/i);

  // Verifying profile still retains Athletics and sportLocked
  const checkProf = await call("/profile", "GET", null, athlete);
  assert.equal(checkProf.body.sport, "Athletics");
  assert.equal(checkProf.body.sportLocked, true);
});

test("record and account deletion revoke access", async () => {
  assert.equal(
    (await call("/records/sessions/" + session.id, "DELETE", null, athlete))
      .status,
    200,
  );
  assert.equal((await call("/account", "DELETE", null, athlete)).status, 200);
  assert.equal((await call("/me", "GET", null, athlete)).status, 401);
});
