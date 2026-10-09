import { Router } from "express";
import { TrainingEngine } from "../services/trainingEngine.js";
import { EXERCISE_LIBRARY, SPRINT_QUALITIES } from "../services/trainingKnowledge.js";
import { allRecords } from "./records.js";
import { sendWeeklyDigestEmail, isSmtpConfigured } from "../services/emailService.js";

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
    const rawProfile = (await db.get("profiles", req.user.id)) || {};
    const athlete = { id: req.user.id, ...rawProfile };

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
    const rawProfile = (await db.get("profiles", req.user.id)) || {};
    const athlete = { id: req.user.id, ...rawProfile };
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
    const rawProfile = (await db.get("profiles", req.user.id)) || {};
    const athlete = { id: req.user.id, ...rawProfile };
    const sessions = await db.list("sessions", { ownerId: req.user.id });
    const injuries = await db.list("injuries", { ownerId: req.user.id });
    const profile = engine.getAthleteTrainingProfile(athlete, sessions, injuries);

    const now = new Date();
    const monday = engine.getMondayOfWeek(now);
    const weekStartStr = monday.toISOString().slice(0, 10);

    // Look up existing plans for this week
    const allPlans = (await db.list("plans", { athleteId: req.user.id })) || [];
    const existingCoachPlan = allPlans.find(
      (p) => p.weekStart === weekStartStr && p.source === "coach" && p.status !== "draft",
    );
    const defaultPlanId = `plan-${req.user.id}-${weekStartStr}`;
    const aiPlanId = `plan-ai-${req.user.id}-${weekStartStr}`;
    const existingSystemPlan =
      (await db.get("plans", aiPlanId)) ||
      (await db.get("plans", defaultPlanId));

    const prevMonday = new Date(monday.getTime() - 7 * 86400000);
    const prevPlanId = `plan-${req.user.id}-${prevMonday.toISOString().slice(0, 10)}`;
    const previousPlan =
      (await db.get("plans", prevPlanId)) ||
      (await db.get("plans", `plan-ai-${req.user.id}-${prevMonday.toISOString().slice(0, 10)}`));

    const plan = engine.generateAdaptiveWeeklyPlan({
      athlete,
      profile,
      weekStart: weekStartStr,
      monday,
      previousPlan,
      sessions,
      existingPlan: existingSystemPlan?.source === "system" ? existingSystemPlan : null,
    });

    // If a coach plan is active for this week, do NOT overwrite it — store AI plan separately
    if (existingCoachPlan) {
      plan.id = aiPlanId;
      plan.source = "system";
      plan.coachPlanActive = true;
    } else {
      plan.id = defaultPlanId;
      plan.source = "system";
    }

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

  // Training Load Analytics
  r.get("/load", async (req, res) => {
    const loadStats = await engine.getTrainingLoadAnalytics(req.user.id);
    res.json(loadStats);
  });

  // Trigger / Send Sunday Digest Email (Sends upcoming 7-day training plan + last week performance review)
  r.post("/send-digest", async (req, res) => {
    try {
      const targetUserId = req.body?.athleteId || req.user.id;

      // Authorization Check
      if (req.user.role === "athlete" && targetUserId !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized. Athletes can only request their own digest." });
      }

      const athlete = (await db.get("profiles", targetUserId)) || {};
      if (req.user.role === "coach" || req.user.role === "medical") {
        const isAssigned =
          athlete.coachId &&
          (athlete.coachId === req.user.id ||
            athlete.coachId.toLowerCase() === req.user.email?.toLowerCase());
        if (!isAssigned && targetUserId !== req.user.id) {
          return res.status(403).json({ error: "Unauthorized. You are not the assigned coach for this athlete." });
        }
      }

      const userObj = (await db.get("users", targetUserId)) || (targetUserId === req.user.id ? req.user : null);
      const sessions = await db.list("sessions", { ownerId: targetUserId });

      // Fetch active weekly plan using getOrCreateWeeklyPlan (respecting object signature & coach plans)
      const plan = await engine.getOrCreateWeeklyPlan({
        athlete,
        publishedOnly: false,
      });

      // Fetch or generate last week's performance review
      let review = null;
      if (plan && plan.id) {
        try {
          review = await engine.generateWeeklyReview(plan.id, targetUserId);
        } catch (_e) {
          const activeDays = (plan.days || []).filter((d) => (d.expectedDuration || 0) > 0);
          const completedCount = activeDays.filter((d) => d.status === "completed").length;
          review = {
            weekStart: plan.weekStart,
            weekEnd: plan.weekEnd,
            plannedSessions: activeDays.length || 6,
            completedSessions: completedCount,
            adherencePercentage: activeDays.length > 0 ? Math.round((completedCount / activeDays.length) * 100) : 0,
            averageRPE: null,
            trend: "Consistent",
            recommendation: "Stay consistent with daily warmups, hydration, and neurological recovery.",
          };
        }
      }

      const toEmail = req.body?.email || userObj?.email || athlete.email;
      if (!toEmail) {
        return res.status(400).json({ error: "No target email address found for athlete." });
      }

      const result = await sendWeeklyDigestEmail({
        toEmail,
        athleteName: athlete.name || userObj?.name || "Athlete",
        review,
        plan,
        lastWeekSessions: sessions.slice(-7),
      });

      res.json({
        ok: true,
        emailSent: true,
        toEmail,
        mode: result.mode,
        isSmtpConfigured: isSmtpConfigured(),
        message: result.message || "Sunday digest sent successfully.",
      });
    } catch (err) {
      console.error("Error sending Sunday digest email:", err);
      res.status(500).json({ error: err.message || "Failed to send Sunday digest email." });
    }
  });

  return r;
}
