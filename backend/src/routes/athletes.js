import { Router } from "express";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { profileSchema } from "../services/schemas.js";
import { insights, plan } from "../services/intelligence.js";
import { benchmarks, fairness } from "../services/research.js";
import { safeUser, cookieOptions } from "../middleware/auth.js";
import { allRecords, audit } from "./records.js";
export function athleteRoutes(db, uploads) {
  const r = Router();
  const defaultProfile = (u) => ({
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
  r.get("/profile", async (req, res) =>
    res.json(
      (await db.get("profiles", req.user.id)) || defaultProfile(req.user),
    ),
  );
  r.put("/profile", async (req, res) => {
    const p = profileSchema.parse(req.body);
    if (p.coachId) {
      const coach = await db.get("users", p.coachId.toLowerCase());
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
    await audit(db, req.user, "Profile and consent updated", "profile");
    res.json(row);
  });
  r.get("/insights", async (req, res) => {
    const p = (await db.get("profiles", req.user.id)) || {},
      s = insights(p, await allRecords(db, req.user.id));
    res.json({ ...s, plan: plan(p, s) });
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
