import { Router } from "express";
import { TrainingEngine } from "../services/trainingEngine.js";
import { EXERCISE_LIBRARY, SPRINT_QUALITIES } from "../services/trainingKnowledge.js";
import { allRecords } from "./records.js";

export function trainingRoutes(db) {
  const r = Router();
  const engine = new TrainingEngine(db);

  // Exercise Library
  r.get("/library", (_req, res) => {
    res.json({
      qualities: SPRINT_QUALITIES,
      exercises: EXERCISE_LIBRARY,
    });
  });

  // Athlete Roadmap (Sprint Journey Levels 1 to 6)
  r.get("/roadmap", async (req, res) => {
    const athlete = (await db.get("profiles", req.user.id)) || {};
    const sessions = await db.list("sessions", { ownerId: req.user.id });
    const plans = await db.list("plans", { athleteId: req.user.id });
    const injuries = await db.list("injuries", { ownerId: req.user.id });

    const roadmap = engine.calculateRoadmap(athlete, sessions, plans, injuries);
    res.json(roadmap);
  });

  // Athlete Goals (Year Goal & Month Goal)
  r.get("/goals", async (req, res) => {
    const athlete = (await db.get("profiles", req.user.id)) || {};
    const sessions = await db.list("sessions", { ownerId: req.user.id });
    const profile = engine.getAthleteTrainingProfile(athlete, sessions);
    const goals = await engine.getGoals(req.user.id, profile, sessions);
    res.json(goals);
  });

  r.put("/goals", async (req, res) => {
    const goals = {
      ...req.body,
      id: req.user.id,
      ownerId: req.user.id,
      updatedAt: new Date().toISOString(),
    };
    await db.put("training_goals", goals);
    res.json({ goals });
  });

  // Active / Current Weekly Plan (supports ?source=coach or ?source=ai)
  r.get("/plan", async (req, res) => {
    const athlete = (await db.get("profiles", req.user.id)) || {};

    if (req.query.source === "coach") {
      const allPlans = (await db.list("plans", { athleteId: req.user.id })) || [];
      const coachPlans = allPlans
        .filter((p) => p.source === "coach" && p.status !== "draft")
        .sort((a, b) => (b.weekStart || "").localeCompare(a.weekStart || ""));
      const matched = req.query.weekStart
        ? coachPlans.find((p) => p.weekStart === req.query.weekStart)
        : coachPlans[0] || null;
      return res.json(matched || null);
    }

    if (req.query.source === "ai" || req.query.source === "system") {
      const now = new Date();
      const monday = req.query.weekStart ? new Date(req.query.weekStart) : engine.getMondayOfWeek(now);
      const weekStartStr = monday.toISOString().slice(0, 10);
      const aiPlanId = `plan-ai-${req.user.id}-${weekStartStr}`;
      let aiPlan = await db.get("plans", aiPlanId);
      if (!aiPlan) {
        const legacyPlan = await db.get("plans", `plan-${req.user.id}-${weekStartStr}`);
        if (legacyPlan && (legacyPlan.source === "system" || !legacyPlan.source)) {
          aiPlan = legacyPlan;
        }
      }
      if (!aiPlan) {
        const sessions = await db.list("sessions", { ownerId: req.user.id });
        const injuries = await db.list("injuries", { ownerId: req.user.id });
        const profile = engine.getAthleteTrainingProfile(athlete, sessions, injuries);

        aiPlan = engine.generateAdaptiveWeeklyPlan({
          athlete,
          profile,
          weekStart: weekStartStr,
          monday,
          previousPlan: null,
          sessions,
        });
        aiPlan.id = aiPlanId;
        aiPlan.source = "system";
        await db.put("plans", aiPlan);
      }
      return res.json(aiPlan);
    }

    const plan = await engine.getOrCreateWeeklyPlan({
      athlete,
      weekStartDate: req.query.weekStart || null,
      publishedOnly: true,
    });
    res.json(plan);
  });

  // Get Both AI & Coach Weekly Plans
  r.get("/plan/both", async (req, res) => {
    const athlete = (await db.get("profiles", req.user.id)) || {};
    const now = new Date();
    const monday = req.query.weekStart ? new Date(req.query.weekStart) : engine.getMondayOfWeek(now);
    const weekStartStr = monday.toISOString().slice(0, 10);

    // 1. Coach Plan (published only)
    const allPlans = (await db.list("plans", { athleteId: req.user.id })) || [];
    const coachPlans = allPlans
      .filter((p) => p.source === "coach" && p.status !== "draft")
      .sort((a, b) => (b.weekStart || "").localeCompare(a.weekStart || ""));
    const matchedCoachPlan = req.query.weekStart
      ? coachPlans.find((p) => p.weekStart === req.query.weekStart)
      : coachPlans[0] || null;

    // 2. AI Plan
    const aiPlanId = `plan-ai-${req.user.id}-${weekStartStr}`;
    let aiPlan = await db.get("plans", aiPlanId);
    if (!aiPlan) {
      const legacyPlan = await db.get("plans", `plan-${req.user.id}-${weekStartStr}`);
      if (legacyPlan && (legacyPlan.source === "system" || !legacyPlan.source)) {
        aiPlan = legacyPlan;
      }
    }
    if (!aiPlan) {
      const sessions = await db.list("sessions", { ownerId: req.user.id });
      const injuries = await db.list("injuries", { ownerId: req.user.id });
      const profile = engine.getAthleteTrainingProfile(athlete, sessions, injuries);

      aiPlan = engine.generateAdaptiveWeeklyPlan({
        athlete,
        profile,
        weekStart: weekStartStr,
        monday,
        previousPlan: null,
        sessions,
      });
      aiPlan.id = aiPlanId;
      aiPlan.source = "system";
      await db.put("plans", aiPlan);
    }

    res.json({
      aiPlan,
      coachPlan: matchedCoachPlan,
      hasCoachPlan: !!matchedCoachPlan,
    });
  });

  // Generate / Regenerate Adaptive Weekly Plan
  r.post("/plan/generate", async (req, res) => {
    const athlete = (await db.get("profiles", req.user.id)) || {};
    const sessions = await db.list("sessions", { ownerId: req.user.id });
    const injuries = await db.list("injuries", { ownerId: req.user.id });
    const profile = engine.getAthleteTrainingProfile(athlete, sessions, injuries);

    const now = new Date();
    const monday = engine.getMondayOfWeek(now);
    const weekStartStr = monday.toISOString().slice(0, 10);

    const plan = engine.generateAdaptiveWeeklyPlan({
      athlete,
      profile,
      weekStart: weekStartStr,
      monday,
      previousPlan: null,
      sessions,
    });

    await db.put("plans", plan);
    res.json(plan);
  });

  // Athlete Daily Session Check-In
  r.put("/plan/:planId/session/:dayIndex", async (req, res) => {
    try {
      const updatedPlan = await engine.checkInDailySession({
        planId: req.params.planId,
        dayIndex: req.params.dayIndex,
        checkinData: req.body,
        athleteId: req.user.id,
      });
      res.json({ ok: true, plan: updatedPlan, ...updatedPlan });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Sunday Weekly Review
  r.get("/review/:planId", async (req, res) => {
    try {
      const review = await engine.generateWeeklyReview(req.params.planId, req.user.id);
      res.json({ ok: true, review, ...review });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // Reality Check Dashboard
  r.get("/reality-check", async (req, res) => {
    const athlete = (await db.get("profiles", req.user.id)) || {};
    const sessions = await db.list("sessions", { ownerId: req.user.id });
    const reality = await engine.generateRealityCheck(athlete, sessions);
    res.json(reality);
  });

  return r;
}
