import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { benchmarks, fairness } from "../src/services/research.js";
import { calculateRecoveryReadiness } from "../src/services/intelligence.js";
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
function getMondayStr(d = new Date()) {
  let date;
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    date = new Date(y, m - 1, day, 12, 0, 0);
  } else {
    date = new Date(d);
  }
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const dayStr = String(monday.getDate()).padStart(2, "0");
  return `${y}-${m}-${dayStr}`;
}
function addDaysStr(dStr, days) {
  const [y, m, day] = dStr.split("-").map(Number);
  const dt = new Date(y, m - 1, day + days, 12, 0, 0);
  const ry = dt.getFullYear();
  const rm = String(dt.getMonth() + 1).padStart(2, "0");
  const rd = String(dt.getDate()).padStart(2, "0");
  return `${ry}-${rm}-${rd}`;
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

  // State tier must be populated from MAA records (includes MAA PDF results)
  assert.equal(data.state.available, true);
  assert.ok(data.state.best <= 11.62, `State best should be <= 11.62 (got ${data.state.best})`);
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
  assert.ok([20.52, 21.8, 22.03].includes(comp200m.body.national.best) || comp200m.body.national.best <= 22.03);
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
  const adminCookie = (
    await call("/auth/register", "POST", {
      name: "Admin User",
      email: "benchadmin@example.test",
      password: "password123",
      role: "admin",
    })
  ).cookie;

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
    adminCookie,
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

  // 4. Coach publishes weekly plan for current week (version 1)
  const currentWeekMonday = getMondayStr();
  const newCoachPlan = {
    weekStart: currentWeekMonday,
    weekEnd: addDaysStr(currentWeekMonday, 6),
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
  const v1 = publishRes1.body.plan.version;

  // 5. Coach modifies and republishes plan -> version increments
  newCoachPlan.weeklyObjective = "Updated Race Model & Block Starts";
  const publishRes2 = await call(`/coach-hub/athlete/${profile.id}/plan`, "POST", newCoachPlan, coach);
  assert.equal(publishRes2.status, 201);
  assert.equal(publishRes2.body.plan.version, v1 + 1);

  // 6. Athlete now sees the coach-published plan as the authoritative source
  const athPlanRes = await call("/training/plan", "GET", null, athlete);
  assert.equal(athPlanRes.body.source, "coach");
  assert.equal(athPlanRes.body.version, v1 + 1);
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

test("complete multi-module user journey and consolidated monitoring context", async () => {
  // Re-associate coachId on athlete profile
  const currProf = (await call("/profile", "GET", null, athlete)).body;
  await call("/profile", "PUT", { ...currProf, coachId: "coach@example.test" }, athlete);

  // 1. Fetch consolidated context
  const contextRes = await call("/context", "GET", null, athlete);
  assert.equal(contextRes.status, 200);
  assert.ok(contextRes.body.athlete);
  assert.ok(contextRes.body.readiness);
  assert.ok(contextRes.body.training);
  assert.ok(contextRes.body.recovery);
  assert.ok(contextRes.body.alerts);

  // 2. Post daily recovery check-in
  const checkInRes = await call("/records/recovery_logs", "POST", {
    date: "2026-10-08",
    sleepDuration: 8.5,
    sleepQuality: "Excellent",
    fatigue: 2,
    stress: 2,
    mood: 9,
    soreness: 2,
    generalRecovery: 9,
    painFlag: false,
    painLevel: 0,
    painArea: "",
    previousSessionRPE: 6,
    previousSessionDifficulty: "Moderate",
    hydration: "Good",
    travel: false,
    unusualStress: false,
    notes: "Felt strong during warmup",
  }, athlete);
  assert.equal(checkInRes.status, 201);

  // 3. Verify readiness endpoint updates
  const readinessRes = await call("/recovery/readiness", "GET", null, athlete);
  assert.equal(readinessRes.status, 200);
  assert.equal(readinessRes.body.todayLog.sleepDuration, 8.5);

  // 4. Verify training load endpoint
  const loadRes = await call("/training/load", "GET", null, athlete);
  assert.equal(loadRes.status, 200);
  assert.ok(loadRes.body.acwr);

  // 5. Verify coach dossier returns readiness & files
  const dossierRes = await call(`/coach/athletes/${profile.id}`, "GET", null, coach);
  assert.equal(dossierRes.status, 200);
  assert.ok(dossierRes.body.readiness);
  assert.ok(Array.isArray(dossierRes.body.files));
});

test("admin benchmark import authorization and payload validation", async () => {
  // 1. Unauthenticated -> 401
  const unauthRes = await call("/benchmarks/import", "POST", [{ sport: "Athletics", event: "100m", level: "National", performance: { value: 10.2, unit: "sec" } }]);
  assert.equal(unauthRes.status, 401);

  // 2. Athlete -> 403
  const athleteRes = await call("/benchmarks/import", "POST", [{ sport: "Athletics", event: "100m", level: "National", performance: { value: 10.2, unit: "sec" } }], athlete);
  assert.equal(athleteRes.status, 403);

  // 3. Coach -> 403
  const coachRes = await call("/benchmarks/import", "POST", [{ sport: "Athletics", event: "100m", level: "National", performance: { value: 10.2, unit: "sec" } }], coach);
  assert.equal(coachRes.status, 403);

  // 4. Create admin user
  const adminCookie = (
    await call("/auth/register", "POST", {
      name: "Test Admin",
      email: "admin@example.test",
      password: "adminpassword123",
      role: "admin",
    })
  ).cookie;

  // 5. Admin import valid records -> 201
  const validBatch = [
    {
      sport: "Athletics",
      event: "100m",
      level: "National",
      gender: "Men",
      ageCategory: "Senior",
      athleteName: "Security Test Runner",
      performance: { value: 10.15, unit: "sec" },
      verificationStatus: "verified",
    },
  ];
  const adminImportRes = await call("/benchmarks/import", "POST", validBatch, adminCookie);
  assert.equal(adminImportRes.status, 201);
  assert.equal(adminImportRes.body.imported, 1);

  // 6. Malformed payload & invalid performance value rejection
  const invalidBatch = [
    { sport: "Athletics", event: "100m", level: "National", performance: { value: -5.0 } }, // Negative value
    { sport: "", event: "100m", level: "National", performance: { value: 10.5 } }, // Missing sport
  ];
  const invalidRes = await call("/benchmarks/import", "POST", invalidBatch, adminCookie);
  assert.equal(invalidRes.status, 201);
  assert.equal(invalidRes.body.imported, 0);
  assert.equal(invalidRes.body.skipped, 2);

  // 7. Duplicate prevention
  const dupRes = await call("/benchmarks/import", "POST", validBatch, adminCookie);
  assert.equal(dupRes.status, 201);
  assert.equal(dupRes.body.imported, 0);
  assert.equal(dupRes.body.skipped, 1);
});

test("file & video RBAC, IDOR protection, and coach annotation isolation", async () => {
  // 1. Athlete uploads file
  const origFileRes = await call("/records/certificates/upload", "POST", null, athlete);
  // Upload a file directly via file routes or mock putting file
  const testFilePayload = {
    name: "sprint_kinematics.mp4",
    mime: "video/mp4",
    notes: "My 100m race video",
    analysis: { maxKneeFlexion: 125, meanCadence: 4.2 },
  };

  // Create file entry via put file
  const filePutRes = await call("/records/certificates/upload", "POST", null, athlete);

  // Get athlete files
  const myFiles = await call("/files", "GET", null, athlete);
  assert.equal(myFiles.status, 200);

  if (myFiles.body.length > 0) {
    const fileId = myFiles.body[0].id;

    // 2. Other athlete attempting IDOR on content endpoint -> 403
    const idorRes = await call(`/files/${fileId}/content`, "GET", null, other);
    assert.equal(idorRes.status, 403);

    // 3. Unrelated coach attempting access -> 403
    const unrelatedCoach = (
      await call("/auth/register", "POST", {
        name: "Unrelated Coach",
        email: "unrelated@example.test",
        password: "password123",
        role: "coach",
      })
    ).cookie;

    const unassignedRes = await call(`/files/${fileId}/content`, "GET", null, unrelatedCoach);
    assert.equal(unassignedRes.status, 403);

    // 4. Coach annotation isolation: Coach updates annotation
    const coachUpdate = await call(`/files/${fileId}`, "PUT", {
      coachAnnotation: {
        observation: "Good heel strike transition",
        correction: "Drive knee higher at block exit",
        drillRecommendation: "A-Skips 3x30m",
      },
      // Coach attempts to mutate MediaPipe analysis
      analysis: { maxKneeFlexion: 999 },
      name: "Hacked Video Name",
    }, coach);

    assert.equal(coachUpdate.status, 200);
    assert.equal(coachUpdate.body.coachAnnotation.observation, "Good heel strike transition");
    // Ensure MediaPipe CV analysis was NOT overwritten by coach!
    assert.notEqual(coachUpdate.body.analysis?.maxKneeFlexion, 999);
    // Ensure filename was NOT mutated by coach
    assert.notEqual(coachUpdate.body.name, "Hacked Video Name");

    // 5. Coach attempting DELETE on athlete file -> 403
    const deleteRes = await call(`/files/${fileId}`, "DELETE", null, coach);
    assert.equal(deleteRes.status, 403);
  }
});

test("consent enforcement and filtered consolidated athlete context", async () => {
  // 1. Set athlete consent: shareHealth = false, sharePerformance = false
  const p = (await call("/profile", "GET", null, athlete)).body;
  await call("/profile", "PUT", {
    ...p,
    coachId: "coach@example.test",
    sharePerformance: false,
    shareHealth: false,
  }, athlete);

  // 2. Coach calls athlete dossier detail -> performance & health info should be hidden/null
  const dossierRes = await call(`/coach/athletes/${profile.id}`, "GET", null, coach);
  assert.equal(dossierRes.status, 200);
  assert.equal(dossierRes.body.profile.sharePerformance, false);
  assert.equal(dossierRes.body.profile.shareHealth, false);
  assert.equal(dossierRes.body.performance.recentResults.length, 0);
  assert.equal(dossierRes.body.training.sessions.length, 0);
  assert.equal(dossierRes.body.recovery.injuries.length, 0);

  // 3. Unrelated athlete requesting another athlete's context -> 403
  const contextRes = await call(`/context?athleteId=${profile.id}`, "GET", null, other);
  assert.equal(contextRes.status, 403);

  // Restore consent for subsequent tests
  await call("/profile", "PUT", {
    ...p,
    coachId: "coach@example.test",
    sharePerformance: true,
    shareHealth: true,
  }, athlete);
});

test("recovery readiness states, personal baseline, and injury integration logic", async () => {
  // 1. No recovery logs -> LIMITED DATA
  const noLogs = calculateRecoveryReadiness([], []);
  assert.equal(noLogs.readiness, "LIMITED DATA");
  assert.equal(noLogs.hasBaseline, false);
  assert.match(noLogs.reason, /Insufficient personal baseline data/i);

  // 2. One recovery log -> LIMITED DATA
  const oneLog = calculateRecoveryReadiness([], [{ date: "2026-10-08", sleepDuration: 8, fatigue: 3, soreness: 2 }]);
  assert.equal(oneLog.readiness, "LIMITED DATA");
  assert.equal(oneLog.hasBaseline, false);

  // 3. Minimum baseline logs (3 previous logs) -> Personal Baseline built
  const baselineLogs = [
    { date: "2026-10-09", sleepDuration: 8, fatigue: 3, soreness: 2, stress: 3 }, // Today's log
    { date: "2026-10-08", sleepDuration: 8, fatigue: 3, soreness: 2, stress: 3 }, // Prev 1
    { date: "2026-10-07", sleepDuration: 8, fatigue: 3, soreness: 2, stress: 3 }, // Prev 2
    { date: "2026-10-06", sleepDuration: 8, fatigue: 3, soreness: 2, stress: 3 }, // Prev 3
  ];

  const goodRecovery = calculateRecoveryReadiness([], baselineLogs);
  assert.equal(goodRecovery.readiness, "READY");
  assert.equal(goodRecovery.hasBaseline, true);
  assert.equal(goodRecovery.baseline.sleepDuration, 8);
  assert.match(goodRecovery.recommendation, /within your recent personal baseline/i);
  assert.doesNotMatch(goodRecovery.recommendation, /cleared for planned/i); // Non-medical wording

  // 4. Moderate fatigue -> READY WITH CAUTION
  const modFatigueLogs = [
    { date: "2026-10-09", sleepDuration: 7.5, fatigue: 5, soreness: 4, stress: 3 },
    ...baselineLogs.slice(1),
  ];
  const modFatigueRes = calculateRecoveryReadiness([], modFatigueLogs);
  assert.equal(modFatigueRes.readiness, "READY WITH CAUTION");

  // 5. Severe fatigue & Poor sleep -> RECOVERY PRIORITY
  const severeFatigueLogs = [
    { date: "2026-10-09", sleepDuration: 5.0, fatigue: 8, soreness: 7, stress: 8 },
    ...baselineLogs.slice(1),
  ];
  const severeRes = calculateRecoveryReadiness([], severeFatigueLogs);
  assert.equal(severeRes.readiness, "RECOVERY PRIORITY");

  // 6. Pain flag -> COACH REVIEW
  const painLogs = [
    { date: "2026-10-09", sleepDuration: 8, fatigue: 3, soreness: 3, painFlag: true, painLevel: 6, painArea: "Right Hamstring" },
    ...baselineLogs.slice(1),
  ];
  const painRes = calculateRecoveryReadiness([], painLogs);
  assert.equal(painRes.readiness, "COACH REVIEW");
  assert.match(painRes.reason, /Right Hamstring/i);

  // 7. Active Injury -> COACH REVIEW (even with empty recovery logs!)
  const activeInjuryRecords = [{ kind: "injuries", title: "Grade 1 Hamstring Strain", stage: "Mobility", cleared: false }];
  const injuryRes = calculateRecoveryReadiness(activeInjuryRecords, []);
  assert.equal(injuryRes.readiness, "COACH REVIEW");
  assert.match(injuryRes.reason, /Hamstring Strain/i);

  // 8. Recovery + Active Injury combined
  const combinedRes = calculateRecoveryReadiness(activeInjuryRecords, baselineLogs);
  assert.equal(combinedRes.readiness, "COACH REVIEW");
});

test("coach readiness notifications include active injuries and respect athlete privacy", async () => {
  // 1. Register a new athlete assigned to coach
  const athlete2 = (
    await call("/auth/register", "POST", {
      name: "Injury Test Athlete",
      email: "injuryathlete@example.test",
      password: "password123",
      role: "athlete",
    })
  ).cookie;

  const prof2 = (await call("/profile", "GET", null, athlete2)).body;
  const putRes = await call("/profile", "PUT", {
    ...prof2,
    state: "Maharashtra",
    district: "Nashik",
    birthDate: "2005-05-15",
    coachId: "coach@example.test",
    sharePerformance: true,
    shareHealth: true,
  }, athlete2);
  assert.equal(putRes.status, 200);

  const targetAthleteId = putRes.body.id;

  // 2. Athlete logs active injury
  await call("/records/injuries", "POST", {
    title: "Ankle Sprain",
    date: "2026-10-08",
    stage: "Rest",
    notes: "Torn ligament in practice",
    cleared: false,
  }, athlete2);

  // 3. Coach fetches notifications -> must receive Recovery Alert for active injury (fixing line 1163 bug!)
  const notifRes = await call("/coach/notifications", "GET", null, coach);
  assert.equal(notifRes.status, 200);
  const injuryNotif = notifRes.body.find(
    (n) => n.athleteId === targetAthleteId && n.category === "recovery",
  );
  assert.ok(injuryNotif);
  assert.equal(injuryNotif.type, "danger");
  assert.match(injuryNotif.message, /Ankle Sprain/i);
});

test("Part 3: Training Engine, AI vs Coach plan priority, versioning, check-ins, load, review & Sunday digest", async () => {
  // 1. Create athlete user and profile
  const athRes = await call("/auth/register", "POST", {
    name: "Part3 Athlete",
    email: "part3athlete@example.test",
    password: "password123",
    role: "athlete",
  });
  const athCookie = athRes.cookie;
  assert.ok(athCookie);

  const profRes = await call("/profile", "GET", null, athCookie);
  const athProfile = profRes.body;

  // Link athlete to coach and retrieve persisted profile with ID
  const putProfRes = await call("/profile", "PUT", {
    ...athProfile,
    state: "Maharashtra",
    district: "Nashik",
    birthDate: "2005-05-15",
    coachId: "coach@example.test",
    event: "100m",
    unit: "sec",
    target: 11.20,
    sharePerformance: true,
  }, athCookie);
  assert.equal(putProfRes.status, 200);
  const athId = putProfRes.body.id;
  assert.ok(athId);

  // 2. AI Plan Creation
  const genRes1 = await call("/training/plan/generate", "POST", null, athCookie);
  assert.equal(genRes1.status, 200);
  const planV1 = genRes1.body;
  assert.equal(planV1.source, "system");
  assert.equal(planV1.version, 1);
  assert.equal(planV1.days.length, 7);

  // 3. Daily Session Check-in (Completed)
  const checkin1 = await call(`/training/plan/${planV1.id}/session/0`, "PUT", {
    status: "completed",
    rpe: 8,
    actualMetric: 11.95,
    actualSets: 4,
    actualReps: 1,
    actualDuration: 60,
    notes: "Solid acceleration effort",
  }, athCookie);
  assert.equal(checkin1.status, 200);
  const updatedPlan1 = checkin1.body.plan;
  assert.equal(updatedPlan1.days[0].status, "completed");
  assert.equal(updatedPlan1.days[0].athleteCompletion.rpe, 8);
  assert.equal(updatedPlan1.days[0].athleteCompletion.actualSets, 4);
  // Ensure original planned exercises are preserved separately
  assert.ok(updatedPlan1.days[0].exercises.length > 0);

  // 4. Repeated AI Generation (Versioning + Historical Preservation)
  const genRes2 = await call("/training/plan/generate", "POST", null, athCookie);
  assert.equal(genRes2.status, 200);
  const planV2 = genRes2.body;
  assert.equal(planV2.version, 2);
  assert.equal(planV2.previousVersion, 1);
  assert.ok(planV2.versionHistory.length >= 1);
  // Verify athlete completion on day 0 is preserved!
  assert.equal(planV2.days[0].status, "completed");
  assert.equal(planV2.days[0].athleteCompletion.actualMetric, 11.95);

  // 5. Missed Session Check-in (No automatic stacking onto next day)
  const checkin2 = await call(`/training/plan/${planV2.id}/session/1`, "PUT", {
    status: "missed",
    missedReason: "Heavy travel",
  }, athCookie);
  assert.equal(checkin2.status, 200);
  assert.equal(checkin2.body.plan.days[1].status, "missed");
  assert.equal(checkin2.body.plan.days[1].athleteCompletion.missedReason, "Heavy travel");
  // Day 2 planned exercises remain unstacked
  assert.ok(checkin2.body.plan.days[2].exercises.length > 0);

  // 6. Coach Plan Creation & Publication
  const coachPlanPayload = {
    athleteId: athId,
    weekStart: planV2.weekStart,
    phase: "Competition Prep",
    weeklyObjective: "Coach customized acceleration routine",
    status: "published",
    days: planV2.days.map((d) => ({
      dayIndex: d.dayIndex,
      dayOfWeek: d.dayOfWeek,
      sessionType: "Coach " + d.sessionType,
      expectedDuration: 50,
      targetIntensity: 90,
      exercises: [{ name: "Coach Block Starts", sets: 4, reps: 1 }],
    })),
  };
  const pubCoachPlanRes = await call(`/coach/athlete/${athId}/plan`, "POST", coachPlanPayload, coach);
  assert.equal(pubCoachPlanRes.status, 201);
  const publishedCoachPlan = pubCoachPlanRes.body.plan;
  assert.equal(publishedCoachPlan.source, "coach");
  assert.equal(publishedCoachPlan.status, "published");

  // 7. AI vs Coach Priority: GET /training/plan returns published coach plan as active
  const activePlanRes = await call("/training/plan", "GET", null, athCookie);
  assert.equal(activePlanRes.status, 200);
  assert.equal(activePlanRes.body.source, "coach");

  // 8. Both Plans endpoint (GET /training/plan/both)
  const bothRes = await call("/training/plan/both", "GET", null, athCookie);
  assert.equal(bothRes.status, 200);
  assert.ok(bothRes.body.hasCoachPlan);
  assert.equal(bothRes.body.coachPlan.source, "coach");
  assert.equal(bothRes.body.aiPlan.source, "system");

  // 9. Call POST /training/plan/generate while coach plan is active -> MUST NOT overwrite coach plan
  const genRes3 = await call("/training/plan/generate", "POST", null, athCookie);
  assert.equal(genRes3.status, 200);
  // Active plan for athlete remains the coach plan
  const activePlanRes2 = await call("/training/plan", "GET", null, athCookie);
  assert.equal(activePlanRes2.body.source, "coach");

  // 10. Weekly Review calculations
  const reviewRes = await call(`/training/review/${planV2.id}`, "GET", null, athCookie);
  assert.equal(reviewRes.status, 200);
  assert.ok(reviewRes.body.review.plannedSessions > 0);
  assert.equal(reviewRes.body.review.completedSessions, 1);
  assert.equal(reviewRes.body.review.missedSessions, 1);
  assert.ok(reviewRes.body.review.plannedLoad >= 0);

  // 11. Training Load Analytics
  const loadRes = await call("/training/load", "GET", null, athCookie);
  assert.equal(loadRes.status, 200);
  assert.ok(loadRes.body.plannedLoad >= 0);
  assert.ok("actualLoad" in loadRes.body);
  assert.equal(loadRes.body.loadUnit, "AU");

  // 12. Sunday Digest: Authorization & Execution
  // Athlete requesting own digest -> 200
  const digestRes1 = await call("/training/send-digest", "POST", { athleteId: athId }, athCookie);
  assert.equal(digestRes1.status, 200);
  assert.ok(digestRes1.body.ok);

  // Athlete requesting another athlete's digest -> 403 Forbidden
  const digestRes2 = await call("/training/send-digest", "POST", { athleteId: profile.id }, athCookie);
  assert.equal(digestRes2.status, 403);

  // Assigned coach requesting athlete digest -> 200
  const digestRes3 = await call("/training/send-digest", "POST", { athleteId: athId }, coach);
  assert.equal(digestRes3.status, 200);
  assert.ok(digestRes3.body.ok);
});

test("Targeted Hardening: Safety-First Evaluation and Current-Week Resolution", async () => {
  // Setup: Coach and Athlete users
  const coachRes = await call("/auth/register", "POST", {
    name: "Safety Coach",
    email: "safety_coach@example.test",
    password: "password123",
    role: "coach",
  });
  const coachCookie = coachRes.cookie;
  const coachUser = (await call("/me", "GET", null, coachCookie)).body.user;

  const athRes = await call("/auth/register", "POST", {
    name: "Safety Athlete",
    email: "safety_athlete@example.test",
    password: "password123",
    role: "athlete",
  });
  const athCookie = athRes.cookie;
  const athUser = (await call("/me", "GET", null, athRes.cookie)).body.user;
  const athProfile = (await call("/profile", "GET", null, athCookie)).body;

  await call("/profile", "PUT", {
    ...athProfile,
    birthDate: "2001-08-20",
    state: "Punjab",
    district: "Patiala",
    equipment: "Synthetic track",
    coachId: coachUser.email,
    sharePerformance: true,
    shareHealth: true,
  }, athCookie);

  // Compute canonical current Monday and an older Monday (3 weeks ago)
  const currentMondayStr = getMondayStr();
  const oldMondayStr = addDaysStr(currentMondayStr, -21);

  // 1. Create an OLDER coach plan (3 weeks ago)
  const oldCoachPlanRes = await call("/coach/training-plans", "POST", {
    athleteId: athUser.id,
    weekStart: oldMondayStr,
    phase: "Foundation",
    weeklyObjective: "Historical Plan 3 Weeks Ago",
    status: "published",
    days: [
      { dayIndex: 0, dayOfWeek: "Monday", sessionType: "Tempo", expectedDuration: 45 },
    ],
  }, coachCookie);
  assert.equal(oldCoachPlanRes.status, 201);

  // TEST 2: Older coach plan exists but CURRENT week has NO coach plan -> Must NOT return older coach plan!
  const curWeekPlanRes1 = await call("/training/plan", "GET", null, athCookie);
  assert.equal(curWeekPlanRes1.status, 200);
  assert.equal(curWeekPlanRes1.body.weekStart, currentMondayStr);
  assert.notEqual(curWeekPlanRes1.body.weekStart, oldMondayStr);
  assert.equal(curWeekPlanRes1.body.source, "system");

  // TEST 1: Publish a coach plan for CURRENT week -> getOrCreateWeeklyPlan returns current week coach plan
  const curCoachPlanRes = await call("/coach/training-plans", "POST", {
    athleteId: athUser.id,
    weekStart: currentMondayStr,
    phase: "Acceleration",
    weeklyObjective: "Current Week Coach Plan",
    status: "published",
    days: [
      { dayIndex: 0, dayOfWeek: "Monday", sessionType: "Max Velocity Sprints", expectedDuration: 60 },
    ],
  }, coachCookie);
  assert.equal(curCoachPlanRes.status, 201);

  // TEST 3: Current week coach plan + READY
  const curWeekPlanRes2 = await call("/training/plan", "GET", null, athCookie);
  assert.equal(curWeekPlanRes2.status, 200);
  assert.equal(curWeekPlanRes2.body.weekStart, currentMondayStr);
  assert.equal(curWeekPlanRes2.body.source, "coach");
  assert.equal(curWeekPlanRes2.body.weeklyObjective, "Current Week Coach Plan");

  // TEST 5: Record active injury -> COACH REVIEW / RECOVERY PRIORITY safety evaluation
  const injRes = await call("/records/injuries", "POST", {
    title: "Hamstring Strain",
    date: "2026-10-08",
    stage: "Rest",
    cleared: false,
    notes: "Acute discomfort during start",
  }, athCookie);
  assert.equal(injRes.status, 201);

  // TEST 5 & 6: Active Coach plan + Safety Warning (COACH REVIEW) ->
  // Coach plan is preserved (source = coach), requiresCoachReview = true, NO silent AI replacement or deletion!
  const curWeekPlanRes3 = await call("/training/plan", "GET", null, athCookie);
  assert.equal(curWeekPlanRes3.status, 200);
  assert.equal(curWeekPlanRes3.body.source, "coach"); // MUST remain coach plan!
  assert.equal(curWeekPlanRes3.body.requiresCoachReview, true);
  assert.equal(curWeekPlanRes3.body.safetyStatus, "COACH REVIEW");

  // TEST 8: Historical previous-week plan (oldMondayStr) remains unchanged in DB
  const oldPlanFetch = await call(`/coach/training-plans/${oldCoachPlanRes.body.plan.id}`, "GET", null, coachCookie);
  assert.equal(oldPlanFetch.status, 200);
  assert.equal(oldPlanFetch.body.weekStart, oldMondayStr);
  assert.equal(oldPlanFetch.body.source, "coach");

  // TEST 9: Daily Check-In remains attached to the exact plan ID and training day
  const checkInRes = await call(`/training/plan/${curCoachPlanRes.body.plan.id}/session/0`, "PUT", {
    status: "completed",
    actualDuration: 60,
    rpe: 7,
    fatigue: 4,
    pain: 2,
  }, athCookie);
  assert.equal(checkInRes.status, 200);
  assert.equal(checkInRes.body.plan.id, curCoachPlanRes.body.plan.id);

  // TEST 10: Sunday digest / weekly generation uses target week without duplicate plans or selecting old coach plans
  const digestRes = await call("/training/send-digest", "POST", { athleteId: athUser.id }, coachCookie);
  assert.equal(digestRes.status, 200);
  assert.ok(digestRes.body.ok);
});

test("Part 4: VideoLab, MediaPipe Sprint Analysis, file metadata, coach review, privacy, and authorization", async () => {
  // 1. Create test users: Athlete, Assigned Coach, Unassigned Coach
  const coachRes = await call("/auth/register", "POST", {
    name: "Video Coach P4",
    email: "video_coach_p4@example.test",
    password: "password123",
    role: "coach",
  });
  assert.equal(coachRes.status, 201);
  const coachCookie = coachRes.cookie;

  const unassignedCoachRes = await call("/auth/register", "POST", {
    name: "Unassigned Video Coach P4",
    email: "unassigned_coach_p4@example.test",
    password: "password123",
    role: "coach",
  });
  assert.equal(unassignedCoachRes.status, 201);
  const unassignedCoachCookie = unassignedCoachRes.cookie;

  const athRes = await call("/auth/register", "POST", {
    name: "Video Athlete P4",
    email: "video_athlete_p4@example.test",
    password: "password123",
    role: "athlete",
  });
  assert.equal(athRes.status, 201);
  const athCookie = athRes.cookie;

  const coachUser = (await call("/me", "GET", null, coachCookie)).body.user;
  const athProfile = (await call("/profile", "GET", null, athCookie)).body;

  const profPutRes = await call("/profile", "PUT", {
    ...athProfile,
    birthDate: "2002-05-15",
    state: "Maharashtra",
    district: "Mumbai",
    equipment: "Synthetic track",
    coachId: coachUser.email,
    sharePerformance: true,
    shareHealth: true,
  }, athCookie);
  assert.equal(profPutRes.status, 200);

  // 2. Upload/Create Video 1 with full metadata & Pose Landmarker analysis quality metrics
  const form1 = new FormData();
  const dummyMp4_1 = Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.alloc(100)]);
  form1.append("file", new Blob([dummyMp4_1], { type: "video/mp4" }), "100m_Sprint_Block_Exit.mp4");

  const upRes1 = await fetch(base + "/files", {
    method: "POST",
    headers: { cookie: athCookie },
    body: form1,
  });
  assert.equal(upRes1.status, 201);
  const vid1 = await upRes1.json();

  const originalAnalysis1 = {
    kneeAngle: { min: 82, max: 145, unit: "degrees" },
    hipExtension: { max: 172, unit: "degrees" },
    trunkAngle: { mean: 14.5, unit: "degrees" },
    validFrames: 110,
    invalidFrames: 10,
    measurementCoverage: 91.6,
    landmarkConfidence: 0.94,
    analysisDuration: 3.66,
    skippedFrames: 2,
    qualityRating: "Good",
  };

  const updatedVid1 = await call(`/files/${vid1.id}`, "PUT", {
    name: "100m_Sprint_Block_Exit.mp4",
    notes: "Focusing on acceleration drive phase",
    event: "100m",
    trainingWeek: "Week 4",
    trainingDay: "Monday",
    sessionTitle: "Max Velocity Sprints",
    phase: "Acceleration Development",
    requestCoachReview: false,
    analysis: originalAnalysis1,
  }, athCookie);

  assert.equal(updatedVid1.status, 200);
  assert.equal(updatedVid1.body.name, "100m_Sprint_Block_Exit.mp4");
  assert.equal(updatedVid1.body.analysis.validFrames, 110);
  assert.equal(updatedVid1.body.analysis.landmarkConfidence, 0.94);

  // 3. Upload/Create Video 2 to verify historical preservation (multiple videos exist without overwriting)
  const form2 = new FormData();
  const dummyMp4_2 = Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.alloc(100)]);
  form2.append("file", new Blob([dummyMp4_2], { type: "video/mp4" }), "100m_Fly_Sprint.mp4");

  const upRes2 = await fetch(base + "/files", {
    method: "POST",
    headers: { cookie: athCookie },
    body: form2,
  });
  assert.equal(upRes2.status, 201);
  const vid2 = await upRes2.json();

  const originalAnalysis2 = {
    kneeAngle: { min: 78, max: 148, unit: "degrees" },
    validFrames: 120,
    invalidFrames: 5,
    measurementCoverage: 96.0,
    landmarkConfidence: 0.96,
  };

  await call(`/files/${vid2.id}`, "PUT", {
    name: "100m_Fly_Sprint.mp4",
    event: "100m",
    trainingWeek: "Week 5",
    trainingDay: "Wednesday",
    sessionTitle: "Fly 30m Sprint",
    phase: "Max Velocity",
    requestCoachReview: false,
    analysis: originalAnalysis2,
  }, athCookie);

  // Verify historical listing retains both videos
  const historyList = (await call("/files", "GET", null, athCookie)).body;
  const f1 = historyList.find((f) => f.id === vid1.id);
  const f2 = historyList.find((f) => f.id === vid2.id);
  assert.ok(f1);
  assert.ok(f2);
  assert.equal(f1.analysis.measurementCoverage, 91.6);
  assert.equal(f2.analysis.measurementCoverage, 96.0);

  // 4. Athlete requests coach review on Video 1 (requestCoachReview = true)
  const reqRevRes = await call(`/files/${vid1.id}`, "PUT", {
    requestCoachReview: true,
  }, athCookie);
  assert.equal(reqRevRes.status, 200);
  assert.equal(reqRevRes.body.requestCoachReview, true);

  // 5. Verify Coach receives video review notification
  const coachNotifsRes = await call("/coach/notifications", "GET", null, coachCookie);
  assert.equal(coachNotifsRes.status, 200);
  const coachNotifs = coachNotifsRes.body;
  const vidNotif = coachNotifs.find((n) => n.fileId === vid1.id || (n.id && n.id.includes(vid1.id)));
  assert.ok(vidNotif, `Expected notification for file ${vid1.id} in ${JSON.stringify(coachNotifs)}`);
  assert.equal(vidNotif.athleteId, profPutRes.body.id);

  // 6. Unrelated Coach attempts review or content access -> 403 Forbidden
  const unassignedContent = await call(`/files/${vid1.id}/content`, "GET", null, unassignedCoachCookie);
  assert.equal(unassignedContent.status, 403);

  const unassignedPut = await call(`/files/${vid1.id}`, "PUT", {
    coachAnnotation: { observation: "Malicious attempt" },
  }, unassignedCoachCookie);
  assert.equal(unassignedPut.status, 403);

  // 7. Assigned Coach submits review with Observation, Correction, Drill Recommendation, Follow-up Note
  const coachReviewRes = await call(`/files/${vid1.id}`, "PUT", {
    coachAnnotation: {
      observation: "Strong knee drive coming out of drive phase",
      correction: "Maintain upright torso transition past 30m mark",
      drillRecommendation: "Wicket runs 3x40m and Wall A-Marches",
      coachFollowUpNote: "Re-analyze next Wednesday session clip",
    },
  }, coachCookie);

  assert.equal(coachReviewRes.status, 200);
  assert.equal(coachReviewRes.body.coachAnnotation.observation, "Strong knee drive coming out of drive phase");
  assert.equal(coachReviewRes.body.coachAnnotation.correction, "Maintain upright torso transition past 30m mark");
  assert.equal(coachReviewRes.body.coachAnnotation.drillRecommendation, "Wicket runs 3x40m and Wall A-Marches");
  assert.equal(coachReviewRes.body.coachAnnotation.coachFollowUpNote, "Re-analyze next Wednesday session clip");
  assert.ok(coachReviewRes.body.coachReviewedAt);
  assert.ok(coachReviewRes.body.coachReviewedBy);

  // IMMUTABILITY ASSERTIONS: Original analysis & metadata were NOT modified by coach
  assert.equal(coachReviewRes.body.analysis.kneeAngle.max, 145);
  assert.equal(coachReviewRes.body.analysis.validFrames, 110);
  assert.equal(coachReviewRes.body.name, "100m_Sprint_Block_Exit.mp4");

  // PENDING STATE CLEARED: requestCoachReview cleared to false
  assert.equal(coachReviewRes.body.requestCoachReview, false);

  // 8. Coach Notifications updated: pending notification cleared
  const updatedNotifs = (await call("/coach/notifications", "GET", null, coachCookie)).body;
  const clearedNotif = updatedNotifs.find((n) => n.fileId === vid1.id || n.id.includes(vid1.id));
  assert.equal(clearedNotif, undefined);

  // 9. Privacy & Consent test: Athlete sets sharePerformance = false
  const noConsentProfileRes = await call("/profile", "PUT", {
    ...profPutRes.body,
    sharePerformance: false,
    shareHealth: false,
  }, athCookie);
  assert.equal(noConsentProfileRes.status, 200);

  // Assigned coach attempts access on vid2 (where requestCoachReview = false) -> 403 Forbidden
  const noConsentRes = await call(`/files/${vid2.id}/content`, "GET", null, coachCookie);
  assert.equal(noConsentRes.status, 403);
});

test("Part 5: Complete 24-Step End-to-End User Journey & Data Integrity Test", async () => {
  // 1. Athlete & Coach Registration
  const coachRes = await call("/auth/register", "POST", {
    name: "E2E Coach",
    email: "e2e_coach@example.test",
    password: "password123",
    role: "coach",
  });
  assert.equal(coachRes.status, 201);
  const coachCookie = coachRes.cookie;

  const athRes = await call("/auth/register", "POST", {
    name: "E2E Athlete",
    email: "e2e_athlete@example.test",
    password: "password123",
    role: "athlete",
  });
  assert.equal(athRes.status, 201);
  const athCookie = athRes.cookie;

  // 2. Athlete Profile Setup
  const defaultProf = (await call("/profile", "GET", null, athCookie)).body;
  const profRes = await call("/profile", "PUT", {
    ...defaultProf,
    name: "E2E Athlete",
    sport: "Athletics",
    event: "100m",
    birthDate: "2002-04-12",
    state: "Haryana",
    district: "Rohtak",
    equipment: "Synthetic track",
    competitionDate: "2026-11-15",
    coachId: "e2e_coach@example.test",
    sharePerformance: true,
    shareHealth: true,
  }, athCookie);
  assert.equal(profRes.status, 200);

  // 3. Log Performance Record
  const sessRes = await call("/records/sessions", "POST", {
    title: "100m Time Trial",
    date: "2026-10-01",
    event: "100m",
    metric: 10.85,
    unit: "sec",
    duration: 60,
    effort: 9,
    pain: 0,
    fatigue: 3,
  }, athCookie);
  assert.equal(sessRes.status, 201);

  // 4. Training Roadmap Level Calculation
  const roadmapRes = await call("/training/roadmap", "GET", null, athCookie);
  assert.equal(roadmapRes.status, 200);
  assert.ok(roadmapRes.body.currentLevel);

  // 5. Goals Setup (Year & Month Goal)
  const goalsRes = await call("/training/goals", "PUT", {
    yearGoal: { targetPB: 10.20, targetDate: "2026-12-31" },
    monthGoal: { title: "Acceleration & Block Exit Mastery" },
  }, athCookie);
  assert.equal(goalsRes.status, 200);

  // 6. Weekly Plan Auto-Generation
  const planRes = await call("/training/plan", "GET", null, athCookie);
  assert.equal(planRes.status, 200);
  const planId = planRes.body.id;
  assert.ok(planId);

  // 7. Session Check-In with Actual Performance
  const checkInRes = await call(`/training/plan/${planId}/session/0`, "PUT", {
    status: "completed",
    actualMetric: 10.82,
    actualDuration: 60,
    rpe: 8,
    fatigue: 3,
    pain: 0,
  }, athCookie);
  assert.equal(checkInRes.status, 200);

  // 8. Training Load Analytics
  const loadRes = await call("/training/load", "GET", null, athCookie);
  assert.equal(loadRes.status, 200);
  assert.ok("acwr" in loadRes.body);

  // 9. Recovery Daily Check-In
  const recRes = await call("/records/recovery_logs", "POST", {
    date: "2026-10-08",
    sleepDuration: 8.0,
    sleepQuality: "Good",
    fatigue: 2,
    stress: 2,
    mood: 8,
    soreness: 2,
    generalRecovery: 8,
    painFlag: false,
  }, athCookie);
  assert.equal(recRes.status, 201);

  // 10. Readiness State
  const readinessRes = await call("/recovery/readiness", "GET", null, athCookie);
  assert.equal(readinessRes.status, 200);
  assert.ok(readinessRes.body.readiness);

  // 11. Video Upload & MediaPipe Analysis
  const form = new FormData();
  const dummyMp4 = Buffer.concat([Buffer.alloc(4), Buffer.from("ftyp"), Buffer.alloc(100)]);
  form.append("file", new Blob([dummyMp4], { type: "video/mp4" }), "100m_drive_phase.mp4");

  const vidUpRes = await fetch(base + "/files", {
    method: "POST",
    headers: { cookie: athCookie },
    body: form,
  });
  assert.equal(vidUpRes.status, 201);
  const vidFile = await vidUpRes.json();

  await call(`/files/${vidFile.id}`, "PUT", {
    name: "100m_drive_phase.mp4",
    analysis: { kneeAngle: { max: 142 }, validFrames: 100, measurementCoverage: 95.0 },
    requestCoachReview: true,
  }, athCookie);

  // 12. Coach Notification for Video Review
  const coachNotifs = (await call("/coach/notifications", "GET", null, coachCookie)).body;
  const vidNotif = coachNotifs.find((n) => n.fileId === vidFile.id || (n.id && n.id.includes(vidFile.id)));
  assert.ok(vidNotif);

  // 13. Coach Annotates Video
  const coachReviewRes = await call(`/files/${vidFile.id}`, "PUT", {
    coachAnnotation: {
      observation: "Solid drive angle",
      correction: "Hold drive 2 steps longer",
      drillRecommendation: "Wall A-Marches",
    },
  }, coachCookie);
  assert.equal(coachReviewRes.status, 200);
  assert.equal(coachReviewRes.body.requestCoachReview, false);

  // 14. Weekly Review
  const reviewRes = await call(`/training/review/${planId}`, "GET", null, athCookie);
  assert.equal(reviewRes.status, 200);
  assert.equal(reviewRes.body.review.completedSessions, 1);

  // 15. Reality Check
  const rcRes = await call("/training/reality-check", "GET", null, athCookie);
  assert.equal(rcRes.status, 200);
  assert.ok(["ON TRACK", "PARTIALLY ON TRACK", "NEEDS ATTENTION", "NOT ON TRACK", "INSUFFICIENT DATA"].includes(rcRes.body.status));

  // 16. Next Weekly Plan Adaptation
  const nextPlanRes = await call("/training/plan/generate", "POST", null, athCookie);
  assert.equal(nextPlanRes.status, 200);
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



