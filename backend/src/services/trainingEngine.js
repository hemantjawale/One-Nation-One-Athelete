import { calculateAge } from "./sports.js";
import { EXERCISE_LIBRARY, SPRINT_QUALITIES } from "./trainingKnowledge.js";

/**
 * Game-like Level Definitions for Sprint Roadmap (Levels 1 to 6)
 */
export const SPRINT_ROADMAP_LEVELS = [
  {
    level: 1,
    id: "foundation",
    name: "Foundation",
    title: "Level 1 — Foundation",
    focus: "Running mechanics, general strength, mobility & basic acceleration",
    objective: "Establish fundamental movement quality, posture alignment, and basic force production capacity.",
    entryCriteria: "Initial athlete onboarding, baseline health clearance & athletic profile creation.",
    progressionCriteria: "Complete 8+ foundation sessions with consistent posture and pain-free execution.",
    measurableOutcomes: ["Standing Broad Jump >= 2.00m", "10m Falling Start <= 2.10s"],
    recommendedQualities: ["acceleration", "technique_drills", "strength", "mobility_recovery"],
    exitCriteria: "Demonstrated sprint mechanics retention and zero acute pain flags.",
    checklist: [
      "Running mechanics & posture drills",
      "General strength & bodyweight force",
      "Joint mobility & ankle stiffness",
      "Basic acceleration posture (0–10m)",
    ],
    minSessionsRequired: 10,
    requiredTesting: ["10m Falling Start", "Standing Broad Jump"],
  },
  {
    level: 2,
    id: "acceleration",
    name: "Acceleration",
    title: "Level 2 — Acceleration Development",
    focus: "Start mechanics, 0–20m horizontal drive & force projection",
    objective: "Master horizontal force orientation, low shin angles, and explosive first 3 strides.",
    entryCriteria: "Level 1 exit criteria met; pain-free movement baseline.",
    progressionCriteria: "Log 12+ acceleration-focused sessions with 3-point start proficiency.",
    measurableOutcomes: ["20m 3-Point Start <= 3.30s", "10m Acceleration Split improvement"],
    recommendedQualities: ["acceleration", "reaction_start", "power_plyometrics", "strength"],
    exitCriteria: "Consistent 20m drive phase without early trunk pop-up.",
    checklist: [
      "10m & 20m falling starts",
      "3-point start mechanics",
      "Horizontal force projection",
      "Resisted acceleration drills",
    ],
    minSessionsRequired: 15,
    requiredTesting: ["20m 3-Point Start", "30m Acceleration"],
  },
  {
    level: 3,
    id: "max_velocity",
    name: "Maximum Velocity",
    title: "Level 3 — Maximum Velocity",
    focus: "Upright mechanics, flying sprints, vertical stiffness & relaxation",
    objective: "Maximize top-speed mechanics, ankle stiffness, and high-velocity muscle relaxation.",
    entryCriteria: "Level 2 completed; solid acceleration drive established.",
    progressionCriteria: "Complete 16+ high-velocity exposures with flying 20m evaluation.",
    measurableOutcomes: ["Flying 20m Sprint <= 2.25s", "Ankle stiffness retention"],
    recommendedQualities: ["maximum_velocity", "power_plyometrics", "technique_drills"],
    exitCriteria: "Upright mechanics stability during 20m fly segment.",
    checklist: [
      "Flying 20m sprints",
      "Wicket / mini-hurdle runs",
      "Reactive ankle stiffness (pogo hops)",
      "High-speed relaxation drills",
    ],
    minSessionsRequired: 20,
    requiredTesting: ["Flying 20m Sprint"],
  },
  {
    level: 4,
    id: "speed_endurance",
    name: "Speed Endurance",
    title: "Level 4 — Speed Endurance",
    focus: "60–120m velocity maintenance under lactic fatigue",
    objective: "Sustain sprint mechanics and velocity across 60–120m repetitions under glycolytic load.",
    entryCriteria: "Level 3 completed; established max velocity baseline.",
    progressionCriteria: "Complete 20+ speed endurance exposures with target split consistency.",
    measurableOutcomes: ["60m Time Trial <= 7.40s", "100m deceleration gap reduction"],
    recommendedQualities: ["speed_endurance", "maximum_velocity", "recovery_mobility"],
    exitCriteria: "Mechanics retention through 80m+ under fatigue.",
    checklist: [
      "60m–120m sprint repetitions",
      "Mechanics retention under metabolic fatigue",
      "Relaxation & pacing distribution",
      "Recovery buffering protocols",
    ],
    minSessionsRequired: 25,
    requiredTesting: ["60m Sprint", "100m Time Trial"],
  },
  {
    level: 5,
    id: "competition_prep",
    name: "Competition Preparation",
    title: "Level 5 — Competition Preparation",
    focus: "Block starts, race modeling, neurological readiness & taper",
    objective: "Refine race execution, starting block mechanics, and tune volume for competitive peaking.",
    entryCriteria: "Level 4 completed; competition within 4–6 weeks.",
    progressionCriteria: "Execute race simulation & block exit trials under timing conditions.",
    measurableOutcomes: ["Block Start Reaction <= 0.16s", "Race Model execution score >= 85%"],
    recommendedQualities: ["competition_prep", "reaction_start", "acceleration", "recovery_mobility"],
    exitCriteria: "Taper protocol completion & full race readiness.",
    checklist: [
      "Starting block exit & reaction",
      "Full race modeling & segment splits",
      "Neurological readiness & taper",
      "Recovery & mental readiness",
    ],
    minSessionsRequired: 30,
    requiredTesting: ["Block Start 30m", "Competition Simulation"],
  },
  {
    level: 6,
    id: "competition_peak",
    name: "Competition Peak",
    title: "Level 6 — Championship Peak",
    focus: "Target performance execution & post-season analysis",
    objective: "Peak at target championship meet and transition smoothly into active recovery cycle.",
    entryCriteria: "Level 5 completed; official competition scheduled within 7 days.",
    progressionCriteria: "Compete at target championship meet; verify official mark.",
    measurableOutcomes: ["Official Competition Personal Best", "State / National benchmark rank"],
    recommendedQualities: ["competition_prep", "recovery_mobility"],
    exitCriteria: "Post-season debrief & next macrocycle transition.",
    checklist: [
      "Championship race execution",
      "Target performance verification",
      "Post-competition debrief",
      "Transition & active rest",
    ],
    minSessionsRequired: 35,
    requiredTesting: ["Official Competition Mark"],
  },
];

export class TrainingEngine {
  constructor(db) {
    this.db = db;
  }

  /**
   * Builds an objective athlete training profile considering age, maturity,
   * experience, and current performance metrics.
   */
  getAthleteTrainingProfile(athlete, sessions = [], injuries = []) {
    const age = calculateAge(athlete.birthDate) ?? 18;
    const sessionCount = sessions.length;

    // Experience classification
    let experienceLevel = "beginner";
    if (age >= 15 && sessionCount >= 12) experienceLevel = "intermediate";
    if (age >= 18 && sessionCount >= 30) experienceLevel = "advanced";

    // Measured personal best for current event
    const lower = athlete.unit === "sec";
    const matchingSessions = sessions.filter(
      (s) => s.event === athlete.event && s.unit === athlete.unit && s.metric > 0,
    );
    const currentPB = matchingSessions.length
      ? (lower ? Math.min : Math.max)(...matchingSessions.map((s) => s.metric))
      : null;

    const target = athlete.target || null;
    const goalGap =
      currentPB !== null && target !== null
        ? Number((lower ? currentPB - target : target - currentPB).toFixed(2))
        : null;

    // Active injury flags
    const activeInjuries = injuries.filter(
      (i) => i.stage && i.stage !== "Return to play",
    );
    const recentPain = sessions
      .slice(-5)
      .some((s) => Number(s.pain) >= 5);
    const injuryFlag = activeInjuries.length > 0 || recentPain;

    // Competition timeline
    let weeksToCompetition = null;
    if (athlete.competitionDate) {
      const compTime = new Date(athlete.competitionDate).getTime();
      const diffMs = compTime - Date.now();
      if (diffMs > 0) {
        weeksToCompetition = Math.max(1, Math.round(diffMs / (7 * 24 * 60 * 60 * 1000)));
      }
    }

    return {
      athleteId: athlete.id,
      age,
      experienceLevel,
      event: athlete.event || "100m",
      sport: athlete.sport || "Athletics",
      currentPB,
      target,
      goalGap,
      weeksToCompetition,
      sessionCount,
      injuryFlag,
      activeInjuriesCount: activeInjuries.length,
      coachAssigned: Boolean(athlete.coachId),
    };
  }

  /**
   * Calculates the Sprint Journey Roadmap progression based on REAL objective criteria
   */
  calculateRoadmap(athlete, sessions = [], plans = [], injuries = []) {
    const profile = this.getAthleteTrainingProfile(athlete, sessions, injuries);
    const completedSessions = sessions.length;

    // Determine current level based on completed sessions, tests, and experience
    let currentLevelNum = 1;
    if (completedSessions >= 8 && profile.currentPB !== null) currentLevelNum = 2;
    if (completedSessions >= 18 && profile.experienceLevel !== "beginner") currentLevelNum = 3;
    if (completedSessions >= 28 && profile.goalGap !== null && profile.goalGap < 0.8) currentLevelNum = 4;
    if (profile.weeksToCompetition && profile.weeksToCompetition <= 4) currentLevelNum = 5;

    const currentLevelConfig =
      SPRINT_ROADMAP_LEVELS.find((l) => l.level === currentLevelNum) ||
      SPRINT_ROADMAP_LEVELS[0];

    // Compute progress % within the current level based on sessions in level & test metrics
    const sessionsInCurrentLevel = Math.max(0, completedSessions - (currentLevelConfig.minSessionsRequired - 8));
    const levelTargetSessions = 8;
    const sessionProgress = Math.min(100, Math.round((sessionsInCurrentLevel / levelTargetSessions) * 100));

    const levelsWithStatus = SPRINT_ROADMAP_LEVELS.map((lvl) => {
      const isComplete = lvl.level < currentLevelNum;
      const isCurrent = lvl.level === currentLevelNum;
      const isLocked = lvl.level > currentLevelNum;

      return {
        ...lvl,
        criteria: lvl.checklist,
        status: isComplete ? "completed" : isCurrent ? "active" : "locked",
        progressPercentage: isComplete ? 100 : isCurrent ? sessionProgress : 0,
      };
    });

    return {
      sport: "Athletics",
      discipline: "Track - Sprint",
      event: profile.event,
      currentLevel: currentLevelNum,
      currentLevelName: currentLevelConfig.name,
      currentLevelTitle: currentLevelConfig.title,
      currentLevelFocus: currentLevelConfig.focus,
      levelProgressPercentage: sessionProgress,
      levels: levelsWithStatus,
      injuryHold: profile.injuryFlag,
    };
  }

  /**
   * Gets or initializes Year and Month Goals for the athlete
   */
  async getGoals(athleteId, profile, sessions = []) {
    const existing = await this.db.get("training_goals", athleteId);
    if (existing) return existing;

    // Initialize defaults based on athlete's profile and current PB
    const currentPB = profile.currentPB || 12.21;
    const target = profile.target || 11.70;
    const yearTarget = target;
    const currentYear = new Date().getFullYear();

    // Quantitative monthly targets for sprint acceleration
    const currentMonthName = new Date().toLocaleString("default", { month: "long" });

    const defaultGoals = {
      id: athleteId,
      ownerId: athleteId,
      yearGoal: {
        year: currentYear,
        event: profile.event || "100m",
        startingPB: currentPB,
        currentPB: currentPB,
        targetPB: yearTarget,
        targetCompetition: "State Junior Athletics Championship",
        targetDate: profile.weeksToCompetition
          ? new Date(Date.now() + profile.weeksToCompetition * 7 * 86400000).toISOString().slice(0, 10)
          : `${currentYear}-10-25`,
        progressPercentage: 0,
      },
      monthGoal: {
        month: currentMonthName,
        year: currentYear,
        primaryObjective: "Improve 0–20m horizontal acceleration & start mechanics",
        secondaryObjective: "Enhance reactive lower-body power & ankle stiffness",
        targetMetricName: "10m Acceleration",
        startingMetricValue: 2.05,
        targetMetricValue: 1.98,
        currentMetricValue: 2.02,
        unit: "sec",
        secondaryMetricName: "Standing Broad Jump",
        secondaryTargetValue: 2.45,
        secondaryCurrentValue: 2.38,
        secondaryUnit: "m",
        status: "In Progress", // "In Progress" | "Achieved" | "Partially achieved" | "Behind schedule"
        evaluationNotes: "Acceleration mechanics improving with positive shin angle retention.",
      },
      updatedAt: new Date().toISOString(),
    };

    await this.db.put("training_goals", defaultGoals);
    return defaultGoals;
  }

  /**
   * Generates or fetches the active Weekly Plan for the athlete.
   * If Coach created a plan, respects coach plan with versioning and priority!
   * Otherwise generates an evidence-informed adaptive plan based on previous week.
   */
  async getOrCreateWeeklyPlan({ athlete, weekStartDate = null, publishedOnly = false }) {
    // If weekStartDate is not explicitly specified, check for athlete's latest active/published plan
    if (!weekStartDate) {
      let allPlans = (await this.db.list("plans", { athleteId: athlete.id })) || [];
      if (publishedOnly) {
        allPlans = allPlans.filter((p) => p.status !== "draft");
      }
      const sortedPlans = allPlans.sort((a, b) =>
        (b.weekStart || "").localeCompare(a.weekStart || ""),
      );
      if (sortedPlans.length > 0) {
        return sortedPlans[0];
      }
    }

    // Determine target Monday for the week
    const now = new Date();
    const monday = weekStartDate
      ? new Date(weekStartDate)
      : this.getMondayOfWeek(now);
    const weekStartStr = monday.toISOString().slice(0, 10);

    const planId = `plan-${athlete.id}-${weekStartStr}`;
    const existing = await this.db.get("plans", planId);
    if (existing) {
      if (publishedOnly && existing.status === "draft") {
        // Return active fallback or wait for publication
      } else {
        return existing;
      }
    }

    // Gather athlete context, sessions, and previous plan for adaptive generation
    const sessions = await this.db.list("sessions", { ownerId: athlete.id });
    const injuries = await this.db.list("injuries", { ownerId: athlete.id });
    const profile = this.getAthleteTrainingProfile(athlete, sessions, injuries);

    // Look for previous week's plan to adapt from
    const prevMonday = new Date(monday.getTime() - 7 * 86400000);
    const prevPlanId = `plan-${athlete.id}-${prevMonday.toISOString().slice(0, 10)}`;
    const previousPlan = await this.db.get("plans", prevPlanId);

    // Generate Adaptive Plan
    const adaptivePlan = this.generateAdaptiveWeeklyPlan({
      athlete,
      profile,
      weekStart: weekStartStr,
      monday,
      previousPlan,
      sessions,
    });

    await this.db.put("plans", adaptivePlan);
    return adaptivePlan;
  }

  /**
   * Generates a research-informed weekly plan adapted from previous week results
   */
  generateAdaptiveWeeklyPlan({ athlete, profile, weekStart, monday, previousPlan, sessions }) {
    // Evaluate previous week adherence and safety
    let prevAdherence = 1.0;
    let hadPain = profile.injuryFlag;
    let performanceImproving = true;

    if (previousPlan?.days) {
      const completedCount = previousPlan.days.filter((d) => d.status === "completed").length;
      prevAdherence = completedCount / previousPlan.days.length;
      hadPain = hadPain || previousPlan.days.some((d) => d.athleteCompletion?.painFlag);
    }

    const weekEnd = new Date(monday.getTime() + 6 * 86400000).toISOString().slice(0, 10);
    const isYouth = profile.age < 16;
    const isTaper = profile.weeksToCompetition && profile.weeksToCompetition <= 2;

    const days = [
      {
        dayIndex: 0,
        dayOfWeek: "Monday",
        date: this.addDays(monday, 0),
        sessionType: "Acceleration Development",
        objective: "0–20m acceleration mechanics, falling starts & horizontal force projection",
        expectedDuration: isYouth ? 45 : 60,
        targetIntensity: 95,
        status: "scheduled",
        warmup: [
          "Dynamic hip & ankle mobility flow (10 min)",
          "A-Skip and calf dribble drills (2 x 20m)",
          "Progressive 30m buildups (2 reps)",
        ],
        exercises: [
          {
            name: "10m Falling Starts",
            sets: isYouth ? 3 : 4,
            reps: 1,
            distance: "10m",
            targetIntensity: "100%",
            rest: "90 sec",
            coachingCues: "Lean until gravity forces first strike. Strike back under hips.",
          },
          {
            name: "20m 3-Point Stance Acceleration",
            sets: isYouth ? 3 : 4,
            reps: 1,
            distance: "20m",
            targetIntensity: "98%",
            rest: "2 min",
            coachingCues: "Drive violently off front pedal. Keep eyes forward on track.",
          },
          {
            name: "Ankle Pogo Hops",
            sets: 3,
            reps: 12,
            distance: "In place",
            targetIntensity: "High",
            rest: "60 sec",
            coachingCues: "Keep ankles stiff; minimal ground contact time.",
          },
        ],
        cooldown: ["Gentle walking flush (5 min)", "Calf and hamstring active stretches"],
        coachNotes: hadPain
          ? "Safety notice: Athlete reported prior soreness. Keep volume controlled."
          : "Focus on explosive first 3 strides.",
      },
      {
        dayIndex: 1,
        dayOfWeek: "Tuesday",
        date: this.addDays(monday, 1),
        sessionType: "Sprint Strength & Core",
        objective: "Posterior chain strength, single-leg stability & core bracing",
        expectedDuration: isYouth ? 40 : 50,
        targetIntensity: 80,
        status: "scheduled",
        warmup: ["Glute bridge activation", "Hip airplanes & bird-dogs"],
        exercises: [
          {
            name: isYouth ? "Goblet Box Squats" : "Back Squats / Box Squats",
            sets: 3,
            reps: isYouth ? 8 : 5,
            distance: "N/A",
            targetIntensity: isYouth ? "Moderate" : "75% 1RM",
            rest: "2 min",
            coachingCues: "Brace core tight, drive up through mid-foot explosively.",
          },
          {
            name: "Nordic Hamstring Curls (Assisted)",
            sets: 3,
            reps: 4,
            distance: "N/A",
            targetIntensity: "Controlled eccentric",
            rest: "90 sec",
            coachingCues: "Control the falling phase as slowly as possible.",
          },
          {
            name: "Standing Broad Jump",
            sets: 3,
            reps: 2,
            distance: "Max effort",
            targetIntensity: "100%",
            rest: "90 sec",
            coachingCues: "Hinge hips back, explode horizontally forward.",
          },
        ],
        cooldown: ["Hamstring static stretch", "Foam rolling quads & calves"],
        coachNotes: "Emphasize movement quality over heavy loading.",
      },
      {
        dayIndex: 2,
        dayOfWeek: "Wednesday",
        date: this.addDays(monday, 2),
        sessionType: "Active Recovery & Mobility",
        objective: "Tissue restoration, parasympathetic recovery & mobility",
        expectedDuration: 30,
        targetIntensity: 30,
        status: "scheduled",
        warmup: ["Deep diaphragmatic breathing (5 min)"],
        exercises: [
          {
            name: "Active Recovery Flush & Foam Rolling",
            sets: 1,
            reps: 1,
            distance: "20 min",
            targetIntensity: "Low",
            rest: "N/A",
            coachingCues: "Light walk, gentle rolling on soft tissue, avoid straining.",
          },
          {
            name: "Dynamic Hip & Ankle Mobility Flow",
            sets: 1,
            reps: 1,
            distance: "10 min",
            targetIntensity: "Gentle",
            rest: "N/A",
            coachingCues: "Open thoracic spine, stretch hip flexors with glute squeeze.",
          },
        ],
        cooldown: ["Full body relaxation"],
        coachNotes: "Hydrate and prioritize 8+ hours sleep.",
      },
      {
        dayIndex: 3,
        dayOfWeek: "Thursday",
        date: this.addDays(monday, 3),
        sessionType: "Maximum Velocity",
        objective: "Upright mechanics, flying sprints & high-speed relaxation",
        expectedDuration: isYouth ? 45 : 60,
        targetIntensity: 98,
        status: "scheduled",
        warmup: ["Dynamic sprint warmup", "High knee A-runs (2 x 30m)", "Buildup runs (2 x 40m)"],
        exercises: [
          {
            name: "Wicket / Mini-Hurdle Stride Runs",
            sets: 3,
            reps: 1,
            distance: "30m",
            targetIntensity: "90%",
            rest: "2 min",
            coachingCues: "Run tall with front-side knee elevation; do not clip wickets.",
          },
          {
            name: "Flying 20m Sprint (20m buildup + 20m fly)",
            sets: isYouth ? 2 : 3,
            reps: 1,
            distance: "20m fly",
            targetIntensity: "100%",
            rest: "4 min",
            coachingCues: "Build smoothly, hit the flying zone tall, relax shoulders & face.",
          },
        ],
        cooldown: ["5 min walk", "Hamstring & hip flexor stretches"],
        coachNotes: "Quality over quantity. Full recovery between all flying reps.",
      },
      {
        dayIndex: 4,
        dayOfWeek: "Friday",
        date: this.addDays(monday, 4),
        sessionType: "Power & Plyometrics",
        objective: "Elastic reactive power, horizontal force & sprint transfer",
        expectedDuration: isYouth ? 40 : 50,
        targetIntensity: 85,
        status: "scheduled",
        warmup: ["Dynamic warmup", "Linear skips for height & distance (2 x 20m)"],
        exercises: [
          {
            name: "Consecutive Double Broad Jump",
            sets: 3,
            reps: 2,
            distance: "Max distance",
            targetIntensity: "100%",
            rest: "90 sec",
            coachingCues: "Land and immediately rebound forward with minimal delay.",
          },
          {
            name: "Medicine Ball Forward Chest Pass / Overhead Throw",
            sets: 4,
            reps: 3,
            distance: "Max throw",
            targetIntensity: "Explosive",
            rest: "60 sec",
            coachingCues: "Triple extension from ankles, knees, hips through upper body.",
          },
        ],
        cooldown: ["Light walk & breathing"],
        coachNotes: "Maintain high nervous system freshness.",
      },
      {
        dayIndex: 5,
        dayOfWeek: "Saturday",
        date: this.addDays(monday, 5),
        sessionType: isTaper ? "Pre-Race Activation" : "Speed Endurance / Event Specific",
        objective: isTaper
          ? "Race rehearsal, block exits & light nervous system tune-up"
          : "60–80m speed endurance retention without breaking form",
        expectedDuration: isTaper ? 35 : 45,
        targetIntensity: isTaper ? 85 : 95,
        status: "scheduled",
        warmup: ["Competition-style warm-up protocol (15 min)"],
        exercises: isTaper
          ? [
              {
                name: "10m Block Starts",
                sets: 2,
                reps: 1,
                distance: "10m",
                targetIntensity: "95%",
                rest: "3 min",
                coachingCues: "Sharp reaction to 'Go', explosive first two steps.",
              },
            ]
          : [
              {
                name: "80m Speed Endurance Reps",
                sets: 2,
                reps: 1,
                distance: "80m",
                targetIntensity: "95%",
                rest: "6 min",
                coachingCues: "Accelerate for 30m, hold rhythm tall for 50m without straining.",
              },
            ],
        cooldown: ["10 min walking flush", "Hydration & nutrition"],
        coachNotes: "Stay relaxed through the finish line.",
      },
      {
        dayIndex: 6,
        dayOfWeek: "Sunday",
        date: this.addDays(monday, 6),
        sessionType: "Weekly Review & Rest",
        objective: "Rest, evaluate adherence, review performance metrics & adapt next week",
        expectedDuration: 0,
        targetIntensity: 0,
        status: "scheduled",
        warmup: [],
        exercises: [],
        cooldown: [],
        coachNotes: "Review week adherence with coach. The system will adapt next week's plan.",
      },
    ];

    return {
      id: `plan-${athlete.id}-${weekStart}`,
      athleteId: athlete.id,
      coachId: athlete.coachId || null,
      weekStart,
      weekEnd,
      phase: profile.experienceLevel === "beginner" ? "Foundation" : "Acceleration Development",
      weeklyObjective: hadPain
        ? "Controlled volume stabilization and recovery management"
        : prevAdherence < 0.6
          ? "Adherence stabilization — focus on completing fundamental sprint exposures"
          : "0–20m acceleration mechanics and upright velocity exposure",
      source: "system", // "system" | "coach"
      version: 1,
      status: "active",
      days,
      review: {
        completedSessions: 0,
        totalPlannedSessions: 6,
        adherencePercentage: 0,
        performanceTrend: "Awaiting sessions",
        recoveryStatus: "Good",
        painReported: hadPain,
        recommendation: "Execute planned sessions with emphasis on technical execution.",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Athlete checks in on a daily session card with actual results, RPE, recovery, and pain flag
   */
  async checkInDailySession({ planId, dayIndex, checkinData, athleteId }) {
    const plan = await this.db.get("plans", planId);
    if (!plan) throw new Error("Training plan not found.");
    if (plan.athleteId !== athleteId) throw new Error("Unauthorized.");

    const day = plan.days.find((d) => d.dayIndex === Number(dayIndex));
    if (!day) throw new Error("Session day not found in plan.");

    const status = checkinData.status || "completed"; // "completed" | "partially_completed" | "missed"
    const rpe = Number(checkinData.rpe || 7);
    const recovery = checkinData.recovery || "Good";
    const painFlag = Boolean(checkinData.painFlag);
    const actualMetric = checkinData.actualMetric ? Number(checkinData.actualMetric) : null;
    const notes = checkinData.notes || "";
    const missedReason = status === "missed" ? checkinData.missedReason || "No time" : null;
    const actualSets = checkinData.actualSets !== undefined && checkinData.actualSets !== "" ? Number(checkinData.actualSets) : null;
    const actualReps = checkinData.actualReps !== undefined && checkinData.actualReps !== "" ? Number(checkinData.actualReps) : null;
    const actualDistance = checkinData.actualDistance || null;
    const actualTime = checkinData.actualTime || null;
    const actualExercises = Array.isArray(checkinData.actualExercises) ? checkinData.actualExercises : [];

    // Calculate Completion Score vs Performance Score
    let completionScore = 100;
    if (status === "partially_completed") completionScore = 60;
    if (status === "missed") completionScore = 0;

    let performanceScore = 100;
    if (status === "missed") {
      performanceScore = 0;
    } else if (actualMetric && day.exercises?.[0]) {
      // If time metric, lower is better; calculate ratio against target/baseline
      const targetTime = Number(day.exercises[0].targetTime || day.exercises[0].targetMetric || 0);
      if (targetTime > 0 && actualMetric > 0) {
        performanceScore = Math.min(100, Math.round((targetTime / actualMetric) * 100));
      } else {
        performanceScore = status === "completed" ? 95 : 70;
      }
    } else {
      performanceScore = status === "completed" ? 95 : 65;
    }

    day.status = status;
    day.athleteCompletion = {
      status,
      completedAt: new Date().toISOString(),
      rpe,
      recovery,
      painFlag,
      actualMetric,
      actualSets,
      actualReps,
      actualDistance,
      actualTime,
      actualExercises,
      completionScore,
      performanceScore,
      missedReason,
      notes,
    };
    day.completionScore = completionScore;
    day.performanceScore = performanceScore;

    // Synchronize to sessions history if session was attempted
    if (status === "completed" || status === "partially_completed") {
      const sessionDate = day.date || day.trainingDate || new Date().toISOString().slice(0, 10);
      const sessionId = `plan-sess-${plan.id}-${day.dayIndex}`;
      await this.db.put("sessions", {
        id: sessionId,
        ownerId: athleteId,
        title: day.sessionType || "Training Session",
        date: sessionDate,
        trainingDate: sessionDate,
        event: plan.phase || "100m",
        unit: "sec",
        duration: day.expectedDuration || 45,
        effort: rpe,
        metric: actualMetric || 0,
        pain: painFlag ? 6 : 0,
        fatigue: recovery === "Poor" ? 8 : recovery === "Moderate" ? 5 : 2,
        notes: notes || `Week session: ${day.sessionType}. RPE: ${rpe}/10. Recovery: ${recovery}.`,
        verified: false,
      });
    }

    // Recompute overall plan review statistics
    const completedDays = plan.days.filter((d) => d.status === "completed").length;
    const totalActiveDays = plan.days.filter((d) => d.sessionType !== "Weekly Review & Rest").length;
    const adherence = Math.round((completedDays / totalActiveDays) * 100);

    plan.review.completedSessions = completedDays;
    plan.review.totalPlannedSessions = totalActiveDays;
    plan.review.adherencePercentage = adherence;
    plan.review.painReported = plan.days.some((d) => d.athleteCompletion?.painFlag);

    if (painFlag) {
      plan.review.recommendation =
        "Pain or unusual soreness reported. Training load will not be increased. Please review with your coach or clinician.";
    }

    plan.updatedAt = new Date().toISOString();
    await this.db.put("plans", plan);

    return plan;
  }

  /**
   * Generates a Sunday Weekly Review and adaptation recommendation for the next week
   */
  async generateWeeklyReview(planId, athleteId) {
    const plan = await this.db.get("plans", planId);
    if (!plan || plan.athleteId !== athleteId) throw new Error("Plan not found or unauthorized.");

    const days = plan.days || [];
    const activeDays = days.filter((d) => d.expectedDuration > 0);
    const completed = activeDays.filter((d) => d.status === "completed").length;
    const missed = activeDays.filter((d) => d.status === "missed").length;
    const partial = activeDays.filter((d) => d.status === "partially_completed").length;
    const painReported = days.some((d) => d.athleteCompletion?.painFlag);

    const adherence = Math.round((completed / activeDays.length) * 100);
    const rpes = days
      .filter((d) => d.athleteCompletion?.rpe)
      .map((d) => d.athleteCompletion.rpe);
    const avgRpe = rpes.length ? Number((rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1)) : null;

    let trend = "Stable";
    let recommendation = "";

    if (painReported) {
      trend = "Attention Flagged";
      recommendation =
        "Athlete flagged pain or soreness. Do not automatically advance volume. Prioritize soft-tissue recovery and consult your coach.";
    } else if (adherence >= 80) {
      trend = "Improving";
      recommendation =
        "Strong adherence (80%+). Next week will introduce progressive volume in acceleration and flying sprints.";
    } else if (adherence >= 50) {
      trend = "Moderate Consistency";
      recommendation =
        "Moderate adherence. Maintain current workout complexity; avoid unnecessary volume jumps.";
    } else {
      trend = "Low Adherence";
      recommendation =
        "Adherence below 50%. The system will stabilize workloads to rebuild consistency before progressive overload.";
    }

    const review = {
      weekStart: plan.weekStart,
      weekEnd: plan.weekEnd,
      plannedSessions: activeDays.length,
      completedSessions: completed,
      missedSessions: missed,
      partialSessions: partial,
      adherencePercentage: adherence,
      adherenceScore: adherence,
      averageRPE: avgRpe,
      painReported,
      safetyAlert: painReported
        ? "Training Safety Alert: Athlete flagged physical symptoms or pain. Do not advance training load until evaluated by a qualified coach or medical professional."
        : null,
      performanceTrend: trend,
      recommendation,
      adaptationRecommendation: recommendation,
      evaluatedAt: new Date().toISOString(),
    };

    plan.review = review;
    plan.updatedAt = new Date().toISOString();
    await this.db.put("plans", plan);

    return review;
  }

  /**
   * Reality Check Analysis: Honest, evidence-backed evaluation without fake cheerleading
   */
  async generateRealityCheck(athlete, sessions = []) {
    const goals = await this.getGoals(athlete.id, this.getAthleteTrainingProfile(athlete, sessions));
    const profile = this.getAthleteTrainingProfile(athlete, sessions);
    const currentPB = profile.currentPB;
    const target = profile.target;
    const gap = profile.goalGap;

    const recentSessions = sessions.filter(
      (s) => Date.parse(s.date || s.trainingDate) >= Date.now() - 28 * 86400000,
    );
    const distinctDays = new Set(recentSessions.map((s) => s.date || s.trainingDate)).size;
    const adherenceRate = Math.min(100, Math.round((distinctDays / 16) * 100)); // Target 16 training days per month

    let status = "INSUFFICIENT DATA";
    let trend = "Insufficient testing data";
    let assessment = "";
    let recommendedAction = "";

    if (profile.injuryFlag) {
      status = "NEEDS ATTENTION";
      trend = "Safety Hold Flagged";
      assessment = "Pain or soreness reported in recent sessions. Automatic load progression is paused.";
      recommendedAction = "Review rehabilitation progress with your coach or clinician before advancing training volume.";
    } else if (gap === null || sessions.length < 3) {
      status = "INSUFFICIENT DATA";
      trend = "Insufficient testing data";
      assessment = "Log at least 3 training sessions and set a quantitative target to enable progress tracking.";
      recommendedAction = "Record baseline 10m, 20m, or 100m sprint timing metrics.";
    } else if (gap <= 0) {
      status = "ON TRACK";
      trend = "Target Surpassed";
      assessment = `You have achieved your target of ${target} ${athlete.unit}! Current PB is ${currentPB} ${athlete.unit}.`;
      recommendedAction = "Consult coach to calibrate your next season performance target.";
    } else if (adherenceRate >= 75) {
      status = "ON TRACK";
      trend = "Progressing On Track";
      assessment = `Current gap is ${gap} ${athlete.unit}. Training consistency is solid (${adherenceRate}%). Progression is on an honest trajectory.`;
      recommendedAction = "Maintain acceleration development and refine maximum velocity mechanics.";
    } else if (adherenceRate >= 50) {
      status = "PARTIALLY ON TRACK";
      trend = "Progressing Slowly";
      assessment = `Current gap is ${gap} ${athlete.unit}. Adherence is ${adherenceRate}%. Progress is slower than programmed due to missed training exposure.`;
      recommendedAction = "Focus on completing all planned sessions without increasing volume.";
    } else {
      status = "NOT ON TRACK";
      trend = "Off Track (Adherence Blocker)";
      assessment = `Low training adherence (${adherenceRate}%). The system cannot attribute adaptation when session frequency is insufficient.`;
      recommendedAction = "Re-establish consistent routine before attempting high-load progression.";
    }

    return {
      status, // "ON TRACK" | "PARTIALLY ON TRACK" | "NEEDS ATTENTION" | "NOT ON TRACK" | "INSUFFICIENT DATA"
      event: athlete.event || "100m",
      currentPB: currentPB !== null ? `${currentPB} ${athlete.unit}` : "—",
      targetPB: target !== null ? `${target} ${athlete.unit}` : "—",
      yearTarget: target,
      gap,
      gapDisplay: gap !== null ? `${gap > 0 ? "+" : ""}${gap} ${athlete.unit}` : "—",
      adherenceRate,
      trend,
      assessment,
      recommendation: recommendedAction,
      recommendedAction,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Internal Training Load Analytics (duration * RPE in Arbitrary Units AU)
   */
  async getTrainingLoadAnalytics(athleteId) {
    const sessions = await this.db.list("sessions", { ownerId: athleteId });
    const plans = await this.db.list("plans", { athleteId });

    const now = Date.now();
    const fourWeeksMs = 28 * 86400000;
    const recentSessions = sessions.filter((s) => {
      const d = Date.parse(s.date || s.trainingDate);
      return !isNaN(d) && d >= now - fourWeeksMs;
    });

    const plannedLoadTotal = plans.reduce((acc, p) => {
      if (!p.days) return acc;
      return acc + p.days.reduce((dAcc, d) => dAcc + (d.expectedDuration || 45) * (d.targetIntensity >= 90 ? 8 : 6), 0);
    }, 0);

    const actualLoadTotal = recentSessions.reduce((acc, s) => acc + (s.duration || 0) * (s.effort || 5), 0);

    const rpes = recentSessions.map((s) => s.effort).filter(Boolean);
    const avgRpe = rpes.length ? Number((rpes.reduce((a, b) => a + b, 0) / rpes.length).toFixed(1)) : 0;

    const sevenDaysMs = 7 * 86400000;
    const acuteSessions = recentSessions.filter((s) => Date.parse(s.date || s.trainingDate) >= now - sevenDaysMs);
    const acuteLoad = acuteSessions.reduce((acc, s) => acc + (s.duration || 0) * (s.effort || 5), 0);
    const chronicWeeklyAvg = actualLoadTotal / 4 || 1;
    const acwr = Number((acuteLoad / chronicWeeklyAvg).toFixed(2));

    return {
      plannedLoad: plannedLoadTotal,
      actualLoad: actualLoadTotal,
      loadUnit: "AU",
      avgRpe,
      acuteLoad,
      chronicWeeklyAvg: Math.round(chronicWeeklyAvg),
      acwr,
      status: acwr > 1.5 ? "High Spike" : acwr < 0.8 ? "Underloading" : "Optimal Zone",
      sessionsLogged: recentSessions.length,
    };
  }

  // --- Helper Date Functions ---
  getMondayOfWeek(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString().slice(0, 10);
  }
}
