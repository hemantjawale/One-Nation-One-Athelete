import { Router } from "express";
import { z } from "zod";
import { TrainingEngine } from "../services/trainingEngine.js";
import { BenchmarkService } from "../services/benchmarkService.js";
import { EXERCISE_LIBRARY, SPRINT_QUALITIES } from "../services/trainingKnowledge.js";
import { normalizeProfile, calculateAge } from "../services/sports.js";
import { text, num, date } from "../services/schemas.js";

const daySessionSchema = z.object({
  dayIndex: z.coerce.number().min(0).max(6).optional(),
  dayOfWeek: z.string().max(30),
  date: z.string().optional(),
  trainingDate: z.string().optional(),
  sessionType: z.string().max(100),
  objective: z.string().max(500).default("").optional(),
  expectedDuration: z.coerce.number().min(0).max(360).default(60).optional(),
  targetIntensity: z.union([z.coerce.number(), z.string()]).default(90).optional(),
  warmup: z.array(z.any()).default([]).optional(),
  exercises: z.array(z.any()).default([]).optional(),
  cooldown: z.array(z.any()).default([]).optional(),
  coachNotes: z.string().max(2000).default("").optional(),
  status: z.enum(["scheduled", "completed", "partially_completed", "missed"]).default("scheduled").optional(),
  athleteCompletion: z.any().optional(),
  completionScore: z.coerce.number().optional(),
  performanceScore: z.coerce.number().optional(),
});

const weeklyPlanSchema = z.object({
  athleteId: z.string().min(1),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid weekStart date"),
  weekEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid weekEnd date").optional(),
  phase: z.string().max(100).default("Acceleration Development").optional(),
  weeklyObjective: z.string().max(500).default("Acceleration & Start Mechanics").optional(),
  status: z.enum(["draft", "published", "completed", "active"]).default("published").optional(),
  days: z.array(daySessionSchema).min(1).max(7),
  changeReason: z.string().max(500).optional(),
});

const coachProfileSchema = z.object({
  name: z.string().trim().min(1).max(100),
  specialization: z.string().max(200).default("Sprint & Athletics"),
  sports: z.array(z.string()).default(["Athletics"]),
  events: z.array(z.string()).default(["100m", "200m"]),
  experienceYears: z.coerce.number().min(0).max(60).default(5),
  certifications: z
    .array(
      z.object({
        name: z.string().max(200),
        issuer: z.string().max(200).default(""),
        year: z.string().max(10).default(""),
        verificationStatus: z.enum(["Unverified", "Verified", "Pending"]).default("Unverified"),
      }),
    )
    .default([]),
  organization: z.string().max(200).default(""),
  state: z.string().max(100).default(""),
  district: z.string().max(100).default(""),
  bio: z.string().max(2000).default(""),
  contactPhone: z.string().max(30).default(""),
});

export function coachRoutes(db) {
  const r = Router();
  const engine = new TrainingEngine(db);
  const benchmarkService = new BenchmarkService(db);

  // Coach Authorization Middleware
  r.use((req, res, next) => {
    if (!["coach", "medical"].includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied. Coach or medical role required." });
    }
    next();
  });

  // Helper: Verify athlete connection to the coach
  async function verifyAthleteConnection(athleteId, coachUser) {
    const profile = await db.get("profiles", athleteId);
    if (!profile) return { error: "Athlete not found.", status: 404 };
    const isAssigned =
      profile.coachId &&
      (profile.coachId === coachUser.id ||
        profile.coachId.toLowerCase() === coachUser.email?.toLowerCase());
    if (!isAssigned) {
      return {
        error: "Unauthorized. You are not the assigned coach for this athlete.",
        status: 403,
      };
    }
    return { profile };
  }

  // Helper: Compute objective athlete status from actual data
  function computeAthleteStatus(profile, sessions, plans, injuries, goals) {
    const flags = [];

    // 1. Pain or active injury flag
    const activeInjuries = (injuries || []).filter(
      (i) => i.stage && i.stage !== "Return to play",
    );
    const recentSessions = (sessions || []).slice(-5);
    const hasHighPain = recentSessions.some((s) => Number(s.pain) >= 5);
    const hasPainFlag =
      (plans || []).some((p) => p.days?.some((d) => d.athleteCompletion?.painFlag));

    if (activeInjuries.length > 0 || hasHighPain || hasPainFlag) {
      flags.push({
        type: "danger",
        category: "safety",
        label: "Safety Flag",
        message: activeInjuries.length > 0
          ? `Active injury recorded (${activeInjuries[0].title || "Injury"}).`
          : "Pain reported in recent session check-in.",
      });
    }

    // 2. Adherence check across recent 14 days
    const now = Date.now();
    const last14DaysSessions = (sessions || []).filter(
      (s) => Date.parse(s.date || s.trainingDate || 0) >= now - 14 * 86400000,
    );

    const totalSessions = sessions.length;
    if (totalSessions === 0) {
      return { status: "No Recent Data", flags };
    }

    if (last14DaysSessions.length === 0) {
      flags.push({
        type: "warning",
        category: "adherence",
        label: "No Recent Training",
        message: "No training sessions logged in the last 14 days.",
      });
    } else if (last14DaysSessions.length < 3) {
      flags.push({
        type: "warning",
        category: "adherence",
        label: "Low Adherence",
        message: `Only ${last14DaysSessions.length} sessions logged in the past 14 days.`,
      });
    }

    // 3. Recovery and fatigue check
    const highFatigue = recentSessions.some((s) => Number(s.fatigue) >= 8);
    if (highFatigue) {
      flags.push({
        type: "warning",
        category: "recovery",
        label: "Recovery Concern",
        message: "Repeated high fatigue reported in recent training sessions.",
      });
    }

    // 4. Goal tracking check
    const yearGoal = goals?.yearGoal;
    const currentPB = profile.currentPB;
    if (yearGoal && yearGoal.targetPB && currentPB) {
      const lowerIsBetter = profile.unit === "sec";
      const gap = lowerIsBetter ? currentPB - yearGoal.targetPB : yearGoal.targetPB - currentPB;
      if (gap > 0.8 && totalSessions > 15) {
        flags.push({
          type: "info",
          category: "goal",
          label: "Behind Goal",
          message: `Current PB (${currentPB}s) is ${gap.toFixed(2)}s away from target (${yearGoal.targetPB}s).`,
        });
      }
    }

    // Determine final status
    if (activeInjuries.length > 0 || hasHighPain || hasPainFlag) {
      return { status: "Safety Flag", flags };
    }
    if (last14DaysSessions.length === 0 && totalSessions > 0) {
      return { status: "No Recent Data", flags };
    }
    if (last14DaysSessions.length < 3) {
      return { status: "Low Adherence", flags };
    }
    if (highFatigue) {
      return { status: "Recovery Concern", flags };
    }
    if (flags.some((f) => f.label === "Behind Goal")) {
      return { status: "Behind Goal", flags };
    }
    if (flags.length > 0) {
      return { status: "Needs Review", flags };
    }
    return { status: "On Track", flags };
  }

  // ==========================================
  // 1. COACH DASHBOARD
  // ==========================================
  r.get("/dashboard", async (req, res) => {
    const allProfiles = await db.list("profiles");
    const profiles = allProfiles.filter(
      (p) =>
        p.coachId &&
        (p.coachId === req.user.id ||
          p.coachId.toLowerCase() === req.user.email?.toLowerCase()),
    );

    let onTrackCount = 0;
    let needsReviewCount = 0;
    let safetyFlagsCount = 0;
    let trainingTodayCount = 0;
    let missedTrainingCount = 0;

    const todayStr = new Date().toISOString().slice(0, 10);
    const athletesList = [];
    const todaySessions = [];
    const safetyAlerts = [];

    for (const p of profiles) {
      const sessions = (await db.list("sessions", { ownerId: p.id })) || [];
      const plans = (await db.list("plans", { athleteId: p.id })) || [];
      const injuries = (await db.list("injuries", { ownerId: p.id })) || [];

      // Sort sessions by trainingDate descending
      sessions.sort((a, b) =>
        (b.date || b.trainingDate || "").localeCompare(a.date || a.trainingDate || ""),
      );

      const profile = engine.getAthleteTrainingProfile(p, sessions, injuries);
      const roadmap = engine.calculateRoadmap(p, sessions, plans, injuries);
      const goals = await engine.getGoals(p.id, profile, sessions);

      const { status: athleteStatus, flags } = computeAthleteStatus(
        profile,
        sessions,
        plans,
        injuries,
        goals,
      );

      if (athleteStatus === "On Track") onTrackCount++;
      else if (athleteStatus === "Safety Flag") {
        safetyFlagsCount++;
        needsReviewCount++;
      } else {
        needsReviewCount++;
        if (athleteStatus === "Low Adherence" || athleteStatus === "No Recent Data") {
          missedTrainingCount++;
        }
      }

      // Check today's active plan session
      const activePlan = plans.find((pl) => pl.status === "published" || pl.status === "active") || plans[0];
      let todaySessionInfo = null;
      if (activePlan?.days) {
        const todayDay = activePlan.days.find(
          (d) => (d.date || d.trainingDate) === todayStr,
        );
        if (todayDay) {
          trainingTodayCount++;
          todaySessionInfo = {
            athleteId: p.id,
            athleteName: p.name,
            sessionType: todayDay.sessionType,
            objective: todayDay.objective,
            status: todayDay.status || "scheduled",
            rpe: todayDay.athleteCompletion?.rpe || null,
          };
          todaySessions.push(todaySessionInfo);
        }
      }

      // Safety alerts collection
      flags.filter((f) => f.category === "safety").forEach((f) => {
        safetyAlerts.push({
          athleteId: p.id,
          athleteName: p.name,
          sport: p.sport,
          event: p.event,
          flag: f,
        });
      });

      // Calculate adherence percentage across last 14 days
      const recent14 = sessions.filter(
        (s) => Date.parse(s.date || s.trainingDate || 0) >= Date.now() - 14 * 86400000,
      );
      const adherence = Math.min(100, Math.round((recent14.length / 8) * 100));

      athletesList.push({
        athleteId: p.id,
        name: p.name,
        sport: p.sport,
        event: p.event,
        currentPB: profile.currentPB,
        previousPB: sessions.length > 1 ? sessions[1].metric : null,
        target: p.target,
        goal: p.goal || (goals.yearGoal?.targetPB ? `${goals.yearGoal.targetPB}s` : ""),
        yearTarget: goals.yearGoal?.targetValue || goals.yearGoal?.targetPB,
        phase: activePlan?.phase || roadmap.currentLevelName || "Foundation",
        trainingStatus: athleteStatus,
        adherence,
        flags,
        lastTrainingDate: sessions[0]?.date || sessions[0]?.trainingDate || null,
        lastTrainingTitle: sessions[0]?.title || null,
        currentRoadmapLevel: roadmap.currentLevel,
        currentRoadmapTitle: roadmap.currentLevelTitle,
        competitionDate: p.competitionDate || null,
        daysToCompetition: p.competitionDate
          ? Math.max(0, Math.round((Date.parse(p.competitionDate) - Date.now()) / 86400000))
          : null,
      });
    }

    res.json({
      summary: {
        totalAthletes: profiles.length,
        trainingToday: trainingTodayCount,
        needsReview: needsReviewCount,
        safetyFlags: safetyFlagsCount,
        missedTraining: missedTrainingCount,
        onTrack: onTrackCount,
      },
      recentAthletes: athletesList,
      todaySessions,
      safetyAlerts,
    });
  });

  // ==========================================
  // 2. MY ATHLETES (LIST WITH SEARCH & FILTERS)
  // ==========================================
  r.get("/athletes", async (req, res) => {
    const allProfiles = await db.list("profiles");
    let profiles = allProfiles.filter(
      (p) =>
        p.coachId &&
        (p.coachId === req.user.id ||
          p.coachId.toLowerCase() === req.user.email?.toLowerCase()),
    );

    const { search, sport, status } = req.query;

    if (search) {
      const q = String(search).toLowerCase();
      profiles = profiles.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.sport && p.sport.toLowerCase().includes(q)) ||
          (p.event && p.event.toLowerCase().includes(q)) ||
          (p.district && p.district.toLowerCase().includes(q)) ||
          (p.state && p.state.toLowerCase().includes(q)),
      );
    }

    if (sport && sport !== "All") {
      profiles = profiles.filter((p) => p.sport.toLowerCase() === sport.toLowerCase());
    }

    const athletesList = [];
    let onTrackCount = 0;
    let needsReviewCount = 0;
    let missedTrainingCount = 0;
    let safetyFlagsCount = 0;

    for (const p of profiles) {
      const sessions = (await db.list("sessions", { ownerId: p.id })) || [];
      const plans = (await db.list("plans", { athleteId: p.id })) || [];
      const injuries = (await db.list("injuries", { ownerId: p.id })) || [];

      // Always order sessions by trainingDate descending
      sessions.sort((a, b) =>
        (b.date || b.trainingDate || "").localeCompare(a.date || a.trainingDate || ""),
      );

      const profile = engine.getAthleteTrainingProfile(p, sessions, injuries);
      const roadmap = engine.calculateRoadmap(p, sessions, plans, injuries);
      const goals = await engine.getGoals(p.id, profile, sessions);

      const { status: athleteStatus, flags } = computeAthleteStatus(
        profile,
        sessions,
        plans,
        injuries,
        goals,
      );

      if (status && status !== "All" && athleteStatus !== status) {
        continue;
      }

      if (athleteStatus === "On Track") onTrackCount++;
      else if (athleteStatus === "Safety Flag") {
        safetyFlagsCount++;
        needsReviewCount++;
      } else {
        needsReviewCount++;
        if (athleteStatus === "Low Adherence" || athleteStatus === "No Recent Data") {
          missedTrainingCount++;
        }
      }

      const activePlan = plans.find((pl) => pl.status === "published" || pl.status === "active") || plans[0];
      const recent14 = sessions.filter(
        (s) => Date.parse(s.date || s.trainingDate || 0) >= Date.now() - 14 * 86400000,
      );
      const adherence = Math.min(100, Math.round((recent14.length / 8) * 100));

      athletesList.push({
        athleteId: p.id,
        id: p.id,
        name: p.name,
        sport: p.sport,
        event: p.event,
        unit: p.unit,
        age: calculateAge(p.birthDate) ?? 18,
        gender: p.gender,
        state: p.state,
        district: p.district,
        currentPB: profile.currentPB,
        previousPB: sessions.length > 1 ? sessions[1].metric : null,
        target: p.target,
        goal: p.goal || (goals.yearGoal?.targetPB ? `${goals.yearGoal.targetPB}s` : ""),
        yearTarget: goals.yearGoal?.targetValue || goals.yearGoal?.targetPB,
        currentPhase: activePlan?.phase || roadmap.currentLevelName || "Foundation",
        trainingStatus: athleteStatus,
        adherence,
        flags,
        lastTraining: sessions[0] ? `${sessions[0].date || sessions[0].trainingDate} (${sessions[0].title})` : "None recorded",
        lastTrainingDate: sessions[0]?.date || sessions[0]?.trainingDate || null,
        lastTrainingTitle: sessions[0]?.title || null,
        currentRoadmapLevel: roadmap.currentLevel,
        currentRoadmapTitle: roadmap.currentLevelTitle,
        competitionDate: p.competitionDate || null,
        daysToCompetition: p.competitionDate
          ? Math.max(0, Math.round((Date.parse(p.competitionDate) - Date.now()) / 86400000))
          : null,
      });
    }

    res.json({
      summary: {
        totalAthletes: athletesList.length,
        onTrack: onTrackCount,
        needsReview: needsReviewCount,
        missedTraining: missedTrainingCount,
        safetyFlags: safetyFlagsCount,
      },
      athletes: athletesList,
    });
  });

  // ==========================================
  // 3. ATHLETE DETAIL DOSSIER
  // ==========================================
  async function handleAthleteDetail(athleteId, req, res) {
    const check = await verifyAthleteConnection(athleteId, req.user);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const p = check.profile;

    const sessions = (await db.list("sessions", { ownerId: p.id })) || [];
    const plans = (await db.list("plans", { athleteId: p.id })) || [];
    const injuries = (await db.list("injuries", { ownerId: p.id })) || [];
    const achievements = (await db.list("achievements", { ownerId: p.id })) || [];

    // Strictly order training history by trainingDate descending (NEVER updatedAt)
    sessions.sort((a, b) => {
      const da = a.date || a.trainingDate || "";
      const db = b.date || b.trainingDate || "";
      return db.localeCompare(da);
    });

    const profile = engine.getAthleteTrainingProfile(p, sessions, injuries);
    const roadmap = engine.calculateRoadmap(p, sessions, plans, injuries);
    const goals = await engine.getGoals(p.id, profile, sessions);
    const realityCheck = await engine.generateRealityCheck(p, sessions);
    const activePlan = await engine.getOrCreateWeeklyPlan({ athlete: p });

    // Performance comparison with sport-aware benchmarks
    const benchmarkComparison = await benchmarkService
      .getComparison(normalizeProfile(p), sessions)
      .catch(() => null);

    const { status: athleteStatus, flags: safetyFlags } = computeAthleteStatus(
      profile,
      sessions,
      plans,
      injuries,
      goals,
    );

    // Calculate adherence statistics
    const recent14 = sessions.filter(
      (s) => Date.parse(s.date || s.trainingDate || 0) >= Date.now() - 14 * 86400000,
    );
    const adherence = Math.min(100, Math.round((recent14.length / 8) * 100));

    res.json({
      profile: {
        id: p.id,
        name: p.name,
        sport: p.sport,
        event: p.event,
        unit: p.unit,
        gender: p.gender,
        birthDate: p.birthDate,
        age: calculateAge(p.birthDate) ?? 18,
        state: p.state,
        district: p.district,
        competitionDate: p.competitionDate,
        currentPB: profile.currentPB,
        previousPB: sessions.length > 1 ? sessions[1].metric : null,
        target: p.target,
        goal: p.goal,
        classification: p.classification,
        equipment: p.equipment,
        sportProfile: p.sportProfile,
        trainingStatus: athleteStatus,
        adherence,
      },
      performance: {
        currentPB: profile.currentPB,
        previousPB: sessions.length > 1 ? sessions[1].metric : null,
        target: p.target,
        benchmarkComparison,
        recentResults: sessions.slice(0, 10).map((s) => ({
          date: s.date || s.trainingDate,
          title: s.title,
          metric: s.metric,
          unit: s.unit,
          effort: s.effort,
          pain: s.pain,
          fatigue: s.fatigue,
        })),
        achievements,
      },
      training: {
        currentPlan: activePlan,
        activePlan,
        plans,
        recentSessions: sessions.slice(0, 20),
        sessions,
        adherence,
        totalSessions: sessions.length,
      },
      recovery: {
        recentSessions: sessions.slice(0, 10),
        injuries,
        safetyFlags,
        latestFatigue: sessions[0]?.fatigue ?? null,
        latestPain: sessions[0]?.pain ?? null,
      },
      roadmap,
      goals,
      realityCheck,
      safetyFlags,
      currentPlan: activePlan,
      activePlan,
      sessions,
      achievements,
      injuries,
    });
  }

  r.get("/athletes/:athleteId", (req, res) => handleAthleteDetail(req.params.athleteId, req, res));
  r.get("/athlete/:athleteId", (req, res) => handleAthleteDetail(req.params.athleteId, req, res));

  // ==========================================
  // 4. ATHLETE PERFORMANCE TAB
  // ==========================================
  r.get("/athletes/:athleteId/performance", async (req, res) => {
    const check = await verifyAthleteConnection(req.params.athleteId, req.user);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const p = check.profile;

    const sessions = (await db.list("sessions", { ownerId: p.id })) || [];
    sessions.sort((a, b) => (b.date || b.trainingDate || "").localeCompare(a.date || a.trainingDate || ""));

    const achievements = (await db.list("achievements", { ownerId: p.id })) || [];
    const benchmarkComparison = await benchmarkService
      .getComparison(normalizeProfile(p), sessions)
      .catch(() => null);

    const lower = p.unit === "sec";
    const validSessions = sessions.filter((s) => s.metric > 0);
    const bestMark = validSessions.length
      ? (lower ? Math.min : Math.max)(...validSessions.map((s) => s.metric))
      : null;

    res.json({
      athleteId: p.id,
      name: p.name,
      sport: p.sport,
      event: p.event,
      unit: p.unit,
      currentPB: bestMark,
      previousPB: validSessions.length > 1 ? validSessions[1].metric : null,
      target: p.target,
      benchmarkComparison,
      progression: validSessions.slice(0, 25).map((s) => ({
        date: s.date || s.trainingDate,
        trainingDate: s.trainingDate || s.date,
        metric: s.metric,
        title: s.title,
        effort: s.effort,
      })),
      achievements,
    });
  });

  // ==========================================
  // 5. ATHLETE TRAINING TAB
  // ==========================================
  r.get("/athletes/:athleteId/training", async (req, res) => {
    const check = await verifyAthleteConnection(req.params.athleteId, req.user);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const p = check.profile;

    const sessions = (await db.list("sessions", { ownerId: p.id })) || [];
    // Strictly order by trainingDate descending
    sessions.sort((a, b) => (b.date || b.trainingDate || "").localeCompare(a.date || a.trainingDate || ""));

    const plans = (await db.list("plans", { athleteId: p.id })) || [];
    plans.sort((a, b) => (b.weekStart || "").localeCompare(a.weekStart || ""));

    const activePlan = await engine.getOrCreateWeeklyPlan({ athlete: p });

    // Calculate adherence and planned vs actual statistics
    const activeDays = (activePlan?.days || []).filter((d) => d.expectedDuration > 0);
    const completedDays = activeDays.filter((d) => d.status === "completed").length;
    const missedDays = activeDays.filter((d) => d.status === "missed").length;

    res.json({
      activePlan,
      plans,
      sessions,
      adherencePercentage: activeDays.length ? Math.round((completedDays / activeDays.length) * 100) : 0,
      completedSessions: completedDays,
      missedSessions: missedDays,
      totalPlanned: activeDays.length,
    });
  });

  // ==========================================
  // 6. ATHLETE RECOVERY TAB
  // ==========================================
  r.get("/athletes/:athleteId/recovery", async (req, res) => {
    const check = await verifyAthleteConnection(req.params.athleteId, req.user);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const p = check.profile;

    const sessions = (await db.list("sessions", { ownerId: p.id })) || [];
    sessions.sort((a, b) => (b.date || b.trainingDate || "").localeCompare(a.date || a.trainingDate || ""));

    const injuries = (await db.list("injuries", { ownerId: p.id })) || [];
    const plans = (await db.list("plans", { athleteId: p.id })) || [];

    const wellbeing = sessions.slice(0, 14).map((s) => ({
      date: s.date || s.trainingDate,
      pain: Number(s.pain) || 0,
      fatigue: Number(s.fatigue) || 0,
      effort: Number(s.effort) || 0,
      notes: s.notes || "",
    }));

    const activeInjuries = injuries.filter((i) => i.stage && i.stage !== "Return to play");
    const painReported = sessions.slice(0, 5).some((s) => Number(s.pain) >= 5);

    res.json({
      athleteId: p.id,
      wellbeing,
      injuries,
      activeInjuries,
      painReported,
      recoveryStatus: painReported || activeInjuries.length > 0 ? "Attention Required" : "Good",
    });
  });

  // ==========================================
  // 7. GOALS (YEAR & MONTH GOALS MANAGEMENT)
  // ==========================================
  r.get("/athletes/:athleteId/goals", async (req, res) => {
    const check = await verifyAthleteConnection(req.params.athleteId, req.user);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const p = check.profile;

    const sessions = (await db.list("sessions", { ownerId: p.id })) || [];
    const profile = engine.getAthleteTrainingProfile(p, sessions);
    const goals = await engine.getGoals(p.id, profile, sessions);

    res.json(goals);
  });

  async function handleUpdateGoals(athleteId, req, res) {
    const check = await verifyAthleteConnection(athleteId, req.user);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const p = check.profile;

    const existing = (await db.get("training_goals", p.id)) || {};
    const updated = {
      ...existing,
      ...req.body,
      id: p.id,
      ownerId: p.id,
      updatedByCoachId: req.user.id,
      updatedAt: new Date().toISOString(),
    };

    await db.put("training_goals", updated);
    res.json({ goals: updated });
  }

  r.put("/athletes/:athleteId/goals", (req, res) => handleUpdateGoals(req.params.athleteId, req, res));
  r.post("/athletes/:athleteId/goals", (req, res) => handleUpdateGoals(req.params.athleteId, req, res));
  r.put("/athlete/:athleteId/goals", (req, res) => handleUpdateGoals(req.params.athleteId, req, res));

  // ==========================================
  // 8. ATHLETE ROADMAP (LEVELS 1 TO 6)
  // ==========================================
  r.get("/athletes/:athleteId/roadmap", async (req, res) => {
    const check = await verifyAthleteConnection(req.params.athleteId, req.user);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const p = check.profile;

    const sessions = (await db.list("sessions", { ownerId: p.id })) || [];
    const plans = (await db.list("plans", { athleteId: p.id })) || [];
    const injuries = (await db.list("injuries", { ownerId: p.id })) || [];

    const roadmap = engine.calculateRoadmap(p, sessions, plans, injuries);
    res.json(roadmap);
  });

  // ==========================================
  // 9. TRAINING PLANS (LIST, CREATE, UPDATE, PUBLISH, RESCHEDULE)
  // ==========================================
  r.get("/training-plans", async (req, res) => {
    const { athleteId, status } = req.query;
    let plans = await db.list("plans");

    // Filter to only plans belonging to connected athletes
    const allProfiles = await db.list("profiles");
    const connectedAthleteIds = new Set(
      allProfiles
        .filter(
          (p) =>
            p.coachId &&
            (p.coachId === req.user.id ||
              p.coachId.toLowerCase() === req.user.email?.toLowerCase()),
        )
        .map((p) => p.id),
    );

    plans = plans.filter((pl) => connectedAthleteIds.has(pl.athleteId));

    if (athleteId) {
      plans = plans.filter((pl) => pl.athleteId === athleteId);
    }
    if (status) {
      plans = plans.filter((pl) => pl.status === status);
    }

    plans.sort((a, b) => (b.weekStart || "").localeCompare(a.weekStart || ""));
    res.json(plans);
  });

  async function handleSavePlan(athleteIdParam, req, res) {
    const athleteId = athleteIdParam || req.body.athleteId;
    if (!athleteId) {
      return res.status(400).json({ error: "athleteId is required." });
    }

    const check = await verifyAthleteConnection(athleteId, req.user);
    if (check.error) return res.status(check.status).json({ error: check.error });
    const p = check.profile;

    const startD = new Date(req.body.weekStart);
    const computedEnd = !isNaN(startD.getTime())
      ? new Date(startD.getTime() + 6 * 86400000).toISOString().slice(0, 10)
      : undefined;
    const rawWeekEnd = req.body.weekEnd || computedEnd;

    const normalizedDays = (req.body.days || []).map((d, idx) => {
      const dayDate = d.date || d.trainingDate || (!isNaN(startD.getTime())
        ? new Date(startD.getTime() + idx * 86400000).toISOString().slice(0, 10)
        : undefined);
      return {
        dayIndex: d.dayIndex !== undefined ? Number(d.dayIndex) : idx,
        date: dayDate,
        trainingDate: dayDate,
        ...d,
      };
    });

    const parsed = weeklyPlanSchema.safeParse({
      ...req.body,
      athleteId,
      weekEnd: rawWeekEnd,
      days: normalizedDays,
    });
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    const planData = parsed.data;
    const { weekStart, weekEnd, days } = planData;

    // Validate that all day training dates are within [weekStart, weekEnd]
    for (const d of days) {
      const dDate = d.date || d.trainingDate;
      if (dDate && weekEnd && (dDate < weekStart || dDate > weekEnd)) {
        return res.status(400).json({
          error: `Training date ${dDate} must fall within week [${weekStart}, ${weekEnd}].`,
        });
      }
    }

    const planId = req.params.planId || `plan-${p.id}-${weekStart}`;
    const existing = await db.get("plans", planId);

    const version = existing ? (existing.version || 1) + 1 : 1;
    const versionHistory = existing?.versionHistory || [];
    if (existing) {
      versionHistory.push({
        version: existing.version || 1,
        modifiedAt: existing.updatedAt || new Date().toISOString(),
        modifiedBy: existing.coachId || req.user.id,
        status: existing.status,
        changeReason: planData.changeReason || "Coach updated session parameters",
      });
    }

    // Merge existing days' athleteCompletion if any day was already checked in
    const mergedDays = days.map((newDay) => {
      const oldDay = existing?.days?.find((od) => od.dayIndex === newDay.dayIndex);
      return {
        ...newDay,
        athleteCompletion: oldDay?.athleteCompletion || newDay.athleteCompletion,
        status: oldDay?.status && oldDay.status !== "scheduled" ? oldDay.status : newDay.status,
      };
    });

    const savedPlan = {
      ...existing,
      ...planData,
      id: planId,
      athleteId: p.id,
      coachId: req.user.id,
      weekStart,
      weekEnd: weekEnd || rawWeekEnd,
      phase: planData.phase,
      weeklyObjective: planData.weeklyObjective,
      source: "coach",
      status: planData.status || "published",
      days: mergedDays,
      version,
      versionHistory,
      updatedAt: new Date().toISOString(),
    };

    await db.put("plans", savedPlan);
    res.status(201).json({ plan: savedPlan });
  }

  r.post("/training-plans", (req, res) => handleSavePlan(req.body.athleteId, req, res));
  r.post("/athlete/:athleteId/plan", (req, res) => handleSavePlan(req.params.athleteId, req, res));

  r.get("/training-plans/:planId", async (req, res) => {
    const plan = await db.get("plans", req.params.planId);
    if (!plan) return res.status(404).json({ error: "Training plan not found." });

    const check = await verifyAthleteConnection(plan.athleteId, req.user);
    if (check.error) return res.status(check.status).json({ error: check.error });

    res.json(plan);
  });

  r.put("/training-plans/:planId", async (req, res) => {
    const existing = await db.get("plans", req.params.planId);
    if (!existing) return res.status(404).json({ error: "Training plan not found." });

    const check = await verifyAthleteConnection(existing.athleteId, req.user);
    if (check.error) return res.status(check.status).json({ error: check.error });

    return handleSavePlan(existing.athleteId, req, res);
  });

  // Publish Weekly Plan
  r.post("/training-plans/:planId/publish", async (req, res) => {
    const plan = await db.get("plans", req.params.planId);
    if (!plan) return res.status(404).json({ error: "Training plan not found." });

    const check = await verifyAthleteConnection(plan.athleteId, req.user);
    if (check.error) return res.status(check.status).json({ error: check.error });

    plan.status = "published";
    plan.publishedAt = new Date().toISOString();
    plan.publishedByCoachId = req.user.id;
    plan.source = "coach";
    plan.updatedAt = new Date().toISOString();

    await db.put("plans", plan);
    res.json({ ok: true, plan });
  });

  // Reschedule Session Day within Plan
  r.post("/training-plans/:planId/reschedule", async (req, res) => {
    const plan = await db.get("plans", req.params.planId);
    if (!plan) return res.status(404).json({ error: "Training plan not found." });

    const check = await verifyAthleteConnection(plan.athleteId, req.user);
    if (check.error) return res.status(check.status).json({ error: check.error });

    const { dayIndex, newDate, coachNotes } = req.body;
    const day = plan.days.find((d) => d.dayIndex === Number(dayIndex));
    if (!day) return res.status(404).json({ error: "Day session not found in plan." });

    if (newDate) {
      day.date = newDate;
      day.trainingDate = newDate;
    }
    if (coachNotes) {
      day.coachNotes = `${day.coachNotes ? day.coachNotes + " · " : ""}Rescheduled by coach: ${coachNotes}`;
    }
    day.status = "scheduled";

    plan.updatedAt = new Date().toISOString();
    await db.put("plans", plan);
    res.json({ ok: true, plan });
  });

  // Coach Override
  async function handleOverride(athleteId, req, res) {
    const check = await verifyAthleteConnection(athleteId, req.user);
    if (check.error) return res.status(check.status).json({ error: check.error });

    const { planId, reason, overrideReason, action } = req.body;
    const finalReason = reason || overrideReason;
    if (!finalReason) return res.status(400).json({ error: "Reason for override is required." });

    const overrideRecord = {
      coachId: req.user.id,
      athleteId,
      reason: finalReason,
      action: action || "custom",
      timestamp: new Date().toISOString(),
    };

    if (planId) {
      const plan = await db.get("plans", planId);
      if (plan) {
        plan.coachOverride = overrideRecord;
        plan.source = "coach_modified";
        plan.updatedAt = new Date().toISOString();
        await db.put("plans", plan);
      }
    }

    await db.put("audit", {
      ownerId: req.user.id,
      athleteId,
      action: "Coach Override Applied",
      record: overrideRecord,
      at: new Date().toISOString(),
    });

    res.json({ override: overrideRecord });
  }

  r.post("/athletes/:athleteId/override", (req, res) => handleOverride(req.params.athleteId, req, res));
  r.post("/athlete/:athleteId/override", (req, res) => handleOverride(req.params.athleteId, req, res));

  // ==========================================
  // 10. NOTIFICATIONS CENTER
  // ==========================================
  r.get("/notifications", async (req, res) => {
    const allProfiles = await db.list("profiles");
    const profiles = allProfiles.filter(
      (p) =>
        p.coachId &&
        (p.coachId === req.user.id ||
          p.coachId.toLowerCase() === req.user.email?.toLowerCase()),
    );

    const notifications = [];
    const now = Date.now();

    for (const p of profiles) {
      const sessions = (await db.list("sessions", { ownerId: p.id })) || [];
      const plans = (await db.list("plans", { athleteId: p.id })) || [];
      const injuries = (await db.list("injuries", { ownerId: p.id })) || [];

      // Sort sessions by trainingDate descending
      sessions.sort((a, b) =>
        (b.date || b.trainingDate || "").localeCompare(a.date || a.trainingDate || ""),
      );

      // 1. Pain or Injury Notification
      const activeInjuries = injuries.filter((i) => i.stage && i.stage !== "Return to play");
      if (activeInjuries.length > 0) {
        notifications.push({
          id: `notif-inj-${p.id}-${activeInjuries[0].id}`,
          type: "danger",
          category: "health",
          athleteId: p.id,
          athleteName: p.name,
          title: "Safety Flag: Active Injury",
          message: `${p.name} has an active injury recorded (${activeInjuries[0].title}). Review stage before increasing training load.`,
          date: activeInjuries[0].date || new Date().toISOString().slice(0, 10),
        });
      }

      const painSession = sessions.find((s) => Number(s.pain) >= 5);
      if (painSession) {
        notifications.push({
          id: `notif-pain-${p.id}-${painSession.id}`,
          type: "danger",
          category: "health",
          athleteId: p.id,
          athleteName: p.name,
          title: "Pain Reported During Session",
          message: `${p.name} reported pain (${painSession.pain}/10) in session on ${painSession.date || painSession.trainingDate}.`,
          date: painSession.date || painSession.trainingDate,
        });
      }

      // 2. Missed Sessions Alert
      const missedSessions = plans.flatMap((pl) =>
        (pl.days || [])
          .filter((d) => d.status === "missed")
          .map((d) => ({ ...d, weekStart: pl.weekStart })),
      );

      if (missedSessions.length >= 3) {
        notifications.push({
          id: `notif-missed-3-${p.id}`,
          type: "warning",
          category: "adherence",
          athleteId: p.id,
          athleteName: p.name,
          title: "Repeated Missed Training Sessions",
          message: `${p.name} has missed ${missedSessions.length} planned sessions. Review workload and schedule adherence.`,
          date: missedSessions[0].date || new Date().toISOString().slice(0, 10),
        });
      } else if (missedSessions.length > 0) {
        const lastMissed = missedSessions[missedSessions.length - 1];
        notifications.push({
          id: `notif-missed-${p.id}-${lastMissed.date}`,
          type: "warning",
          category: "adherence",
          athleteId: p.id,
          athleteName: p.name,
          title: "Session Missed",
          message: `${p.name} missed session (${lastMissed.sessionType}) on ${lastMissed.date}. Reason: ${lastMissed.athleteCompletion?.missedReason || "Not specified"}.`,
          date: lastMissed.date || new Date().toISOString().slice(0, 10),
        });
      }

      // 3. Approaching Competition (< 30 days)
      if (p.competitionDate) {
        const compTime = Date.parse(p.competitionDate);
        const daysLeft = Math.round((compTime - now) / 86400000);
        if (daysLeft > 0 && daysLeft <= 30) {
          notifications.push({
            id: `notif-comp-${p.id}`,
            type: "info",
            category: "competition",
            athleteId: p.id,
            athleteName: p.name,
            title: "Target Competition Approaching",
            message: `${p.name}'s target competition is in ${daysLeft} days (${p.competitionDate}). Taper phase recommended.`,
            date: new Date().toISOString().slice(0, 10),
          });
        }
      }

      // 4. Performance PB Breakthrough
      if (sessions.length >= 2) {
        const lower = p.unit === "sec";
        const latest = sessions[0].metric;
        const previousBest = (lower ? Math.min : Math.max)(
          ...sessions.slice(1).filter((s) => s.metric > 0).map((s) => s.metric),
        );
        if (latest > 0 && (lower ? latest < previousBest : latest > previousBest)) {
          notifications.push({
            id: `notif-pb-${p.id}-${sessions[0].id}`,
            type: "success",
            category: "performance",
            athleteId: p.id,
            athleteName: p.name,
            title: "New Personal Best Logged",
            message: `${p.name} set a new Personal Best of ${latest}${p.unit} in ${p.event} on ${sessions[0].date || sessions[0].trainingDate}!`,
            date: sessions[0].date || sessions[0].trainingDate,
          });
        }
      }

      // 5. Training Plan Expiring Alert
      const activePlan = plans.find((pl) => pl.status === "published" || pl.status === "active");
      if (activePlan?.weekEnd) {
        const daysToEnd = Math.round((Date.parse(activePlan.weekEnd) - now) / 86400000);
        if (daysToEnd >= 0 && daysToEnd <= 2) {
          notifications.push({
            id: `notif-plan-end-${p.id}-${activePlan.id}`,
            type: "info",
            category: "training",
            athleteId: p.id,
            athleteName: p.name,
            title: "Weekly Plan Review Needed",
            message: `Current weekly plan for ${p.name} concludes in ${daysToEnd} days. Review weekly adaptation and build next week's plan.`,
            date: new Date().toISOString().slice(0, 10),
          });
        }
      }
    }

    // Sort newest notifications first
    notifications.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    res.json(notifications);
  });

  // ==========================================
  // 11. COACH PROFILE
  // ==========================================
  r.get("/profile", async (req, res) => {
    let profile = await db.get("coach_profiles", req.user.id);
    if (!profile) {
      profile = {
        id: req.user.id,
        ownerId: req.user.id,
        name: req.user.name || "Coach",
        email: req.user.email,
        specialization: "Track & Field Sprint Performance",
        sports: ["Athletics"],
        events: ["100m", "200m", "400m"],
        experienceYears: 6,
        certifications: [
          {
            name: "AFI Level 1 Sprint Coach Certification",
            issuer: "Athletics Federation of India",
            year: "2023",
            verificationStatus: "Unverified",
          },
        ],
        organization: "District Athletics Academy",
        state: "Maharashtra",
        district: "Nashik",
        bio: "Dedicated sprint and speed development coach focusing on grassroots youth athletics and scientific progression.",
        contactPhone: "",
      };
      await db.put("coach_profiles", profile);
    }
    res.json(profile);
  });

  r.put("/profile", async (req, res) => {
    const parsed = coachProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      });
    }

    // Ensure certifications maintain unverified status unless explicit admin verification
    const safeCerts = (parsed.data.certifications || []).map((c) => ({
      ...c,
      verificationStatus: c.verificationStatus === "Verified" ? "Verified" : "Unverified",
    }));

    const updated = {
      ...parsed.data,
      certifications: safeCerts,
      id: req.user.id,
      ownerId: req.user.id,
      email: req.user.email,
      updatedAt: new Date().toISOString(),
    };

    await db.put("coach_profiles", updated);
    res.json(updated);
  });

  // ==========================================
  // 12. EXERCISE LIBRARY
  // ==========================================
  r.get("/exercises", (_req, res) => {
    res.json({
      qualities: SPRINT_QUALITIES,
      exercises: EXERCISE_LIBRARY,
    });
  });

  return r;
}
