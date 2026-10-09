import { normalizeProfile } from "./sports.js";

export function age(birthDate) {
  if (!birthDate) return null;
  const n = new Date(),
    b = new Date(birthDate);
  return (
    n.getUTCFullYear() -
    b.getUTCFullYear() -
    (n.getUTCMonth() < b.getUTCMonth() ||
    (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())
      ? 1
      : 0)
  );
}
export function insights(p, records) {
  const sessions = records
      .filter((r) => r.kind === "sessions")
      .sort((a, b) =>
        (a.date || a.trainingDate || "").localeCompare(
          b.date || b.trainingDate || "",
        ),
      ),
    recent = sessions.slice(-7);
  const measured = sessions.filter(
      (r) =>
        r.event === p.event && r.unit === (p.unit || "sec") && r.metric > 0,
    ),
    lower =
      p.sportProfile?.measurement?.direction
        ? p.sportProfile.measurement.direction === "lower_is_better"
        : (p.unit || "sec") === "sec";
  const best = measured.length
    ? (lower ? Math.min : Math.max)(...measured.map((r) => r.metric))
    : null;
  const improvement =
    measured.length > 1
      ? ((measured.at(-1).metric - measured[0].metric) / measured[0].metric) *
        (lower ? -100 : 100)
      : 0;
  const fatigue = recent.length
      ? recent.reduce((n, r) => n + r.fatigue, 0) / recent.length
      : 0,
    pain = Math.max(0, ...recent.map((r) => r.pain));
  const workload = recent.reduce((n, r) => n + r.duration * r.effort, 0),
    active = records.some(
      (r) => r.kind === "injuries" && r.stage !== "Return to play",
    );
  const risk =
    pain >= 6 || active
      ? "Needs attention"
      : fatigue >= 7
        ? "Elevated fatigue"
        : "No flags reported";
  const dimensions = [
    {
      name: "Performance",
      weight: 35,
      value:
        best && p.target
          ? Math.min(100, (lower ? p.target / best : best / p.target) * 100)
          : 0,
      explanation:
        "Personal best relative to your own target, not a national ranking.",
    },
    {
      name: "Consistency",
      weight: 20,
      value: Math.min(
        100,
        (new Set(
          sessions
            .filter((r) => Date.parse(r.date || r.trainingDate) >= Date.now() - 28 * 86400000)
            .map((r) => r.date || r.trainingDate),
        ).size /
          12) *
          100,
      ),
      explanation:
        "Distinct training days in the last 28 days, against a target of 12.",
    },
    {
      name: "Improvement",
      weight: 20,
      value:
        measured.length > 1
          ? Math.max(0, Math.min(100, 50 + improvement * 5))
          : 0,
      explanation:
        "First-to-latest result in the same event and unit. Stable results score 50.",
    },
    {
      name: "Fitness",
      weight: 15,
      value: recent.length ? Math.max(0, 100 - fatigue * 10 - pain * 5) : 0,
      explanation:
        "Self-reported pain/fatigue proxy, not a clinical fitness measure.",
    },
    {
      name: "Competition",
      weight: 10,
      value: Math.min(
        100,
        records.filter((r) => r.kind === "achievements" && r.verified).length *
          25,
      ),
      explanation: "25 points per coach-attested achievement, capped at 100.",
    },
  ];
  return {
    sessions: sessions.length,
    best,
    improvement: +improvement.toFixed(1),
    pain,
    fatigue,
    workload,
    risk,
    dimensions,
    score: sessions.length
      ? Math.round(
          dimensions.reduce((n, d) => n + (d.value * d.weight) / 100, 0),
        )
      : null,
    guidance:
      pain >= 6
        ? "Pause strenuous activity and arrange a qualified professional assessment."
        : active
          ? "Follow your clinician-approved recovery plan. Progression needs professional review."
          : fatigue >= 7
            ? "Consider a lighter session and discuss persistent fatigue with your coach."
            : "Keep logging workload, fatigue, and pain to make changes visible.",
  };
}

/**
 * Calculates athlete Training Readiness & personal baseline trends.
 * Authoritative single source of truth for athlete readiness indicators.
 */
export function calculateRecoveryReadiness(records = [], recoveryLogs = []) {
  const sortedLogs = [...recoveryLogs].sort((a, b) =>
    (b.date || b.createdAt || "").localeCompare(a.date || a.createdAt || ""),
  );

  const todayLog = sortedLogs[0] || null;
  const logCount = sortedLogs.length;

  // Previous logs used to construct the personal baseline (excluding today's check-in)
  const previousLogs = sortedLogs.slice(1, 15);
  const baselineCount = previousLogs.length;
  const hasBaseline = baselineCount >= 3;

  // Personal baseline statistics (calculated if >= 3 previous logs exist)
  const baseline = hasBaseline
    ? {
        sleepDuration: Number(
          (previousLogs.reduce((acc, l) => acc + (l.sleepDuration ?? 8.0), 0) / baselineCount).toFixed(1),
        ),
        fatigue: Number(
          (previousLogs.reduce((acc, l) => acc + (l.fatigue ?? 3.0), 0) / baselineCount).toFixed(1),
        ),
        soreness: Number(
          (previousLogs.reduce((acc, l) => acc + (l.soreness ?? 3.0), 0) / baselineCount).toFixed(1),
        ),
        stress: Number(
          (previousLogs.reduce((acc, l) => acc + (l.stress ?? 3.0), 0) / baselineCount).toFixed(1),
        ),
        generalRecovery: Number(
          (previousLogs.reduce((acc, l) => acc + (l.generalRecovery ?? 8.0), 0) / baselineCount).toFixed(1),
        ),
      }
    : null;

  // Active injury detection from records
  const activeInjuryRecord = records.find(
    (r) => (r.kind === "injuries" || (r.stage && r.cleared !== undefined)) && r.stage && r.stage !== "Return to play",
  );
  const activeInjury = Boolean(activeInjuryRecord);

  // Pain flag & level from today's check-in
  const painFlag = Boolean(todayLog?.painFlag);
  const painLevel = Number(todayLog?.painLevel ?? 0);
  const painArea = todayLog?.painArea || "unspecified area";

  // Trends calculation
  const last7 = sortedLogs.slice(0, 7);
  const last30 = sortedLogs.slice(0, 30);

  const trends = {
    status: sortedLogs.length > 0 ? "Available" : "Insufficient data",
    sampleSize7d: last7.length,
    sampleSize30d: last30.length,
    sleep7dAvg: last7.length
      ? Number((last7.reduce((a, l) => a + (l.sleepDuration ?? 0), 0) / last7.length).toFixed(1))
      : null,
    fatigue7dAvg: last7.length
      ? Number((last7.reduce((a, l) => a + (l.fatigue ?? 0), 0) / last7.length).toFixed(1))
      : null,
    soreness7dAvg: last7.length
      ? Number((last7.reduce((a, l) => a + (l.soreness ?? 0), 0) / last7.length).toFixed(1))
      : null,
    painCount7d: last7.filter((l) => l.painFlag || (l.painLevel && l.painLevel > 0)).length,
    sleep30dAvg: last30.length
      ? Number((last30.reduce((a, l) => a + (l.sleepDuration ?? 0), 0) / last30.length).toFixed(1))
      : null,
    fatigue30dAvg: last30.length
      ? Number((last30.reduce((a, l) => a + (l.fatigue ?? 0), 0) / last30.length).toFixed(1))
      : null,
  };

  // Recent Workload (ACWR) from training sessions in records
  const sessions = records.filter((r) => r.kind === "sessions" || r.metric !== undefined);
  const now = Date.now();
  const last7dSessions = sessions.filter(
    (s) => Date.parse(s.date || s.trainingDate || 0) >= now - 7 * 86400000,
  );
  const last28dSessions = sessions.filter(
    (s) => Date.parse(s.date || s.trainingDate || 0) >= now - 28 * 86400000,
  );

  const acute7dLoad = last7dSessions.reduce(
    (acc, s) => acc + (s.duration || 60) * (s.effort || 7),
    0,
  );
  const chronic28dLoad = last28dSessions.length
    ? last28dSessions.reduce((acc, s) => acc + (s.duration || 60) * (s.effort || 7), 0) / 4
    : acute7dLoad || 1;
  const acwr = Number((acute7dLoad / Math.max(1, chronic28dLoad)).toFixed(2));

  let readiness = "LIMITED DATA";
  let statusColor = "gray";
  let reason = "";
  let recommendation = "";
  let primaryFocus = "Baseline Check-ins";
  let score = 50;

  // 1. ACTIVE INJURY OR PAIN FLAG -> COACH REVIEW (Red)
  if (activeInjury || painFlag || painLevel >= 5) {
    readiness = "COACH REVIEW";
    statusColor = "red";
    score = activeInjury ? 30 : Math.max(20, 60 - painLevel * 6);
    primaryFocus = activeInjury ? "Injury Rehabilitation" : "Pain Management & Review";
    reason = activeInjury
      ? `Active rehabilitation stage in progress (${activeInjuryRecord.title || "Active Injury"}). Review readiness with your coach or clinician.`
      : `Pain reported (${painArea}, level ${painLevel}/10). Consult coach/trainer before high-load training.`;
    recommendation =
      "Review today's session with your coach or trainer before undertaking high-load activity.";
  }
  // 2. INSUFFICIENT BASELINE -> LIMITED DATA (Gray)
  else if (!hasBaseline) {
    readiness = "LIMITED DATA";
    statusColor = "gray";
    score = 60;
    primaryFocus = "Establish Baseline";
    reason = `Insufficient personal baseline data. At least 3 previous daily check-ins are required to establish your personal tracking baseline (currently recorded: ${baselineCount} previous check-in${baselineCount === 1 ? "" : "s"}).`;
    recommendation =
      "Complete daily recovery check-ins to build a reliable personal baseline for fatigue, sleep, and training readiness monitoring.";
  }
  // 3. SIGNIFICANT DEVIATIONS -> RECOVERY PRIORITY (Orange)
  else {
    const sleep = todayLog?.sleepDuration ?? baseline.sleepDuration;
    const fatigue = todayLog?.fatigue ?? baseline.fatigue;
    const soreness = todayLog?.soreness ?? baseline.soreness;
    const stress = todayLog?.stress ?? baseline.stress;

    if (
      fatigue >= baseline.fatigue + 2.5 ||
      fatigue >= 8 ||
      sleep <= baseline.sleepDuration - 2.0 ||
      sleep <= 5.0 ||
      soreness >= 7 ||
      stress >= 8 ||
      acwr > 1.50
    ) {
      readiness = "RECOVERY PRIORITY";
      statusColor = "orange";
      score = 45;
      primaryFocus = "Rest & Regeneration";
      reason = `Fatigue (${fatigue}/10), soreness (${soreness}/10), stress (${stress}/10), or sleep (${sleep}h vs ${baseline.sleepDuration}h avg) significantly deviates from your recent personal baseline.`;
      recommendation =
        "Prioritize parasympathetic recovery, hydration, and light active recovery instead of high-intensity training.";
    }
    // 4. MODERATE DEVIATIONS -> READY WITH CAUTION (Yellow)
    else if (
      fatigue >= baseline.fatigue + 1.2 ||
      fatigue >= 6 ||
      sleep <= baseline.sleepDuration - 1.0 ||
      soreness >= 5 ||
      stress >= 6
    ) {
      readiness = "READY WITH CAUTION";
      statusColor = "yellow";
      score = 75;
      primaryFocus = "Warm-up Quality & Hydration";
      reason = `Minor fatigue (${fatigue}/10), sleep (${sleep}h vs ${baseline.sleepDuration}h avg), or soreness (${soreness}/10) deviation relative to your recent personal baseline.`;
      recommendation =
        "Proceed with planned training, focusing on warm-up quality, hydration, and movement mechanics.";
    }
    // 5. OPTIMAL RANGES -> READY (Green)
    else {
      readiness = "READY";
      statusColor = "green";
      score = 92;
      primaryFocus = "Planned Sprint Session";
      reason = "Recovery, sleep, and fatigue indicators are within your recent personal baseline ranges.";
      recommendation =
        "Recovery indicators are within your recent personal baseline. Follow the planned session if appropriate and consult coach/professional guidance.";
    }
  }

  return {
    readiness,
    status: readiness,
    statusColor,
    reason,
    reasons: reason ? [reason] : [],
    recommendation,
    todayLog,
    latestLog: todayLog,
    baseline: baseline
      ? {
          ...baseline,
          avgSleep: baseline.sleepDuration,
          avgFatigue: baseline.fatigue,
          avgSoreness: baseline.soreness,
          avgStress: baseline.stress,
          avgGeneralRecovery: baseline.generalRecovery,
        }
      : null,
    hasBaseline,
    baselineCount,
    logCount,
    hasPainFlag: Boolean(painFlag || painLevel >= 5 || activeInjury),
    acwr,
    score,
    primaryFocus,
    trends,
    updatedAt: new Date().toISOString(),
  };
}
export function plan(p, s) {
  const limited = s.risk !== "No flags reported",
    adaptive = p.classification && p.classification !== "Open",
    days = p.competitionDate
      ? Math.ceil((Date.parse(p.competitionDate) - Date.now()) / 86400000)
      : null,
    taper = days !== null && days >= 0 && days <= 7;
  const duration = limited
    ? 15
    : taper
      ? 25
      : s.sessions < 3 || s.workload > 2500
        ? 30
        : 45;
  return [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ].map((day, i) => ({
    day,
    title:
      i === 3 || i === 6
        ? "Rest & reflection"
        : limited
          ? "Recovery check-in"
          : i % 2 === 0
            ? `${p.sport || "Sport"} technique`
            : "Strength & mobility",
    duration: i === 3 || i === 6 ? 0 : duration,
    done: false,
    detail:
      i === 3 || i === 6
        ? "Record wellbeing and review the week."
        : limited
          ? "Only activity already approved by your clinician. Record symptoms; do not advance rehab automatically."
          : adaptive
            ? `Review classification-appropriate drills with your qualified coach. Available equipment: ${p.equipment}. Keep effort comfortable.`
            : taper
              ? `Competition is within one week. Keep ${p.event} drills light and familiar. Confirm your taper with your coach.`
              : i % 2 === 0
                ? `10 min warm-up, ${duration - 20} min controlled ${p.event || "sport"} technique, 10 min cool-down. Use ${p.equipment || "open ground"}. Target: ${p.target || "consistency"}.`
                : (p.equipment || "").toLowerCase().includes("band")
                  ? "Warm up, practice controlled band resistance work, then mobility. Keep repetitions comfortable."
                  : "Warm up, perform comfortable bodyweight strength drills, and finish with mobility. No gym needed.",
  }));
}
export function match(p, o) {
  const reasons = [],
    blockers = [],
    years = age(p.birthDate);
  if (o.sport === "All sports" || o.sport === p.sport)
    reasons.push("Sport matches");
  else blockers.push("Different sport");
  if (years === null) blockers.push("Add date of birth");
  else if (years >= o.minAge && years <= o.maxAge) reasons.push("Age eligible");
  else blockers.push("Outside age range");
  if (!o.classification || o.classification === p.classification)
    reasons.push("Classification eligible");
  else blockers.push("Classification does not match");
  if (o.location === "All India" || o.location === p.state)
    reasons.push("Location matches");
  if (o.event && o.event !== p.event) blockers.push("Different event");
  if (o.minResult || o.maxResult) {
    if (!p.bestMetric || o.unit !== p.unit)
      blockers.push("Add a result in the required unit");
    else if (
      (o.minResult && p.bestMetric < o.minResult) ||
      (o.maxResult && p.bestMetric > o.maxResult)
    )
      blockers.push("Performance threshold not met");
    else reasons.push("Performance threshold met");
  }
  if (Date.parse(o.deadline + "T23:59:59") < Date.now())
    blockers.push("Deadline passed");
  return {
    ...o,
    reasons,
    blockers,
    eligible: !blockers.length,
    match: Math.round(
      (reasons.length / (o.minResult || o.maxResult ? 5 : 4)) * 100,
    ),
  };
}

/**
 * Generates unified cross-module athlete monitoring context
 * Respects user roles and server-side consent rules (shareHealth, sharePerformance)
 */
export async function getConsolidatedAthleteContext(db, athleteId, requestingUser = null) {
  const profileRaw = await db.get("profiles", athleteId);
  if (!profileRaw && requestingUser && requestingUser.id !== athleteId) {
    return { error: "Athlete profile not found", status: 404 };
  }
  const profile = normalizeProfile(profileRaw || {});

  // Server-side Role & Access Authorization
  if (requestingUser) {
    const isOwner = requestingUser.id === athleteId;
    const isAdmin = requestingUser.role === "admin";
    const isAssignedCoach =
      requestingUser.role === "coach" &&
      Boolean(
        profile.coachId &&
          (profile.coachId === requestingUser.id ||
            profile.coachId.toLowerCase() === requestingUser.email?.toLowerCase()),
      );
    const isAssignedMedical =
      requestingUser.role === "medical" &&
      Boolean(
        profile.coachId &&
          (profile.coachId === requestingUser.id ||
            profile.coachId.toLowerCase() === requestingUser.email?.toLowerCase()),
      );

    if (!isOwner && !isAdmin && !isAssignedCoach && !isAssignedMedical) {
      return {
        error: "Access denied. You are not authorized to view this athlete context.",
        status: 403,
      };
    }
  }

  const isSelfOrAdmin = !requestingUser || requestingUser.id === athleteId || requestingUser.role === "admin";
  const shareHealth = Boolean(profile.shareHealth) || isSelfOrAdmin;
  const sharePerformance = Boolean(profile.sharePerformance) || isSelfOrAdmin;

  const sessions = sharePerformance ? ((await db.list("sessions", { ownerId: athleteId })) || []) : [];
  sessions.sort((a, b) =>
    (b.date || b.trainingDate || "").localeCompare(a.date || a.trainingDate || ""),
  );

  const recoveryLogs = shareHealth ? ((await db.list("recovery_logs", { ownerId: athleteId })) || []) : [];
  const injuries = shareHealth ? ((await db.list("injuries", { ownerId: athleteId })) || []) : [];
  const files = (await db.list("files", { ownerId: athleteId })) || [];
  const achievements = sharePerformance ? ((await db.list("achievements", { ownerId: athleteId })) || []) : [];
  const plans = sharePerformance ? ((await db.list("plans", { athleteId: athleteId })) || []) : [];

  const allRecordsList = [
    ...sessions.map((s) => ({ ...s, kind: "sessions" })),
    ...injuries.map((i) => ({ ...i, kind: "injuries" })),
    ...achievements.map((a) => ({ ...a, kind: "achievements" })),
  ];

  const readiness = calculateRecoveryReadiness(allRecordsList, recoveryLogs);

  // VideoLab clips (filtered by consent / review request)
  const videoFiles = files.filter((f) => {
    if (!f.mime || !f.mime.startsWith("video/")) return false;
    if (isSelfOrAdmin) return true;
    if (f.requestCoachReview) return true;
    return sharePerformance;
  });
  const analysedVideos = videoFiles.filter((f) => f.analysis);
  const latestVideo = analysedVideos[0] || videoFiles[0] || null;

  // Recent Workload & ACWR
  const now = Date.now();
  const last7Days = sessions.filter((s) => Date.parse(s.date || s.trainingDate || 0) >= now - 7 * 86400000);
  const last28Days = sessions.filter((s) => Date.parse(s.date || s.trainingDate || 0) >= now - 28 * 86400000);

  const acute7dLoad = last7Days.reduce((acc, s) => acc + (s.duration || 60) * (s.effort || 7), 0);
  const chronic28dLoad = last28Days.length
    ? (last28Days.reduce((acc, s) => acc + (s.duration || 60) * (s.effort || 7), 0) / 4)
    : acute7dLoad || 1;
  const acwr = Number((acute7dLoad / Math.max(1, chronic28dLoad)).toFixed(2));

  // Cross-module alerts collection
  const alerts = [];

  if (shareHealth) {
    const activeInjuries = injuries.filter((i) => i.stage !== "Return to play");
    if (activeInjuries.length > 0) {
      alerts.push({
        type: "danger",
        category: "safety",
        title: "Active Rehabilitation Stage",
        message: `Active injury recorded (${activeInjuries[0].title}). Medical clearance required.`,
      });
    } else if (readiness.todayLog?.painFlag) {
      alerts.push({
        type: "danger",
        category: "safety",
        title: "Pain Reported",
        message: `Pain reported in ${readiness.todayLog.painArea || "body area"} (level ${readiness.todayLog.painLevel}/10).`,
      });
    }

    if (readiness.readiness === "RECOVERY PRIORITY" || readiness.readiness === "COACH REVIEW") {
      alerts.push({
        type: "warning",
        category: "recovery",
        title: "Low Readiness Indicator",
        message: readiness.reason,
      });
    }
  }

  if (sharePerformance && acwr > 1.50) {
    alerts.push({
      type: "warning",
      category: "workload",
      title: "Workload Spike Detected (ACWR > 1.50)",
      message: `ACWR ratio is ${acwr}. Elevated fatigue or injury risk context.`,
    });
  }

  const reviewReqVideo = videoFiles.find((f) => f.requestCoachReview);
  if (reviewReqVideo) {
    alerts.push({
      type: "info",
      category: "video",
      title: "Technique Review Requested",
      message: `Athlete requested coach review on clip '${reviewReqVideo.name}'.`,
    });
  }

  const daysToCompetition = (sharePerformance && profile.competitionDate)
    ? Math.max(0, Math.round((Date.parse(profile.competitionDate) - now) / 86400000))
    : null;

  return {
    athlete: {
      id: athleteId,
      name: profile.name,
      sport: profile.sport,
      event: profile.event,
      unit: profile.unit,
      gender: profile.gender,
      birthDate: profile.birthDate,
      state: profile.state,
      district: profile.district,
      competitionDate: sharePerformance ? profile.competitionDate : null,
      daysToCompetition,
      coachId: profile.coachId,
      shareHealth: profile.shareHealth,
      sharePerformance: profile.sharePerformance,
    },
    readiness: shareHealth ? readiness : { readiness: readiness.readiness, statusColor: readiness.statusColor },
    training: sharePerformance
      ? {
          activePlan: plans.find((p) => p.status === "active" || p.status === "published") || plans[0] || null,
          adherence: Math.min(100, Math.round((last7Days.length / 4) * 100)),
          acute7dLoad,
          chronic28dLoad: Math.round(chronic28dLoad),
          acwr,
          totalSessions: sessions.length,
          lastSession: sessions[0] || null,
        }
      : { totalSessions: 0, adherence: null },
    performance: sharePerformance
      ? {
          currentPB: profile.target ? sessions.find((s) => s.event === profile.event)?.metric : null,
          target: profile.target,
          achievementsCount: achievements.length,
        }
      : { currentPB: null, target: null, achievementsCount: 0 },
    recovery: shareHealth
      ? {
          latestCheckIn: readiness.todayLog,
          baseline: readiness.baseline,
          trends: readiness.trends,
          activeInjuries: injuries.filter((i) => i.stage !== "Return to play"),
        }
      : { latestCheckIn: null, activeInjuries: [] },
    video: {
      totalVideos: videoFiles.length,
      latestVideo,
      reviewRequestedCount: videoFiles.filter((f) => f.requestCoachReview).length,
    },
    alerts,
    updatedAt: new Date().toISOString(),
  };
}

