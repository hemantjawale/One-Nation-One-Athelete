import { Router } from "express";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { profileSchema } from "../services/schemas.js";
import { normalizeProfile } from "../services/sports.js";
import { insights, plan, calculateRecoveryReadiness, getConsolidatedAthleteContext } from "../services/intelligence.js";
import { benchmarks, fairness } from "../services/research.js";
import { BenchmarkService } from "../services/benchmarkService.js";
import { safeUser, cookieOptions } from "../middleware/auth.js";
import { allRecords, audit } from "./records.js";
export function athleteRoutes(db, uploads) {
  const r = Router();
  const benchmarkService = new BenchmarkService(db);
  const defaultProfile = (u) =>
    normalizeProfile({
      name: u.name,
      sport: "Athletics",
      event: "100m",
      unit: "sec",
      state: "",
      district: "",
      birthDate: "",
      gender: "Prefer not to say",
      classification: "Open",
      equipment: "Open ground",
      target: 12,
      goal: "",
      education: "",
      competitionDate: "",
      coachId: "",
      sharePerformance: false,
      shareHealth: false,
      allowAnalytics: false,
    });
  r.get("/me", (req, res) =>
    res.json({ user: safeUser(req.user), storage: db.mode }),
  );
  r.get("/profile", async (req, res) => {
    const raw =
      (await db.get("profiles", req.user.id)) || defaultProfile(req.user);
    res.json(normalizeProfile(raw));
  });
  r.put("/profile", async (req, res) => {
    const oldProfile = await db.get("profiles", req.user.id);
    const normalized = normalizeProfile(req.body);
    const p = profileSchema.parse(normalized);

    // Enforce that athlete cannot change sport once sport has been selected and locked
    if (oldProfile?.sportLocked && p.sport && p.sport !== oldProfile.sport) {
      return res.status(400).json({
        error: "Your sport has been permanently locked and cannot be changed.",
      });
    }

    if (oldProfile?.sportLocked) {
      p.sport = oldProfile.sport;
      p.sportLocked = true;
    } else if (req.body.sportLocked || p.sportLocked) {
      p.sportLocked = true;
    }

    if (p.coachId) {
      let coach = await db.get("users", p.coachId.toLowerCase());
      if (!coach) {
        const users = await db.list("users");
        coach = users.find(
          (u) =>
            u.id === p.coachId ||
            (u.email && u.email.toLowerCase() === p.coachId.toLowerCase()),
        );
      }
      if (!coach || !["coach", "medical"].includes(coach.role))
        return res
          .status(400)
          .json({
            error: "Use the email of a registered coach or medical account.",
          });
      p.coachId = coach.id;
    }
    const row = await db.put("profiles", {
      ...p,
      id: req.user.id,
      ownerId: req.user.id,
    });

    // Invalidate benchmark comparison cache if comparison-relevant fields changed
    const relevantChanged =
      !oldProfile ||
      oldProfile.sport !== row.sport ||
      oldProfile.event !== row.event ||
      oldProfile.birthDate !== row.birthDate ||
      oldProfile.gender !== row.gender ||
      oldProfile.state !== row.state ||
      oldProfile.district !== row.district ||
      oldProfile.classification !== row.classification ||
      oldProfile.sportProfile?.weightCategory !== row.sportProfile?.weightCategory ||
      oldProfile.sportProfile?.discipline !== row.sportProfile?.discipline ||
      oldProfile.sportProfile?.format !== row.sportProfile?.format;

    if (relevantChanged) {
      benchmarkService.invalidateCache();
    }

    await audit(db, req.user, "Profile and consent updated", "profile");
    res.json(row);
  });
  r.get("/insights", async (req, res) => {
    const p = (await db.get("profiles", req.user.id)) || {},
      s = insights(p, await allRecords(db, req.user.id));
    res.json({ ...s, plan: plan(p, s) });
  });

  r.get("/context", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    const targetId = req.query.athleteId || req.user.id;
    const context = await getConsolidatedAthleteContext(db, targetId, req.user);
    if (context.error) {
      return res.status(context.status || 403).json({ error: context.error });
    }
    res.json(context);
  });

  r.get("/recovery/readiness", async (req, res) => {
    const records = await allRecords(db, req.user.id);
    const recoveryLogs = await db.list("recovery_logs", { ownerId: req.user.id });
    const readiness = calculateRecoveryReadiness(records, recoveryLogs);
    res.json(readiness);
  });

  // Automatic Sport-Aware Performance Comparison Endpoint
  r.get("/performance/compare", async (req, res) => {
    const raw = (await db.get("profiles", req.user.id)) || defaultProfile(req.user);
    const profile = normalizeProfile(raw);
    const sessions = await db.list("sessions", { ownerId: req.user.id });
    const comparison = await benchmarkService.getComparison(profile, sessions);
    res.json(comparison);
  });

  // Admin Benchmark Bulk Import Endpoint (Admin ONLY)
  r.post("/benchmarks/import", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Forbidden. Admin access required." });
    }
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ error: "Invalid payload. Request body must be an array or { records: [] }." });
    }
    const records = Array.isArray(req.body)
      ? req.body
      : (Array.isArray(req.body?.records) ? req.body.records : null);

    if (!records) {
      return res.status(400).json({ error: "Invalid payload. 'records' must be an array." });
    }

    const result = await benchmarkService.importRecords(records);
    res.status(201).json(result);
  });

  // Official AFI National Records (Extracted directly from public/records/National/*.pdf)
  r.get("/benchmarks/national-records", (_req, res) => {
    res.json(benchmarkService.getNationalRecordsCatalog());
  });

  r.get("/benchmarks", async (req, res) =>
    res.json(
      await benchmarks(
        db,
        (await db.get("profiles", req.user.id)) || {},
        req.user.id,
      ),
    ),
  );
  r.get("/fairness", async (_req, res) => res.json(await fairness(db)));
  r.get("/audit", async (req, res) =>
    res.json(await db.list("audit", { ownerId: req.user.id })),
  );
  r.get("/export", async (req, res) =>
    res.json({
      user: safeUser(req.user),
      profile: await db.get("profiles", req.user.id),
      records: await allRecords(db, req.user.id),
      files: await db.list("files", { ownerId: req.user.id }),
      applications: await db.list("applications", { ownerId: req.user.id }),
    }),
  );
  r.get("/coach", async (req, res) => {
    if (!["coach", "medical"].includes(req.user.role))
      return res.sendStatus(403);
    const out = [];
    for (const p of await db.list("profiles", { coachId: req.user.id })) {
      const rows = await allRecords(db, p.id),
        performance = p.sharePerformance && req.user.role === "coach";
      out.push({
        profile: {
          id: p.id,
          name: p.name,
          sport: p.sport,
          event: p.event,
          unit: p.unit,
          shareHealth: p.shareHealth,
          sharePerformance: p.sharePerformance,
          competitionDate: performance ? p.competitionDate : null,
        },
        sessions: performance
          ? rows
              .filter((r) => r.kind === "sessions")
              .map(({ pain: _p, fatigue: _f, notes: _n, ...r }) => r)
          : [],
        achievements: performance
          ? rows.filter((r) => r.kind === "achievements")
          : [],
        injuries: p.shareHealth
          ? rows.filter((r) => r.kind === "injuries")
          : [],
        wellbeing: p.shareHealth
          ? rows
              .filter((r) => r.kind === "sessions")
              .map((r) => ({ date: r.date, pain: r.pain, fatigue: r.fatigue }))
          : [],
        plans: performance
          ? rows
              .filter((r) => r.kind === "plans")
              .map((r) => ({
                title: r.title,
                completed: r.days.filter((d) => d.done).length,
                total: r.days.length,
              }))
          : [],
      });
    }
    res.json(out);
  });
  r.post("/verify/:kind/:id", async (req, res) => {
    if (
      req.user.role !== "coach" ||
      !["achievements", "sessions"].includes(req.params.kind)
    )
      return res.sendStatus(403);
    const row = await db.get(req.params.kind, req.params.id),
      p = row && (await db.get("profiles", row.ownerId));
    if (
      !p ||
      p.coachId !== req.user.id ||
      !p.sharePerformance ||
      row.ownerId === req.user.id
    )
      return res.sendStatus(403);
    const updated = await db.put(req.params.kind, {
      ...row,
      verified: true,
      verificationStatus: "Coach Verified",
      verifiedBy: req.user.name,
      verifiedAt: new Date().toISOString(),
    });
    await audit(db, req.user, "Verified " + req.params.kind, row.id);
    res.json(updated);
  });
  r.delete("/account", async (req, res) => {
    for (const kind of [
      "profiles",
      "sessions",
      "achievements",
      "injuries",
      "expenses",
      "plans",
      "applications",
      "files",
      "audit",
      "opportunities",
    ])
      for (const row of await db.list(kind, { ownerId: req.user.id })) {
        if (kind === "files")
          await unlink(path.join(uploads, row.id)).catch(() => {});
        if (kind === "opportunities")
          for (const a of await db.list("applications", {
            opportunityId: row.id,
          }))
            await db.remove("applications", a.id);
        await db.remove(kind, row.id);
      }
    await db.remove("users", req.user.id);
    res.clearCookie("onona", cookieOptions).json({ ok: true });
  });
  return r;
}
