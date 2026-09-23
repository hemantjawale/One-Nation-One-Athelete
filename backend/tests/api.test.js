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
test("record and account deletion revoke access", async () => {
  assert.equal(
    (await call("/records/sessions/" + session.id, "DELETE", null, athlete))
      .status,
    200,
  );
  assert.equal((await call("/account", "DELETE", null, athlete)).status, 200);
  assert.equal((await call("/me", "GET", null, athlete)).status, 401);
});
