import React, { useState, useEffect } from "react";
import {
  Calendar,
  Users,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Sparkles,
  Save,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Sliders,
  Info,
  Clock3,
  Dumbbell,
  Search,
  Filter,
} from "lucide-react";
import { Modal } from "../UI";
import { EXERCISE_LIBRARY } from "../../lib/trainingKnowledge";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DEFAULT_SESSION_TYPES = [
  "Acceleration",
  "Maximum Velocity",
  "Speed Endurance",
  "Sprint Strength",
  "Power & Plyometrics",
  "Sprint Technique",
  "Mobility & Active Recovery",
  "Rest & Regeneration",
];

const SESSION_TYPE_PRESETS = [
  { id: "Acceleration", label: "⚡ Acceleration", defaultObj: "0–20m horizontal force projection & block clearance", intensity: 95, duration: 60 },
  { id: "Maximum Velocity", label: "🏃 Max Velocity", defaultObj: "Flying 20m–30m upright sprinting & reactive stiffness", intensity: 98, duration: 60 },
  { id: "Speed Endurance", label: "🔥 Speed Endurance", defaultObj: "Split runs & lactic buffering capacity under technical control", intensity: 92, duration: 75 },
  { id: "Sprint Strength", label: "🏋️ Sprint Strength", defaultObj: "Lower-limb force absorption, heavy sleds & posterior chain work", intensity: 88, duration: 70 },
  { id: "Power & Plyometrics", label: "💥 Power & Plyo", defaultObj: "Boundings, hurdle hops, and explosive stretch-shortening cycle", intensity: 90, duration: 50 },
  { id: "Mobility & Active Recovery", label: "🧘 Mobility & Recovery", defaultObj: "Thoracic & hip mobility, tempo strides & soft-tissue flush", intensity: 50, duration: 40 },
  { id: "Rest & Regeneration", label: "🛌 Rest & Off", defaultObj: "Scheduled complete passive recovery and physiological regeneration", intensity: 0, duration: 0 },
];

const EXERCISE_CATEGORIES = [
  "All",
  "Acceleration",
  "Maximum Velocity",
  "Speed Endurance",
  "Sprint Technique",
  "Strength",
  "Power",
  "Plyometrics",
  "Mobility",
  "Recovery",
  "Warm-up",
  "Cooldown",
];

export function CoachPlanBuilderView({
  athletes = [],
  preselectedAthleteId = null,
  onCancel,
  onSavePlan,
  notify,
}) {
  // Wizard state: Step 1 (Select Athlete) -> Step 2 (Select Week & Context) -> Step 3 (Build Days) -> Step 4 (Review & Publish)
  const [currentStep, setCurrentStep] = useState(preselectedAthleteId ? 2 : 1);
  const [selectedAthleteId, setSelectedAthleteId] = useState(preselectedAthleteId || (athletes[0]?.athleteId || ""));

  // Plan metadata
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    // Default to upcoming or current Monday
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    return mon.toISOString().slice(0, 10);
  });
  const [weekEnd, setWeekEnd] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const sun = new Date(d.setDate(diff + 6));
    return sun.toISOString().slice(0, 10);
  });

  const [phase, setPhase] = useState("Acceleration Development");
  const [weeklyObjective, setWeeklyObjective] = useState("Improve 0–20m horizontal acceleration mechanics and upright stiffness");
  const [sourceType, setSourceType] = useState("coach"); // "coach" | "coach_modified" | "system"

  // Days state: array of 7 days
  const [days, setDays] = useState(() =>
    DAYS_OF_WEEK.map((dayName, idx) => ({
      dayIndex: idx,
      dayOfWeek: dayName,
      sessionType: idx === 0 ? "Acceleration" : idx === 1 ? "Sprint Strength" : idx === 2 ? "Recovery & Mobility" : idx === 3 ? "Maximum Velocity" : idx === 4 ? "Power & Plyometrics" : idx === 5 ? "Active Recovery" : "Rest & Regeneration",
      objective: idx === 0 ? "0-20m horizontal projection & start mechanics" : idx === 1 ? "Lower-body bilateral force capacity" : idx === 2 ? "Joint mobility and soft tissue flush" : idx === 3 ? "Flying 20m sprint mechanics" : idx === 4 ? "Reactive tendon stiffness" : "Aerobic flush",
      expectedDuration: idx === 6 ? 0 : idx === 2 || idx === 5 ? 30 : 60,
      targetIntensity: idx === 6 ? 0 : idx === 0 || idx === 3 ? 95 : idx === 1 || idx === 4 ? 90 : 50,
      warmup: ["10 min dynamic mobility & activation", "3 progressive build-up strides"],
      exercises: [],
      cooldown: ["10 min aerobic walking flush", "Lower-body static stretching"],
      coachNotes: "",
      status: "scheduled",
    }))
  );

  const [activeDayIdx, setActiveDayIdx] = useState(0);

  // Exercise selector modal
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [exerciseSection, setExerciseSection] = useState("exercises"); // "exercises" | "warmup" | "cooldown"
  const [exSearch, setExSearch] = useState("");
  const [exCategory, setExCategory] = useState("All");

  // Custom manual exercise entry
  const [customExerciseModalOpen, setCustomExerciseModalOpen] = useState(false);
  const [customExForm, setCustomExForm] = useState({
    name: "",
    category: "Acceleration",
    sets: 3,
    reps: 1,
    distance: "30m",
    intensity: "95%",
    rest: "3 min",
    cues: "",
  });

  // Fast inline drill inputs for warmup & cooldown
  const [inlineWarmupText, setInlineWarmupText] = useState("");
  const [inlineCooldownText, setInlineCooldownText] = useState("");
  const [copyTargetDay, setCopyTargetDay] = useState(1);

  // Selected athlete context details
  const selectedAthlete = athletes.find((a) => a.athleteId === selectedAthleteId);

  // Auto-update weekEnd when weekStart changes
  function handleWeekStartChange(val) {
    setWeekStart(val);
    const st = new Date(val);
    if (!isNaN(st.getTime())) {
      const en = new Date(st.getTime() + 6 * 86400000);
      setWeekEnd(en.toISOString().slice(0, 10));

      // Also update dates on day objects
      setDays((prev) =>
        prev.map((d, i) => {
          const dayD = new Date(st.getTime() + i * 86400000);
          return {
            ...d,
            date: dayD.toISOString().slice(0, 10),
            trainingDate: dayD.toISOString().slice(0, 10),
          };
        })
      );
    }
  }

  // Ensure dates are attached to days
  useEffect(() => {
    const st = new Date(weekStart);
    if (!isNaN(st.getTime())) {
      setDays((prev) =>
        prev.map((d, i) => {
          const dayD = new Date(st.getTime() + i * 86400000);
          return {
            ...d,
            date: dayD.toISOString().slice(0, 10),
            trainingDate: dayD.toISOString().slice(0, 10),
          };
        })
      );
    }
  }, [weekStart]);

  function updateDayField(field, value) {
    setDays((prev) =>
      prev.map((d, i) => (i === activeDayIdx ? { ...d, [field]: value } : d))
    );
  }

  function handleSelectPreset(preset) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== activeDayIdx) return d;
        const isRest = preset.id === "Rest & Regeneration";
        return {
          ...d,
          sessionType: preset.id,
          objective: preset.defaultObj,
          targetIntensity: preset.intensity,
          expectedDuration: preset.duration,
          ...(isRest ? { exercises: [] } : {}),
        };
      })
    );
  }

  function openExerciseModal(section = "exercises") {
    setExerciseSection(section);
    setExerciseModalOpen(true);
  }

  function handleSelectExercise(ex) {
    const newEx = {
      id: ex.id,
      name: ex.name,
      category: ex.category,
      sets: ex.defaultSets || 3,
      reps: ex.defaultReps || 1,
      distance: ex.defaultDistance || "30m",
      duration: ex.defaultDuration || "N/A",
      intensity: ex.intensityType || "95%",
      rest: ex.defaultRest || "3 min",
      cues: ex.coachingCues || [],
    };

    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== activeDayIdx) return d;
        const currentList = d[exerciseSection] || [];
        return {
          ...d,
          [exerciseSection]: [...currentList, newEx],
        };
      })
    );

    setExerciseModalOpen(false);
  }

  function handleRemoveExercise(sec, itemIdx) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== activeDayIdx) return d;
        const currentList = d[sec] || [];
        return {
          ...d,
          [sec]: currentList.filter((_, idx) => idx !== itemIdx),
        };
      })
    );
  }

  function handleUpdateExerciseItem(sec, itemIdx, field, val) {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== activeDayIdx) return d;
        const currentList = [...(d[sec] || [])];
        if (currentList[itemIdx]) {
          currentList[itemIdx] = { ...currentList[itemIdx], [field]: val };
        }
        return {
          ...d,
          [sec]: currentList,
        };
      })
    );
  }

  // Manual Plan Builder Actions (Coach Direct Control)
  function handleResetWeekToBlank() {
    const st = new Date(weekStart);
    setDays(
      DAYS_OF_WEEK.map((dayName, idx) => {
        const dayD = !isNaN(st.getTime()) ? new Date(st.getTime() + idx * 86400000) : null;
        const dStr = dayD ? dayD.toISOString().slice(0, 10) : "";
        return {
          dayIndex: idx,
          dayOfWeek: dayName,
          date: dStr,
          trainingDate: dStr,
          sessionType: idx === 6 ? "Rest & Regeneration" : "Manual Training Session",
          objective: "",
          expectedDuration: idx === 6 ? 0 : 60,
          targetIntensity: idx === 6 ? 0 : 80,
          warmup: [],
          exercises: [],
          cooldown: [],
          coachNotes: "",
          status: "scheduled",
        };
      })
    );
    setWeeklyObjective("Coach-authored customized weekly training block");
    setSourceType("coach");
    notify?.("Weekly schedule reset to clean blank template. Fill cards manually.");
  }

  function handleClearActiveDay() {
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== activeDayIdx) return d;
        return {
          ...d,
          objective: "",
          expectedDuration: 60,
          targetIntensity: 80,
          warmup: [],
          exercises: [],
          cooldown: [],
          coachNotes: "",
        };
      })
    );
    notify?.(`Cleared training prescriptions for ${days[activeDayIdx]?.dayOfWeek}.`);
  }

  function handleCopyDayTo(targetIdx) {
    const tIdx = Number(targetIdx);
    if (tIdx === activeDayIdx) {
      notify?.("Cannot copy day onto itself. Choose another day.", "error");
      return;
    }
    const sourceDay = days[activeDayIdx];
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== tIdx) return d;
        return {
          ...d,
          sessionType: sourceDay.sessionType,
          objective: sourceDay.objective,
          expectedDuration: sourceDay.expectedDuration,
          targetIntensity: sourceDay.targetIntensity,
          warmup: [...(sourceDay.warmup || [])],
          exercises: JSON.parse(JSON.stringify(sourceDay.exercises || [])),
          cooldown: [...(sourceDay.cooldown || [])],
          coachNotes: sourceDay.coachNotes,
        };
      })
    );
    notify?.(`Copied ${sourceDay.dayOfWeek}'s prescription to ${days[tIdx]?.dayOfWeek}.`);
  }

  function handleAddInlineDrill(section) {
    const text = section === "warmup" ? inlineWarmupText.trim() : inlineCooldownText.trim();
    if (!text) return;
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== activeDayIdx) return d;
        const currentList = d[section] || [];
        return {
          ...d,
          [section]: [...currentList, text],
        };
      })
    );
    if (section === "warmup") setInlineWarmupText("");
    else setInlineCooldownText("");
  }

  function handleSaveCustomExercise() {
    if (!customExForm.name.trim()) {
      notify?.("Please enter an exercise name.", "error");
      return;
    }
    const newEx = {
      id: "custom_" + Date.now(),
      name: customExForm.name.trim(),
      category: customExForm.category,
      sets: Number(customExForm.sets) || 3,
      reps: Number(customExForm.reps) || 1,
      distance: customExForm.distance || "30m",
      duration: "N/A",
      intensity: customExForm.intensity || "95%",
      rest: customExForm.rest || "3 min",
      cues: customExForm.cues ? [customExForm.cues] : [],
    };
    setDays((prev) =>
      prev.map((d, i) => {
        if (i !== activeDayIdx) return d;
        return {
          ...d,
          exercises: [...(d.exercises || []), newEx],
        };
      })
    );
    setCustomExForm({
      name: "",
      category: "Acceleration",
      sets: 3,
      reps: 1,
      distance: "30m",
      intensity: "95%",
      rest: "3 min",
      cues: "",
    });
    setCustomExerciseModalOpen(false);
    notify?.(`Added "${newEx.name}" to ${days[activeDayIdx]?.dayOfWeek}.`);
  }

  // System Suggestion Panel logic (Section 22 & 51)
  function handleGenerateSystemSuggestion() {
    setPhase(selectedAthlete?.currentPhase || "Acceleration Development");
    setWeeklyObjective("Sports-science prescribed: 0–20m acceleration mechanics, ground projection & upright stiffness");
    setSourceType("system");

    // Populate tailored sprint week
    const suggestedDays = days.map((d, idx) => {
      let sessionType = "Acceleration";
      let objective = "Horizontal force projection & start drive";
      let duration = 60;
      let intensity = 95;
      let exercises = [];

      if (idx === 0) {
        sessionType = "Acceleration";
        objective = "10m-20m falling & 3-point starts";
        exercises = [
          { name: "10m Falling Starts", sets: 4, reps: 1, distance: "10m", intensity: "100%", rest: "90 sec" },
          { name: "20m 3-Point Starts", sets: 3, reps: 1, distance: "20m", intensity: "100%", rest: "2 min" },
        ];
      } else if (idx === 1) {
        sessionType = "Sprint Strength";
        objective = "Posterior chain rate of force development";
        exercises = [
          { name: "Trap Bar Deadlift", sets: 4, reps: 3, distance: "Gym", intensity: "85%", rest: "3 min" },
          { name: "Nordic Hamstring Curls", sets: 3, reps: 5, distance: "Gym", intensity: "80%", rest: "2 min" },
        ];
      } else if (idx === 2) {
        sessionType = "Recovery & Mobility";
        objective = "Parasympathetic flush and soft tissue restoration";
        duration = 35;
        intensity = 40;
        exercises = [
          { name: "Dynamic Hip & Ankle Mobility Flow", sets: 1, reps: 1, distance: "15 min", intensity: "Low", rest: "N/A" },
        ];
      } else if (idx === 3) {
        sessionType = "Maximum Velocity";
        objective = "Flying 20m upright mechanics & minimal contact time";
        exercises = [
          { name: "Flying 20m Sprint (20m buildup)", sets: 3, reps: 1, distance: "20m fly", intensity: "100%", rest: "4 min" },
        ];
      } else if (idx === 4) {
        sessionType = "Power & Plyometrics";
        objective = "Elastic tendon stiffness & ground contact reduction";
        exercises = [
          { name: "Continuous Mini-Hurdle Pogo Hops", sets: 3, reps: 6, distance: "15m", intensity: "High", rest: "90 sec" },
          { name: "Alternate Leg Sprint Bounds", sets: 3, reps: 1, distance: "30m", intensity: "Max", rest: "2.5 min" },
        ];
      } else if (idx === 5) {
        sessionType = "Active Recovery";
        objective = "Aerobic walking flush and light technical drills";
        duration = 30;
        intensity = 40;
      } else {
        sessionType = "Rest & Weekly Review";
        objective = "Full rest and review adherence with coach";
        duration = 0;
        intensity = 0;
      }

      return {
        ...d,
        sessionType,
        objective,
        expectedDuration: duration,
        targetIntensity: intensity,
        exercises,
        coachNotes: idx === 0 ? "Focus on low heel recovery in steps 1-3." : "",
      };
    });

    setDays(suggestedDays);
    notify?.("Evidence-informed weekly template generated. Review and modify as desired.");
  }

  async function handleFinalSubmit(publishImmediately = false) {
    if (!selectedAthleteId) {
      notify?.("Please select an athlete.", "error");
      return;
    }

    const payload = {
      athleteId: selectedAthleteId,
      weekStart,
      weekEnd,
      phase,
      weeklyObjective,
      source: sourceType === "system" ? "coach_modified" : "coach",
      status: publishImmediately ? "published" : "draft",
      days,
    };

    try {
      await onSavePlan(payload);
    } catch (err) {
      notify?.("Error saving plan: " + err.message, "error");
    }
  }

  // Filter exercises for modal
  const filteredExercises = EXERCISE_LIBRARY.filter((ex) => {
    const matchCat = exCategory === "All" || ex.category.toLowerCase() === exCategory.toLowerCase();
    const matchQ =
      !exSearch.trim() ||
      ex.name.toLowerCase().includes(exSearch.toLowerCase()) ||
      ex.category.toLowerCase().includes(exSearch.toLowerCase());
    return matchCat && matchQ;
  });

  const activeDay = days[activeDayIdx] || {};

  return (
    <div className="coach-plan-builder-view">
      {/* Wizard Header Bar */}
      <div className="section-header-row" style={{ marginBottom: 16 }}>
        <div>
          <button className="button ghost small back-btn" onClick={onCancel}>
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <h2 style={{ marginTop: 6 }}>Weekly Training Plan Builder</h2>
          <p className="subtitle-sm">
            Construct individualized, day-by-day training prescriptions with sports-science exercise libraries and coach authority.
          </p>
        </div>
        <div className="wizard-step-indicator">
          <span className={`step-badge ${currentStep === 1 ? "active" : currentStep > 1 ? "done" : ""}`}>
            1. Select Athlete
          </span>
          <ChevronRight size={14} />
          <span className={`step-badge ${currentStep === 2 ? "active" : currentStep > 2 ? "done" : ""}`}>
            2. Week & Context
          </span>
          <ChevronRight size={14} />
          <span className={`step-badge ${currentStep === 3 ? "active" : currentStep > 3 ? "done" : ""}`}>
            3. Build Sessions
          </span>
          <ChevronRight size={14} />
          <span className={`step-badge ${currentStep === 4 ? "active" : ""}`}>
            4. Review & Publish
          </span>
        </div>
      </div>

      {/* ========================================================
          STEP 1: SELECT ATHLETE
      ======================================================== */}
      {currentStep === 1 && (
        <div className="panel panel-pad" style={{ maxWidth: 800, margin: "0 auto" }}>
          <h3 style={{ margin: "0 0 8px" }}>Select Athlete for Training Plan</h3>
          <p className="subtitle-sm">Choose an athlete from your connected coaching roster to build this schedule.</p>

          <div className="athletes-select-list" style={{ marginTop: 16 }}>
            {athletes.map((ath) => {
              const isSelected = ath.athleteId === selectedAthleteId;
              return (
                <div
                  key={ath.athleteId}
                  className={`athlete-select-option ${isSelected ? "selected" : ""}`}
                  onClick={() => setSelectedAthleteId(ath.athleteId)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{ath.name}</strong>
                      <span className="ath-card-sport" style={{ display: "block" }}>
                        {ath.sport} • {ath.event} • Age {ath.age}
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className="pill dark">{ath.trainingStatus || "On Track"}</span>
                      <small style={{ display: "block", color: "#6a775b", marginTop: 4 }}>
                        PB: {ath.currentPB ? `${ath.currentPB}s` : "—"}
                      </small>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
            <button
              className="button orange"
              disabled={!selectedAthleteId}
              onClick={() => setCurrentStep(2)}
            >
              Continue to Week & Context <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 2: SELECT WEEK & REVIEW ATHLETE CONTEXT (SECTIONS 16 & 50)
      ======================================================== */}
      {currentStep === 2 && (
        <div className="step-2-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
          {/* Left Column: Week Selection & Objectives */}
          <div className="panel panel-pad">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <span className="coach-kicker">STEP 2 OF 4</span>
                <h3 style={{ margin: "2px 0 0" }}>Week Schedule Parameters</h3>
              </div>
              <span className="pill small dark">7-Day Training Cycle</span>
            </div>

            <div className="form-row-2">
              <div className="plan-builder-input-group" style={{ margin: 0 }}>
                <label>Week Starting Date (Monday):</label>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => handleWeekStartChange(e.target.value)}
                  required
                />
              </div>
              <div className="plan-builder-input-group" style={{ margin: 0 }}>
                <label>Week Concluding Date (Sunday):</label>
                <input type="date" value={weekEnd} disabled style={{ background: "#f0f2eb", cursor: "not-allowed" }} />
              </div>
            </div>

            <div className="plan-builder-input-group">
              <label>Current Training Phase:</label>
              <select value={phase} onChange={(e) => setPhase(e.target.value)}>
                <option value="Foundation">Level 1: Foundation & Mechanics</option>
                <option value="Acceleration Development">Level 2: Acceleration Development</option>
                <option value="Maximum Velocity">Level 3: Maximum Velocity</option>
                <option value="Speed Endurance">Level 4: Speed Endurance</option>
                <option value="Competition Preparation">Level 5: Competition Preparation</option>
                <option value="Championship Peak">Level 6: Championship Peak</option>
              </select>
            </div>

            <div className="plan-builder-input-group">
              <label>Weekly Primary Objective:</label>
              <textarea
                value={weeklyObjective}
                onChange={(e) => setWeeklyObjective(e.target.value)}
                placeholder="Specific focus for this week (e.g. 0-20m horizontal force drive and block departure mechanics)..."
                rows={3}
                required
              />
              <small style={{ color: "#6a775b", fontSize: 11.5, marginTop: 3 }}>
                This objective guides the session intensity and drill prescriptions across all 7 days.
              </small>
            </div>

            {/* Plan Build Method Selector (Manual vs System Assisted) */}
            <div className="plan-build-method-selector">
              <label style={{ fontSize: 12, fontWeight: 700, color: "#2e3b23", display: "block", marginBottom: 10, letterSpacing: 0.3 }}>
                SELECT PLAN AUTHORING METHOD:
              </label>

              <div className="build-mode-grid">
                {/* Method 1: 100% Manual Build */}
                <div
                  className={`build-mode-card ${sourceType === "coach" ? "active-manual" : ""}`}
                  onClick={handleResetWeekToBlank}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>✍️</span>
                        <strong style={{ fontSize: 13.5, color: "#1a1e24" }}>Manual Plan Build</strong>
                      </div>
                      {sourceType === "coach" && (
                        <span className="pill small dark" style={{ fontSize: 10 }}>Active</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: "#6a775b", lineHeight: 1.4 }}>
                      Start with clean, blank 7-day cards. You manually prescribe exercises, sets, reps, and coaching cues day by day.
                    </p>
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #edf1e6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <small style={{ color: "#475569", fontWeight: 600 }}>Coach Authority</small>
                    <button
                      type="button"
                      className="button small ghost"
                      style={{ padding: "3px 8px", fontSize: 11 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResetWeekToBlank();
                      }}
                    >
                      Reset to Blank
                    </button>
                  </div>
                </div>

                {/* Method 2: AI / Sports-Science Assisted */}
                <div
                  className={`build-mode-card ${sourceType === "system" ? "active-system" : ""}`}
                  onClick={handleGenerateSystemSuggestion}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Sparkles size={16} color="#d97706" />
                        <strong style={{ fontSize: 13.5, color: "#92400e" }}>System-Assisted Template</strong>
                      </div>
                      {sourceType === "system" && (
                        <span className="pill small" style={{ background: "#d97706", color: "#fff", fontSize: 10 }}>Active</span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: "#78350f", lineHeight: 1.4 }}>
                      Auto-fill an evidence-based 7-day template tailored to {selectedAthlete?.name}&apos;s current phase ({phase}) and sprint event.
                    </p>
                  </div>
                  <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #fef3c7", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <small style={{ color: "#b45309", fontWeight: 600 }}>Sports-Science AI</small>
                    <button
                      type="button"
                      className="button small"
                      style={{ background: "#d97706", color: "#ffffff", padding: "3px 8px", fontSize: 11 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateSystemSuggestion();
                      }}
                    >
                      <Sparkles size={11} /> Auto-Fill
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 16, borderTop: "1px solid #edf1e6" }}>
              <button className="button ghost" onClick={() => setCurrentStep(1)}>
                <ArrowLeft size={14} /> Back to Athlete Selection
              </button>
              <button className="button orange" onClick={() => setCurrentStep(3)}>
                {sourceType === "coach" ? "Open 7 Cards to Fill Manually" : "Review & Edit 7 Plan Cards"} <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Right Column: Athlete Context Card (Section 50) */}
          <div className="panel panel-pad" style={{ background: "#f8fbf4" }}>
            <span className="coach-kicker">ATHLETE DOSSIER CONTEXT</span>
            <h4 style={{ margin: "4px 0 12px", fontSize: 17 }}>{selectedAthlete?.name}</h4>

            <div className="context-item-row">
              <span>Event & Sport:</span>
              <strong>{selectedAthlete?.sport} • {selectedAthlete?.event}</strong>
            </div>
            <div className="context-item-row">
              <span>Current PB:</span>
              <strong>{selectedAthlete?.currentPB ? `${selectedAthlete.currentPB}s` : "—"}</strong>
            </div>
            <div className="context-item-row">
              <span>Season Target:</span>
              <strong>{selectedAthlete?.yearTarget ? `${selectedAthlete.yearTarget}s` : selectedAthlete?.goal || "—"}</strong>
            </div>
            <div className="context-item-row">
              <span>Current Phase:</span>
              <strong>{selectedAthlete?.currentPhase || "Foundation"}</strong>
            </div>
            <div className="context-item-row">
              <span>14-Day Adherence:</span>
              <strong>{selectedAthlete?.adherence || 0}%</strong>
            </div>
            <div className="context-item-row">
              <span>Status:</span>
              <strong style={{ color: "#2e3b23" }}>{selectedAthlete?.trainingStatus || "On Track"}</strong>
            </div>
            <div className="context-item-row">
              <span>Days to Competition:</span>
              <strong>{selectedAthlete?.daysToCompetition ? `${selectedAthlete.daysToCompetition} days` : "Not scheduled"}</strong>
            </div>

            {selectedAthlete?.flags && selectedAthlete.flags.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #e2ebd6" }}>
                <span className="lbl-mini" style={{ color: "#dc2626", fontWeight: 700, fontSize: 11 }}>SAFETY & RECOVERY FLAGS</span>
                {selectedAthlete.flags.map((f, i) => (
                  <div key={i} className="flag-tag danger" style={{ marginTop: 6, display: "flex", gap: 4 }}>
                    <strong>{f.label}:</strong> {f.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 3: 7 CARDS WEEKLY DECK & INTERACTIVE CARD FILLER
      ======================================================== */}
      {currentStep === 3 && (
        <div className="step-3-builder">
          {/* Deck Header */}
          <div className="section-header-row" style={{ marginBottom: 14 }}>
            <div>
              <span className="coach-kicker">STEP 3 OF 4 — 7-DAY SCHEDULE CARDS</span>
              <h3 style={{ margin: "2px 0" }}>Weekly Plan: {weekStart} to {weekEnd}</h3>
              <p className="subtitle-sm">
                Select any card below to prescribe drills, exercises, and intensity for that day.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className={`pill ${sourceType === "system" ? "orange" : "dark"}`} style={{ fontSize: 11.5 }}>
                {sourceType === "system" ? "✨ Assisted Template" : "✍️ Manual Coach Build"}
              </span>
              <button
                type="button"
                className="button small ghost"
                onClick={handleResetWeekToBlank}
                title="Erase all days and start completely blank"
              >
                Reset to Blank Week
              </button>
              <button
                type="button"
                className="button small ghost"
                onClick={handleGenerateSystemSuggestion}
                title="Populate science-informed template"
              >
                <Sparkles size={12} color="#d97706" /> Apply System Template
              </button>
            </div>
          </div>

          {/* THE 7 CARDS WEEKLY DECK */}
          <div className="week-cards-deck">
            {days.map((d, idx) => {
              const isSelected = activeDayIdx === idx;
              const isRest = (d.sessionType || "").toLowerCase().includes("rest") || d.expectedDuration === 0;
              const exCount = (d.exercises || []).length;
              const isConfigured = exCount > 0 || isRest;

              let formattedDate = `Day ${idx + 1}`;
              if (d.date) {
                const dt = new Date(d.date);
                if (!isNaN(dt.getTime())) {
                  formattedDate = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
                }
              }

              return (
                <div
                  key={idx}
                  className={`week-day-card ${isSelected ? "active" : ""} ${isRest ? "rest-day" : ""}`}
                  onClick={() => setActiveDayIdx(idx)}
                >
                  <div className="day-card-header">
                    <div className="day-card-day-title">
                      <span className="day-card-name">{d.dayOfWeek}</span>
                      <span className="day-card-date">{formattedDate}</span>
                    </div>
                    <span className="day-card-step-badge">#{idx + 1}</span>
                  </div>

                  <div className="day-card-body">
                    <span className="day-card-type-tag">
                      {isRest ? "🛌 Rest Day" : d.sessionType || "Training"}
                    </span>
                    <span className="day-card-obj-snippet" title={d.objective}>
                      {d.objective || "No objective set"}
                    </span>
                  </div>

                  <div className="day-card-footer">
                    <span className="day-card-counts">
                      {isRest ? "Rest" : `${exCount} exercises`}
                    </span>
                    {isSelected ? (
                      <span className="day-card-indicator active">Editing</span>
                    ) : isConfigured ? (
                      <span className="day-card-indicator configured">Ready</span>
                    ) : (
                      <span className="day-card-indicator pending">Draft</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ACTIVE DAY TRAINING PLAN FILLER */}
          <div className="active-day-editor-panel">
            {/* Day Editor Header */}
            <div className="day-editor-header">
              <div>
                <span className="coach-kicker">FILLING TRAINING CARD #{activeDayIdx + 1}</span>
                <h3 style={{ margin: "2px 0 0" }}>
                  {activeDay.dayOfWeek} Session ({activeDay.date || activeDay.trainingDate})
                </h3>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="pill dark">
                  Estimated {activeDay.expectedDuration} min · {activeDay.targetIntensity}% Target Intensity
                </span>
                <div className="day-editor-top-actions">
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#556247" }}>Duplicate to:</label>
                    <select
                      value={copyTargetDay}
                      onChange={(e) => setCopyTargetDay(Number(e.target.value))}
                      style={{ padding: "3px 6px", fontSize: 11.5, borderRadius: 4, border: "1px solid #ccd6be" }}
                    >
                      {days.map((d, i) => (
                        <option key={i} value={i} disabled={i === activeDayIdx}>
                          {d.dayOfWeek} {i === activeDayIdx ? "(Current)" : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="day-action-btn"
                      onClick={() => handleCopyDayTo(copyTargetDay)}
                      title="Duplicate this day's exercises to target day"
                    >
                      Copy Day
                    </button>
                  </div>
                  <button
                    type="button"
                    className="day-action-btn danger"
                    onClick={handleClearActiveDay}
                    title="Clear all exercises on this day"
                  >
                    Clear Day
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Session Presets Strip */}
            <div style={{ marginTop: 16 }}>
              <label style={{ fontSize: 11.5, fontWeight: 700, color: "#556247", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>
                ⚡ Quick Session Presets (One-Click Selection):
              </label>
              <div className="session-presets-strip">
                {SESSION_TYPE_PRESETS.map((preset) => {
                  const isPresetActive = activeDay.sessionType === preset.id;
                  const isRest = preset.id === "Rest & Regeneration";
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`preset-pill-btn ${isPresetActive ? "active" : ""} ${isRest ? "rest-preset" : ""}`}
                      onClick={() => handleSelectPreset(preset)}
                    >
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Session Parameters */}
            <div className="form-row-3">
              <div className="plan-builder-input-group" style={{ margin: 0 }}>
                <label>Session Type:</label>
                <select
                  value={activeDay.sessionType}
                  onChange={(e) => updateDayField("sessionType", e.target.value)}
                >
                  {DEFAULT_SESSION_TYPES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="plan-builder-input-group" style={{ margin: 0 }}>
                <label>Expected Duration (min):</label>
                <input
                  type="number"
                  value={activeDay.expectedDuration}
                  onChange={(e) => updateDayField("expectedDuration", Number(e.target.value))}
                />
              </div>

              <div className="plan-builder-input-group" style={{ margin: 0 }}>
                <label>Target Intensity (%):</label>
                <input
                  type="number"
                  value={activeDay.targetIntensity}
                  onChange={(e) => updateDayField("targetIntensity", Number(e.target.value))}
                />
              </div>
            </div>

            <div className="plan-builder-input-group">
              <label>Technical Session Objective:</label>
              <input
                type="text"
                value={activeDay.objective}
                onChange={(e) => updateDayField("objective", e.target.value)}
                placeholder="e.g. 0-20m horizontal projection and positive shin angles"
              />
            </div>

            {/* 1. Warm-up Routine Block */}
            <div className="builder-section-block" style={{ marginTop: 20 }}>
              <div className="sec-head-row">
                <span className="sec-title">1. WARM-UP ROUTINE</span>
                <button
                  type="button"
                  className="button small ghost"
                  onClick={() => openExerciseModal("warmup")}
                >
                  <Plus size={13} /> Select from Library
                </button>
              </div>

              {/* Fast Manual Inline Drill Input */}
              <div className="inline-drill-input-row">
                <input
                  type="text"
                  placeholder="Type custom warm-up drill (e.g. 10m A-Skips with band, ankle stiffness hops)..."
                  value={inlineWarmupText}
                  onChange={(e) => setInlineWarmupText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddInlineDrill("warmup");
                    }
                  }}
                />
                <button
                  type="button"
                  className="button small ghost"
                  onClick={() => handleAddInlineDrill("warmup")}
                >
                  <Plus size={12} /> Add Drill
                </button>
              </div>

              {(activeDay.warmup || []).length === 0 ? (
                <p className="empty-hint" style={{ marginTop: 8 }}>No warm-up drills added for this session yet.</p>
              ) : (
                <div className="exercise-rows-stack" style={{ marginTop: 10 }}>
                  {(activeDay.warmup || []).map((wItem, wIdx) => {
                    const isObj = typeof wItem === "object";
                    return (
                      <div key={wIdx} className="exercise-builder-row">
                        <div className="exercise-builder-row-head">
                          <strong>{isObj ? wItem.name : wItem}</strong>
                          <button
                            type="button"
                            className="icon-button danger"
                            onClick={() => handleRemoveExercise("warmup", wIdx)}
                            title="Remove drill"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Main Session Exercises Block */}
            <div className="builder-section-block" style={{ marginTop: 20 }}>
              <div className="sec-head-row">
                <span className="sec-title">2. MAIN SESSION EXERCISES</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    className="button small ghost"
                    onClick={() => setCustomExerciseModalOpen(true)}
                  >
                    <Plus size={13} /> Add Custom Exercise (Manual)
                  </button>
                  <button
                    type="button"
                    className="button small orange"
                    onClick={() => openExerciseModal("exercises")}
                  >
                    <Plus size={13} /> Select from Library
                  </button>
                </div>
              </div>

              {(activeDay.exercises || []).length === 0 ? (
                <div className="empty-hint-card" style={{ padding: "24px 16px", textAlign: "center" }}>
                  <Dumbbell size={24} color="#8a9976" style={{ margin: "0 auto 8px" }} />
                  <p style={{ margin: "0 0 12px", color: "#6a775b", fontSize: 13 }}>
                    No main exercises prescribed for {activeDay.dayOfWeek} yet.
                  </p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="button small ghost"
                      onClick={() => setCustomExerciseModalOpen(true)}
                    >
                      <Plus size={13} /> Add Custom Exercise Manually
                    </button>
                    <button
                      type="button"
                      className="button small orange"
                      onClick={() => openExerciseModal("exercises")}
                    >
                      <Plus size={13} /> Select from Sports-Science Library
                    </button>
                  </div>
                </div>
              ) : (
                <div className="exercise-rows-stack">
                  {(activeDay.exercises || []).map((ex, exIdx) => (
                    <div key={exIdx} className="exercise-builder-row">
                      <div className="exercise-builder-row-head">
                        <div>
                          <strong>{ex.name}</strong>
                          <span className="pill small ghost" style={{ marginLeft: 8 }}>
                            {ex.category || "Sprint"}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() => handleRemoveExercise("exercises", exIdx)}
                          title="Remove exercise"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Configurable Prescriptions */}
                      <div className="form-row-4" style={{ marginTop: 8 }}>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#556247" }}>Sets:</label>
                          <input
                            type="number"
                            value={ex.sets || 3}
                            onChange={(e) => handleUpdateExerciseItem("exercises", exIdx, "sets", Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#556247" }}>Reps:</label>
                          <input
                            type="number"
                            value={ex.reps || 1}
                            onChange={(e) => handleUpdateExerciseItem("exercises", exIdx, "reps", Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#556247" }}>Distance / Volume:</label>
                          <input
                            type="text"
                            value={ex.distance || "30m"}
                            onChange={(e) => handleUpdateExerciseItem("exercises", exIdx, "distance", e.target.value)}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "#556247" }}>Rest Interval:</label>
                          <input
                            type="text"
                            value={ex.rest || "3 min"}
                            onChange={(e) => handleUpdateExerciseItem("exercises", exIdx, "rest", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Cooldown Protocol Block */}
            <div className="builder-section-block" style={{ marginTop: 20 }}>
              <div className="sec-head-row">
                <span className="sec-title">3. COOLDOWN & RESTORATION</span>
                <button
                  type="button"
                  className="button small ghost"
                  onClick={() => openExerciseModal("cooldown")}
                >
                  <Plus size={13} /> Select from Library
                </button>
              </div>

              {/* Fast Manual Inline Drill Input */}
              <div className="inline-drill-input-row">
                <input
                  type="text"
                  placeholder="Type custom cooldown drill (e.g. 400m barefoot grass walk, hamstring flossing)..."
                  value={inlineCooldownText}
                  onChange={(e) => setInlineCooldownText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddInlineDrill("cooldown");
                    }
                  }}
                />
                <button
                  type="button"
                  className="button small ghost"
                  onClick={() => handleAddInlineDrill("cooldown")}
                >
                  <Plus size={12} /> Add Drill
                </button>
              </div>

              {(activeDay.cooldown || []).length === 0 ? (
                <p className="empty-hint" style={{ marginTop: 8 }}>No cooldown drills added yet.</p>
              ) : (
                <div className="exercise-rows-stack" style={{ marginTop: 10 }}>
                  {(activeDay.cooldown || []).map((cItem, cIdx) => {
                    const isObj = typeof cItem === "object";
                    return (
                      <div key={cIdx} className="exercise-builder-row">
                        <div className="exercise-builder-row-head">
                          <strong>{isObj ? cItem.name : cItem}</strong>
                          <button
                            type="button"
                            className="icon-button danger"
                            onClick={() => handleRemoveExercise("cooldown", cIdx)}
                            title="Remove protocol"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. Coach Notes Block */}
            <div className="plan-builder-input-group" style={{ marginTop: 20 }}>
              <label>Coach Notes & Technical Guidance for {activeDay.dayOfWeek}:</label>
              <textarea
                value={activeDay.coachNotes}
                onChange={(e) => updateDayField("coachNotes", e.target.value)}
                placeholder="Specific technical reminders (e.g. low heel recovery, punch elbows backward, maintain tall posture)..."
                rows={2}
              />
            </div>

            {/* Sequential Card Navigation Footer */}
            <div className="day-editor-nav-footer">
              <div style={{ display: "flex", gap: 10 }}>
                {activeDayIdx > 0 ? (
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => setActiveDayIdx(activeDayIdx - 1)}
                  >
                    <ArrowLeft size={14} /> Previous Day ({days[activeDayIdx - 1]?.dayOfWeek})
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => setCurrentStep(2)}
                  >
                    <ArrowLeft size={14} /> Back to Week Parameters
                  </button>
                )}

                <button
                  type="button"
                  className="button ghost"
                  onClick={() => handleSelectPreset(SESSION_TYPE_PRESETS[6])}
                  title="Designate this day as scheduled rest"
                >
                  🛌 Mark as Rest Day
                </button>
              </div>

              <div>
                {activeDayIdx < 6 ? (
                  <button
                    type="button"
                    className="button orange"
                    onClick={() => setActiveDayIdx(activeDayIdx + 1)}
                  >
                    Save & Next Day ({days[activeDayIdx + 1]?.dayOfWeek}) <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="button orange"
                    style={{ background: "#2e7d32", borderColor: "#2e7d32" }}
                    onClick={() => setCurrentStep(4)}
                  >
                    All 7 Days Completed · Review & Publish Plan <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          STEP 4: REVIEW & PUBLISH (SECTIONS 24, 25)
      ======================================================== */}
      {currentStep === 4 && (
        <div className="panel panel-pad" style={{ maxWidth: 840, margin: "0 auto" }}>
          <div className="section-header-row" style={{ marginBottom: 14 }}>
            <div>
              <span className="coach-kicker">FINAL WEEK REVIEW</span>
              <h3 style={{ margin: "2px 0" }}>
                Week Plan Summary: {weekStart} to {weekEnd}
              </h3>
              <p className="subtitle-sm">
                Athlete: <strong>{selectedAthlete?.name}</strong> · Phase: <strong>{phase}</strong> · Focus: <strong>{weeklyObjective}</strong>
              </p>
            </div>
          </div>

          <div className="week-review-checklist" style={{ marginTop: 14 }}>
            {days.map((d, idx) => (
              <div key={idx} className="review-day-row">
                <div className="rev-day-meta">
                  <CheckCircle2 size={16} color="#2b7a1f" />
                  <strong>{d.dayOfWeek}</strong>
                  <span className="day-date-hint">{d.date || d.trainingDate}</span>
                </div>
                <div className="rev-day-spec">
                  <span className="rev-type">{d.sessionType}</span>
                  <small className="rev-ex-count">
                    {(d.exercises || []).length} exercise(s) · {d.expectedDuration} min
                  </small>
                </div>
                <button
                  type="button"
                  className="button small ghost"
                  onClick={() => {
                    setActiveDayIdx(idx);
                    setCurrentStep(3);
                  }}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="review-action-footer" style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <button className="button ghost" onClick={() => setCurrentStep(3)}>
              <ArrowLeft size={14} /> Back to Day Builder
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="button ghost"
                onClick={() => handleFinalSubmit(false)}
              >
                <Save size={14} /> Save Draft (Coach Only)
              </button>
              <button
                type="button"
                className="button orange"
                onClick={() => handleFinalSubmit(true)}
              >
                <CheckCircle2 size={14} /> Publish Plan to Athlete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Selector Modal (Section 19 & 20) */}
      {exerciseModalOpen && (
        <Modal
          title={`Exercise Library (${exerciseSection === "warmup" ? "Warm-up" : exerciseSection === "cooldown" ? "Cooldown" : "Main Session"})`}
          onClose={() => setExerciseModalOpen(false)}
        >
          <div className="exercise-selector-modal-content">
            {/* Search and Category Filter Toolbar */}
            <div className="modal-filter-toolbar">
              <div className="search-input-box" style={{ flex: 1 }}>
                <Search size={14} color="#6a775b" />
                <input
                  type="text"
                  placeholder="Search exercise by name or category…"
                  value={exSearch}
                  onChange={(e) => setExSearch(e.target.value)}
                />
              </div>
              <select
                value={exCategory}
                onChange={(e) => setExCategory(e.target.value)}
              >
                {EXERCISE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Exercises List */}
            <div className="exercise-library-catalog">
              {filteredExercises.map((ex) => (
                <div key={ex.id} className="catalog-exercise-item">
                  <div className="cat-item-main">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong>{ex.name}</strong>
                      <span className="pill small ghost">{ex.category}</span>
                    </div>
                    {ex.coachingCues && ex.coachingCues.length > 0 && (
                      <p className="cat-cues-text">
                        Cues: {ex.coachingCues.slice(0, 2).join(" · ")}
                      </p>
                    )}
                    <small className="cat-meta-text">
                      Default: {ex.defaultSets} × {ex.defaultReps} {ex.defaultDistance ? `· ${ex.defaultDistance}` : ""} · Rest: {ex.defaultRest}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="button small dark"
                    onClick={() => handleSelectExercise(ex)}
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Manual Custom Exercise Creation Modal */}
      {customExerciseModalOpen && (
        <Modal
          title={`Add Custom Exercise Manually (${activeDay.dayOfWeek || "Session"})`}
          onClose={() => setCustomExerciseModalOpen(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="plan-builder-input-group" style={{ margin: 0 }}>
              <label>Exercise / Drill Name *</label>
              <input
                type="text"
                placeholder="e.g. Heavy Sled Sprints (15kg), 3-Point Falling Starts..."
                value={customExForm.name}
                onChange={(e) => setCustomExForm({ ...customExForm, name: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-row-2">
              <div className="plan-builder-input-group" style={{ margin: 0 }}>
                <label>Category:</label>
                <select
                  value={customExForm.category}
                  onChange={(e) => setCustomExForm({ ...customExForm, category: e.target.value })}
                >
                  <option value="Acceleration">Acceleration</option>
                  <option value="Maximum Velocity">Maximum Velocity</option>
                  <option value="Speed Endurance">Speed Endurance</option>
                  <option value="Sprint Technique">Sprint Technique</option>
                  <option value="Strength">Strength</option>
                  <option value="Power">Power</option>
                  <option value="Plyometrics">Plyometrics</option>
                  <option value="Mobility">Mobility</option>
                  <option value="Recovery">Recovery</option>
                </select>
              </div>
              <div className="plan-builder-input-group" style={{ margin: 0 }}>
                <label>Target Intensity:</label>
                <input
                  type="text"
                  placeholder="e.g. 95%, Max, Moderate"
                  value={customExForm.intensity}
                  onChange={(e) => setCustomExForm({ ...customExForm, intensity: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row-3">
              <div className="plan-builder-input-group" style={{ margin: 0 }}>
                <label>Sets:</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={customExForm.sets}
                  onChange={(e) => setCustomExForm({ ...customExForm, sets: Number(e.target.value) })}
                />
              </div>
              <div className="plan-builder-input-group" style={{ margin: 0 }}>
                <label>Reps per Set:</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={customExForm.reps}
                  onChange={(e) => setCustomExForm({ ...customExForm, reps: Number(e.target.value) })}
                />
              </div>
              <div className="plan-builder-input-group" style={{ margin: 0 }}>
                <label>Distance / Load:</label>
                <input
                  type="text"
                  placeholder="e.g. 30m, 80kg, 6 hurdles"
                  value={customExForm.distance}
                  onChange={(e) => setCustomExForm({ ...customExForm, distance: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="plan-builder-input-group" style={{ margin: 0 }}>
                <label>Rest Interval:</label>
                <input
                  type="text"
                  placeholder="e.g. 3 min, 90 sec, Full"
                  value={customExForm.rest}
                  onChange={(e) => setCustomExForm({ ...customExForm, rest: e.target.value })}
                />
              </div>
              <div className="plan-builder-input-group" style={{ margin: 0 }}>
                <label>Coaching Cues / Technical Reminders:</label>
                <input
                  type="text"
                  placeholder="e.g. Low heel recovery, stiff ground strikes"
                  value={customExForm.cues}
                  onChange={(e) => setCustomExForm({ ...customExForm, cues: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <button
                type="button"
                className="button ghost"
                onClick={() => setCustomExerciseModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button orange"
                onClick={handleSaveCustomExercise}
              >
                <Plus size={14} /> Add to Session
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
