import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import {
  Activity,
  HeartPulse,
  Clock3,
  Calendar,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  Target,
  BookOpen,
  Award,
  Zap,
  TrendingUp,
  Sliders,
  ShieldAlert,
  Mail,
} from "lucide-react";
import { PageTitle, Modal, Actions } from "../components/UI";
import { today, dateLabel } from "../lib/forms";
import {
  getTrainingRoadmap,
  getTrainingGoals,
  updateTrainingGoals,
  getWeeklyPlan,
  getWeeklyPlansBoth,
  generateWeeklyPlan,
  checkInSession,
  getWeeklyReview,
  getRealityCheck,
  getTrainingLibrary,
  sendSundayDigestEmail,
} from "../lib/api";
import { EXERCISE_LIBRARY, SPRINT_TRAINING_QUALITIES } from "../lib/trainingKnowledge";

export default function Training() {
  const { data, user, action, busy, notify } = useOutletContext();
  const profile = data?.profile || {};

  const [activeTab, setActiveTab] = useState("ai-plan"); // "ai-plan" | "coach-plan" | "roadmap" | "reality" | "library" | "legacy"
  const [loading, setLoading] = useState(true);

  // Training state
  const [roadmap, setRoadmap] = useState(null);
  const [goals, setGoals] = useState(null);
  const [aiPlan, setAiPlan] = useState(null);
  const [coachPlan, setCoachPlan] = useState(null);
  const [realityCheck, setRealityCheck] = useState(null);
  const [activeCheckingPlan, setActiveCheckingPlan] = useState(null);

  // Dialogs
  const [selectedDayIndex, setSelectedDayIndex] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [weeklyReviewData, setWeeklyReviewData] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  async function handleSendSundayDigest() {
    setSendingEmail(true);
    try {
      const res = await sendSundayDigestEmail(user?.id, user?.email);
      if (res?.ok) {
        notify?.(
          res.isSmtpConfigured
            ? `Sunday Digest Email sent to ${res.toEmail}!`
            : `Sunday Digest compiled! (Simulation mode - Add SMTP credentials to .env whenever ready)`
        );
      } else {
        notify?.("Unable to send Sunday digest: " + (res?.error || "Unknown error"), "error");
      }
    } catch (err) {
      notify?.("Error sending Sunday digest email: " + err.message, "error");
    } finally {
      setSendingEmail(false);
    }
  }

  // Check-in form state
  const [checkInStatus, setCheckInStatus] = useState("completed");
  const [missedReason, setMissedReason] = useState("No time");
  const [actualSets, setActualSets] = useState("");
  const [actualReps, setActualReps] = useState("");
  const [actualMetric, setActualMetric] = useState("");
  const [rpe, setRpe] = useState(7);
  const [recoveryStatus, setRecoveryStatus] = useState("Good");
  const [painFlag, setPainFlag] = useState(false);
  const [checkInNotes, setCheckInNotes] = useState("");

  // Goal edit form state
  const [editYearTarget, setEditYearTarget] = useState("");
  const [editYearDate, setEditYearDate] = useState("");
  const [editMonthObjective, setEditMonthObjective] = useState("");
  const [editMonth10m, setEditMonth10m] = useState("");
  const [editMonthBroadJump, setEditMonthBroadJump] = useState("");

  const currentPlan = activeTab === "coach-plan" ? coachPlan : aiPlan;

  async function loadTrainingData() {
    try {
      setLoading(true);
      const [rmRes, gRes, pairRes, singlePlan, rcRes] = await Promise.all([
        getTrainingRoadmap().catch(() => null),
        getTrainingGoals().catch(() => null),
        getWeeklyPlansBoth().catch(() => null),
        getWeeklyPlan().catch(() => null),
        getRealityCheck().catch(() => null),
      ]);
      setRoadmap(rmRes);
      setGoals(gRes);
      const ai = pairRes?.aiPlan || (singlePlan?.source !== "coach" ? singlePlan : null);
      const coach = pairRes?.coachPlan || (singlePlan?.source === "coach" ? singlePlan : null);
      setAiPlan(ai);
      setCoachPlan(coach);
      setRealityCheck(rcRes);

      if (gRes) {
        setEditYearTarget(gRes.yearGoal?.targetValue || "");
        setEditYearDate(gRes.yearGoal?.targetDate || "");
        setEditMonthObjective(gRes.monthGoal?.primaryObjective || "");
        setEditMonth10m(gRes.monthGoal?.targets?.sprint10m || "");
        setEditMonthBroadJump(gRes.monthGoal?.targets?.standingBroadJump || "");
      }
    } catch (err) {
      console.error("Failed to load training data", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrainingData();
  }, []);

  function openCheckIn(index, targetPlan = currentPlan) {
    if (!targetPlan || !targetPlan.days || !targetPlan.days[index]) return;
    setActiveCheckingPlan(targetPlan);
    const day = targetPlan.days[index];
    setSelectedDayIndex(index);
    const c = day.athleteCompletion || {};
    setCheckInStatus(c.status || "completed");
    setMissedReason(c.missedReason || "No time");
    setActualSets(c.actualExercises?.[0]?.actualSets || "");
    setActualReps(c.actualExercises?.[0]?.actualReps || "");
    setActualMetric(c.actualExercises?.[0]?.actualMetric || "");
    setRpe(c.rpe || 7);
    setRecoveryStatus(c.recovery || "Good");
    setPainFlag(!!c.painFlag);
    setCheckInNotes(c.notes || "");
  }

  async function handleSaveCheckIn() {
    const targetPlan = activeCheckingPlan || currentPlan;
    if (selectedDayIndex === null || !targetPlan) return;
    const day = targetPlan.days[selectedDayIndex];
    const payload = {
      status: checkInStatus,
      missedReason: checkInStatus === "missed" ? missedReason : undefined,
      rpe: Number(rpe),
      recovery: recoveryStatus,
      painFlag,
      notes: checkInNotes,
      actualExercises: (day.exercises || []).map((ex, idx) => ({
        exerciseId: ex.id,
        name: ex.name,
        actualSets: actualSets || ex.sets,
        actualReps: actualReps || ex.reps,
        actualMetric: idx === 0 ? actualMetric : undefined,
        completed: checkInStatus === "completed" || checkInStatus === "partial",
      })),
    };

    try {
      const res = await checkInSession(targetPlan.id, selectedDayIndex, payload);
      if (targetPlan.source === "coach") {
        setCoachPlan(res.plan);
      } else {
        setAiPlan(res.plan);
      }
      setSelectedDayIndex(null);
      notify?.("Session recorded successfully.");
      // Refresh reality check and roadmap
      const [rmRes, rcRes] = await Promise.all([
        getTrainingRoadmap().catch(() => null),
        getRealityCheck().catch(() => null),
      ]);
      if (rmRes) setRoadmap(rmRes);
      if (rcRes) setRealityCheck(rcRes);
    } catch (err) {
      notify?.("Error saving session: " + err.message);
    }
  }

  async function handleGenerateNextWeek(force = false) {
    try {
      const res = await generateWeeklyPlan(undefined, force);
      setAiPlan(res.plan);
      setReviewModalOpen(false);
      notify?.("Adaptive weekly plan generated successfully.");
      loadTrainingData();
    } catch (err) {
      notify?.("Error generating plan: " + err.message);
    }
  }

  async function handleOpenSundayReview() {
    const planToReview = currentPlan || aiPlan;
    if (!planToReview) return;
    try {
      const rev = await getWeeklyReview(planToReview.id);
      setWeeklyReviewData(rev.review);
      setReviewModalOpen(true);
    } catch (err) {
      notify?.("Error loading review: " + err.message);
    }
  }

  async function handleSaveGoals(e) {
    e.preventDefault();
    try {
      const updated = {
        yearGoal: {
          ...goals?.yearGoal,
          targetValue: editYearTarget ? Number(editYearTarget) : goals?.yearGoal?.targetValue,
          targetDate: editYearDate || goals?.yearGoal?.targetDate,
        },
        monthGoal: {
          ...goals?.monthGoal,
          primaryObjective: editMonthObjective || goals?.monthGoal?.primaryObjective,
          targets: {
            ...goals?.monthGoal?.targets,
            sprint10m: editMonth10m ? Number(editMonth10m) : goals?.monthGoal?.targets?.sprint10m,
            standingBroadJump: editMonthBroadJump ? Number(editMonthBroadJump) : goals?.monthGoal?.targets?.standingBroadJump,
          },
        },
      };
      const res = await updateTrainingGoals(updated);
      setGoals(res.goals);
      setGoalsModalOpen(false);
      notify?.("Goals updated successfully.");
      const rcRes = await getRealityCheck().catch(() => null);
      if (rcRes) setRealityCheck(rcRes);
    } catch (err) {
      notify?.("Error updating goals: " + err.message);
    }
  }

  const currentLevel = roadmap?.levels?.find((l) => l.isCurrent) || roadmap?.levels?.[0];

  return (
    <>
      <PageTitle
        kicker="ADAPTIVE ATHLETE ENGINE · SPRINT DEVELOPMENT"
        title="Adaptive Sprint Training"
        subtitle="Controlled sports science progression based on your real performance, recovery, and competition goals."
        action={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="button dark"
              disabled={busy}
              onClick={handleOpenSundayReview}
            >
              <RotateCcw size={15} />
              Sunday Review & Adaptation
            </button>
            <button
              className="button secondary"
              disabled={sendingEmail}
              onClick={handleSendSundayDigest}
              title="Receive your 7-day upcoming training plan & last week performance review via email"
            >
              <Mail size={15} />
              {sendingEmail ? "Sending Email..." : "Email Sunday Digest"}
            </button>
            <button
              className="button orange"
              disabled={busy}
              onClick={() => setGoalsModalOpen(true)}
            >
              <Target size={15} />
              Configure Goals
            </button>
          </div>
        }
      />

      {/* Primary Training Navigation Tabs */}
      <div className="training-tabs">
        <button
          className={`training-tab ${activeTab === "ai-plan" || activeTab === "week" ? "active" : ""}`}
          onClick={() => setActiveTab("ai-plan")}
        >
          <Sparkles size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
          AI-Generated Plan
        </button>
        <button
          className={`training-tab ${activeTab === "coach-plan" ? "active" : ""}`}
          onClick={() => setActiveTab("coach-plan")}
        >
          <Calendar size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
          Coach Plan
          {coachPlan && (
            <span
              className="pill small green"
              style={{ marginLeft: 6, padding: "1px 6px", fontSize: 10, verticalAlign: "middle" }}
            >
              Active
            </span>
          )}
        </button>
        <button
          className={`training-tab ${activeTab === "roadmap" ? "active" : ""}`}
          onClick={() => setActiveTab("roadmap")}
        >
          <Layers size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
          Sprint Journey Roadmap (Level {currentLevel?.level || 1})
        </button>
        <button
          className={`training-tab ${activeTab === "reality" ? "active" : ""}`}
          onClick={() => setActiveTab("reality")}
        >
          <TrendingUp size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
          Reality Check & Goal Gap
        </button>
        <button
          className={`training-tab ${activeTab === "library" ? "active" : ""}`}
          onClick={() => setActiveTab("library")}
        >
          <BookOpen size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
          Exercise Library & Evidence
        </button>
        <button
          className={`training-tab ${activeTab === "legacy" ? "active" : ""}`}
          onClick={() => setActiveTab("legacy")}
        >
          <Sliders size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
          Saved Plan Archive
        </button>
      </div>

      {/* PLAN VIEWS: AI PLAN OR COACH PLAN */}
      {(activeTab === "ai-plan" || activeTab === "week" || activeTab === "coach-plan") && (
        <>
          {/* Dual Plan Selector Toggle Cards */}
          <div className="plan-type-toggle-container">
            <button
              type="button"
              className={`plan-type-tab-btn ${activeTab === "ai-plan" || activeTab === "week" ? "active" : ""}`}
              onClick={() => setActiveTab("ai-plan")}
            >
              <div className="tab-icon-wrap">
                <Sparkles size={18} />
              </div>
              <div className="tab-info">
                <span className="tab-title">AI-Generated Plan</span>
                <span className="tab-sub">Adaptive sports science microcycle</span>
              </div>
              <span className="tab-badge ai">Adaptive Engine</span>
            </button>

            <button
              type="button"
              className={`plan-type-tab-btn ${activeTab === "coach-plan" ? "active" : ""}`}
              onClick={() => setActiveTab("coach-plan")}
            >
              <div className="tab-icon-wrap">
                <Calendar size={18} />
              </div>
              <div className="tab-info">
                <span className="tab-title">Coach Prescribed Plan</span>
                <span className="tab-sub">
                  {coachPlan ? `Prescribed by Coach · Version ${coachPlan.version || 1}` : "Awaiting coach microcycle"}
                </span>
              </div>
              <span className={`tab-badge ${coachPlan ? "published" : "pending"}`}>
                {coachPlan ? "Published" : "Not Assigned"}
              </span>
            </button>
          </div>

          {/* RENDER SPECIFIC PLAN CONTENT */}
          {activeTab === "coach-plan" ? (
            coachPlan ? (
              <>
                <div className="panel panel-pad" style={{ marginBottom: 20 }}>
                  <div className="week-plan-header">
                    <div>
                      <span className="eyebrow" style={{ color: "#748265" }}>
                        OFFICIAL COACH PRESCRIBED MICROCYCLE · {coachPlan.weekStart} TO {coachPlan.weekEnd}
                      </span>
                      <h2 style={{ margin: "4px 0 6px" }}>
                        {coachPlan.weeklyObjective || "Coach Prescribed Training Routine"}
                      </h2>
                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <span className="pill small green">
                          Coach Plan · Version {coachPlan.version || 1} · Published
                        </span>
                        <span className="pill small">Phase: {coachPlan.phase || "Foundation"}</span>
                        <span className="pill small">
                          Adherence: {coachPlan.days?.filter((d) => d.athleteCompletion?.status === "completed").length || 0} / {coachPlan.days?.length || 7} completed
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="notice" style={{ marginTop: 10, background: "#f0f7ec", borderColor: "#cddfbf", color: "#2d4421" }}>
                    <CheckCircle2 size={14} color="#2e7d32" style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                    <strong>Official Coaching Schedule:</strong> Prescribed specifically for your progression by your coach. Complete your daily session check-ins below to report RPE, recovery status, and fatigue directly to your coach.
                  </div>

                  {/* Daily Interactive Cards for Coach Plan */}
                  <div className="week-grid" style={{ marginTop: 18 }}>
                    {coachPlan.days?.map((d, i) => {
                      const isCompleted = d.athleteCompletion?.status === "completed";
                      const isMissed = d.athleteCompletion?.status === "missed";
                      const isPartial = d.athleteCompletion?.status === "partial";
                      const isToday = d.date === today();

                      return (
                        <article
                          className={`day-interactive-card ${isToday ? "today" : ""}`}
                          key={d.dayOfWeek + i}
                          onClick={() => openCheckIn(i, coachPlan)}
                        >
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <span className="eyebrow" style={{ fontWeight: 700 }}>
                                {d.dayOfWeek.slice(0, 3)} <b>{d.date ? d.date.slice(8) : `0${i + 1}`}</b>
                              </span>
                              <span
                                className={`day-status-pill ${
                                  isCompleted ? "completed" : isMissed ? "missed" : isPartial ? "partial" : "scheduled"
                                }`}
                              >
                                {isCompleted
                                  ? "✓ Completed"
                                  : isMissed
                                  ? "❌ Missed"
                                  : isPartial
                                  ? "◐ Partial"
                                  : "○ Scheduled"}
                              </span>
                            </div>

                            <h3 style={{ fontSize: 15, margin: "6px 0 4px" }}>{d.sessionType}</h3>
                            <p style={{ fontSize: 12, color: "#647253", margin: "0 0 6px" }}>
                              {d.objective}
                            </p>

                            {/* Coach Specific Cues */}
                            {d.coachNotes && (
                              <div className="coach-cue-banner">
                                💬 <strong>Coach Cue:</strong> {d.coachNotes}
                              </div>
                            )}

                            <div style={{ fontSize: 11, color: "#4f5a42", marginBottom: 12 }}>
                              {d.exercises && d.exercises.length > 0 ? (
                                <span>{d.exercises.length} exercises planned ({d.exercises[0].name})</span>
                              ) : (
                                <span>Rest / Active Recovery</span>
                              )}
                            </div>
                          </div>

                          <div style={{ borderTop: "1px solid #e2e8d8", paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span className="day-duration" style={{ fontSize: 11, color: "#6b785d", display: "flex", alignItems: "center", gap: 4 }}>
                              <Clock3 size={13} />
                              {d.expectedDuration ? `${d.expectedDuration} MIN` : "RECOVER"}
                            </span>
                            <button
                              type="button"
                              className="button ghost small"
                              style={{ padding: "4px 8px", fontSize: 11 }}
                            >
                              {d.athleteCompletion?.status ? "Edit Check-in" : "Check-in ↗"}
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="panel panel-pad" style={{ textAlign: "center", padding: "60px 20px", marginBottom: 20 }}>
                <div style={{ display: "inline-flex", padding: 18, borderRadius: "50%", background: "#f0f4eb", color: "#23341b", marginBottom: 16 }}>
                  <Calendar size={38} />
                </div>
                <h3 style={{ fontSize: 20, margin: "0 0 8px", color: "#1a1e24" }}>No Coach Plan Published for this Week</h3>
                <p style={{ maxWidth: 520, margin: "0 auto 20px", color: "#6a775b", fontSize: 13.5, lineHeight: 1.5 }}>
                  Your connected coach has not published a training microcycle for this week yet. You can follow your AI-Generated plan in the meantime, and as soon as your coach publishes your schedule, it will appear here automatically.
                </p>
                <button
                  type="button"
                  className="button orange"
                  onClick={() => setActiveTab("ai-plan")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, margin: "0 auto" }}
                >
                  <Sparkles size={15} />
                  <span>Switch to AI-Generated Plan</span>
                </button>
              </div>
            )
          ) : (
            /* AI GENERATED PLAN VIEW */
            <>
              {/* Quick Reality Check Callout */}
              {realityCheck && (
                <div className={`reality-banner ${realityCheck.trend === "improving" ? "improving" : realityCheck.trend === "regressing" ? "regressing" : "stable"}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>
                      {realityCheck.trend === "improving" ? "✓ Reality Check · On Track" : realityCheck.trend === "regressing" ? "⚠ Reality Check · Needs Attention" : "• Reality Check · Steady Progress"}
                    </strong>
                    <span className="pill small">{profile.event || "100m"}</span>
                  </div>
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "#37422d" }}>
                    {realityCheck.assessment}
                  </p>
                </div>
              )}

              {/* Week Plan Header */}
              <div className="panel panel-pad" style={{ marginBottom: 20 }}>
                <div className="week-plan-header">
                  <div>
                    <span className="eyebrow" style={{ color: "#748265" }}>
                      AI-POWERED ADAPTIVE ENGINE · CURRENT CYCLE: {aiPlan?.weekStart} TO {aiPlan?.weekEnd}
                    </span>
                    <h2 style={{ margin: "4px 0 6px" }}>{aiPlan?.weeklyObjective || "Acceleration & Technical Mechanics"}</h2>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span className="source-tag">
                        Adaptive Self-Guided Plan · Version {aiPlan?.version || 1}
                      </span>
                      <span className="pill small">Phase: {aiPlan?.phase || "Acceleration"}</span>
                      <span className="pill small">
                        Adherence: {aiPlan?.days?.filter((d) => d.athleteCompletion?.status === "completed").length || 0} / {aiPlan?.days?.length || 7} completed
                      </span>
                    </div>
                  </div>
                  <div>
                    <button
                      className="button ghost small"
                      disabled={busy}
                      onClick={() => handleGenerateNextWeek(true)}
                      title="Recalculate plan based on recent completion and recovery"
                    >
                      <RotateCcw size={14} />
                      Re-adapt Plan
                    </button>
                  </div>
                </div>

                <div className="notice" style={{ marginTop: 8 }}>
                  <Info size={14} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
                  <strong>Self-guided plan:</strong> Generated from your athlete profile, training history, and controlled sprint science rules. It is not a substitute for individualized coaching or medical advice.
                </div>

                {/* Daily Interactive Cards */}
                <div className="week-grid" style={{ marginTop: 18 }}>
                  {aiPlan?.days?.map((d, i) => {
                    const isCompleted = d.athleteCompletion?.status === "completed";
                    const isMissed = d.athleteCompletion?.status === "missed";
                    const isPartial = d.athleteCompletion?.status === "partial";
                    const isToday = d.date === today();

                    return (
                      <article
                        className={`day-interactive-card ${isToday ? "today" : ""}`}
                        key={d.dayOfWeek + i}
                        onClick={() => openCheckIn(i, aiPlan)}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span className="eyebrow" style={{ fontWeight: 700 }}>
                              {d.dayOfWeek.slice(0, 3)} <b>{d.date ? d.date.slice(8) : `0${i + 1}`}</b>
                            </span>
                            <span
                              className={`day-status-pill ${
                                isCompleted ? "completed" : isMissed ? "missed" : isPartial ? "partial" : "scheduled"
                              }`}
                            >
                              {isCompleted
                                ? "✓ Completed"
                                : isMissed
                                ? "❌ Missed"
                                : isPartial
                                ? "◐ Partial"
                                : "○ Scheduled"}
                            </span>
                          </div>

                          <h3 style={{ fontSize: 15, margin: "6px 0 4px" }}>{d.sessionType}</h3>
                          <p style={{ fontSize: 12, color: "#647253", margin: "0 0 10px" }}>
                            {d.objective}
                          </p>

                          <div style={{ fontSize: 11, color: "#4f5a42", marginBottom: 12 }}>
                            {d.exercises && d.exercises.length > 0 ? (
                              <span>{d.exercises.length} exercises planned ({d.exercises[0].name})</span>
                            ) : (
                              <span>Rest / Active Recovery</span>
                            )}
                          </div>
                        </div>

                        <div style={{ borderTop: "1px solid #e2e8d8", paddingTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span className="day-duration" style={{ fontSize: 11, color: "#6b785d", display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock3 size={13} />
                            {d.expectedDuration ? `${d.expectedDuration} MIN` : "RECOVER"}
                          </span>
                          <button
                            type="button"
                            className="button ghost small"
                            style={{ padding: "4px 8px", fontSize: 11 }}
                          >
                            {d.athleteCompletion?.status ? "Edit Check-in" : "Check-in ↗"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* TAB 2: ROADMAP LEVELS */}
      {activeTab === "roadmap" && (
        <section className="panel panel-pad">
          <div className="panel-title">
            <div>
              <span className="eyebrow">LONG-TERM PROGRESSION ARCHITECTURE</span>
              <h2>Sprint Journey Roadmap</h2>
              <p style={{ margin: "4px 0 0", color: "#677558", fontSize: 13 }}>
                Progress through objective development phases. Levels unlock only when verifiable criteria are satisfied — never simply by the passage of time.
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span className="eyebrow">CURRENT STAGE</span>
              <h3 style={{ margin: 0, color: "#2e3b23" }}>
                Level {currentLevel?.level}: {currentLevel?.name}
              </h3>
            </div>
          </div>

          <div className="roadmap-container">
            {roadmap?.levels?.map((lvl) => {
              const isDone = lvl.isCompleted;
              const isCurrent = lvl.isCurrent;
              const isLocked = !isDone && !isCurrent;

              return (
                <div
                  className={`level-card ${isCurrent ? "current" : ""} ${isLocked ? "locked" : ""}`}
                  key={lvl.level}
                >
                  <div className="level-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span
                        className={`level-badge ${
                          isDone ? "done" : isCurrent ? "current" : "locked"
                        }`}
                      >
                        {isDone ? "✓ Level Complete" : isCurrent ? `★ Active Level ${lvl.level}` : `🔒 Level ${lvl.level}`}
                      </span>
                      <h3 className="level-title">
                        {lvl.name} · <span style={{ fontWeight: 400, fontSize: 14, color: "#59664d" }}>{lvl.description}</span>
                      </h3>
                    </div>
                    <div>
                      <strong style={{ fontSize: 13, color: isCurrent ? "#2e3b23" : "#69775b" }}>
                        {lvl.progressPercentage}% verified
                      </strong>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="progress-track">
                    <div
                      className={`progress-fill ${isDone ? "green" : ""}`}
                      style={{ width: `${lvl.progressPercentage}%` }}
                    />
                  </div>

                  {/* Criteria Checklist */}
                  <div className="level-criteria-list">
                    {lvl.criteria?.map((crit) => (
                      <div
                        className={`criteria-item ${crit.isMet ? "met" : ""}`}
                        key={crit.id}
                      >
                        {crit.isMet ? (
                          <CheckCircle2 size={16} color="#2b7a1f" />
                        ) : (
                          <span style={{ width: 16, height: 16, borderRadius: "50%", border: "1.5px solid #a3b294", display: "inline-block" }} />
                        )}
                        <span>{crit.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="notice" style={{ marginTop: 24 }}>
            <Award size={15} style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
            <strong>Universal Athletics Architecture:</strong> This controlled roadmap follows established sprint development models. The same foundational structure adapts for Middle Distance, Hurdles, Jumps, Throws, Swimming, and Field Sports.
          </div>
        </section>
      )}

      {/* TAB 3: REALITY CHECK & GOALS */}
      {activeTab === "reality" && (
        <div>
          {/* Reality Check Main Panel */}
          {realityCheck && (
            <div className={`reality-banner ${realityCheck.trend === "improving" ? "improving" : realityCheck.trend === "regressing" ? "regressing" : "stable"}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span className="eyebrow" style={{ color: "#748265" }}>OBJECTIVE AUDIT</span>
                  <h2 style={{ margin: "4px 0" }}>Athlete Reality Check</h2>
                </div>
                <span className="pill">{profile.event || "100m"}</span>
              </div>

              <div className="reality-grid">
                <div className="reality-stat">
                  <span>Current PB</span>
                  <strong>{realityCheck.currentPB ? `${realityCheck.currentPB} s` : "N/A"}</strong>
                </div>
                <div className="reality-stat">
                  <span>Year Target</span>
                  <strong>{realityCheck.yearTarget ? `${realityCheck.yearTarget} s` : "N/A"}</strong>
                </div>
                <div className="reality-stat">
                  <span>Performance Gap</span>
                  <strong style={{ color: realityCheck.gap > 0 ? "#c92c2c" : "#2b7a1f" }}>
                    {realityCheck.gap !== null ? `${realityCheck.gap.toFixed(2)} s` : "N/A"}
                  </strong>
                </div>
                <div className="reality-stat">
                  <span>Training Adherence</span>
                  <strong>{realityCheck.adherenceRate}%</strong>
                </div>
                <div className="reality-stat">
                  <span>Recent Trend</span>
                  <strong style={{ textTransform: "capitalize" }}>{realityCheck.trend}</strong>
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "14px 16px", borderRadius: 4, marginTop: 12, border: "1px solid #d5dec6" }}>
                <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "#222a1b" }}>Assessment</h4>
                <p style={{ margin: 0, fontSize: 13, color: "#47543d", lineHeight: 1.5 }}>
                  {realityCheck.assessment}
                </p>
              </div>

              <div style={{ background: "#ffffff", padding: "14px 16px", borderRadius: 4, marginTop: 10, border: "1px solid #d5dec6" }}>
                <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "#222a1b" }}>Recommended Action</h4>
                <p style={{ margin: 0, fontSize: 13, color: "#47543d", lineHeight: 1.5 }}>
                  {realityCheck.recommendation}
                </p>
              </div>
            </div>
          )}

          {/* Goals Row */}
          <div className="goals-row">
            {/* Year Goal Box */}
            <div className="goal-box">
              <div className="goal-box-header">
                <div>
                  <span className="eyebrow">SEASON GOAL</span>
                  <h3 style={{ margin: 0 }}>Year Goal · {goals?.yearGoal?.event || "100m"}</h3>
                </div>
                <span className="pill small">{goals?.yearGoal?.competitionTarget || "Target Championship"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", margin: "14px 0 8px" }}>
                <div>
                  <small style={{ color: "#6a795b" }}>Starting PB</small>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{goals?.yearGoal?.startingPB ? `${goals.yearGoal.startingPB}s` : "12.21s"}</div>
                </div>
                <div>
                  <small style={{ color: "#6a795b" }}>Current PB</small>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{profile.metric ? `${profile.metric}s` : "11.82s"}</div>
                </div>
                <div>
                  <small style={{ color: "#6a795b" }}>Year Target</small>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#2b7a1f" }}>
                    {goals?.yearGoal?.targetValue ? `${goals.yearGoal.targetValue}s` : "11.70s"}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#5f6c51" }}>
                  <span>Season Progress</span>
                  <span>{goals?.yearGoal?.progressPercentage || 68}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${goals?.yearGoal?.progressPercentage || 68}%` }} />
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 11, color: "#677558" }}>
                Target Date: <strong>{dateLabel(goals?.yearGoal?.targetDate || "2027-06-20")}</strong>
              </div>
            </div>

            {/* Month Goal Box */}
            <div className="goal-box">
              <div className="goal-box-header">
                <div>
                  <span className="eyebrow">MONTHLY MESOCYCLE</span>
                  <h3 style={{ margin: 0 }}>Month Goal · {goals?.monthGoal?.month || "Current Month"}</h3>
                </div>
                <span className="pill small">{goals?.monthGoal?.phase || "Acceleration"}</span>
              </div>

              <div style={{ margin: "12px 0" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#242c1e" }}>
                  Primary: {goals?.monthGoal?.primaryObjective || "Improve 0–20m acceleration"}
                </div>
                <p style={{ fontSize: 12, color: "#647253", margin: "4px 0 0" }}>
                  Secondary: {goals?.monthGoal?.secondaryObjective || "Lower-body horizontal power"}
                </p>
              </div>

              <div style={{ background: "#f8f9f4", padding: 12, borderRadius: 4, display: "flex", justifyContent: "space-around" }}>
                <div style={{ textAlign: "center" }}>
                  <small style={{ color: "#6e7c61" }}>10m Acceleration</small>
                  <strong style={{ display: "block", fontSize: 14 }}>
                    {goals?.monthGoal?.targets?.sprint10m ? `${goals.monthGoal.targets.sprint10m}s` : "1.98s"}
                  </strong>
                </div>
                <div style={{ textAlign: "center" }}>
                  <small style={{ color: "#6e7c61" }}>Standing Broad Jump</small>
                  <strong style={{ display: "block", fontSize: 14 }}>
                    {goals?.monthGoal?.targets?.standingBroadJump ? `${goals.monthGoal.targets.standingBroadJump}m` : "2.45m"}
                  </strong>
                </div>
                <div style={{ textAlign: "center" }}>
                  <small style={{ color: "#6e7c61" }}>Recovery Rule</small>
                  <strong style={{ display: "block", fontSize: 14 }}>Avg RPE &le; 7.5</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXERCISE LIBRARY & EVIDENCE */}
      {activeTab === "library" && (
        <section className="panel panel-pad">
          <div className="panel-title">
            <div>
              <span className="eyebrow">SPORTS SCIENCE KNOWLEDGE REPOSITORY</span>
              <h2>Sprint Exercise Library & Evidence</h2>
              <p style={{ margin: "4px 0 0", color: "#677558", fontSize: 13 }}>
                Centralized exercises tagged with suitable events, equipment, coaching cues, and research literature.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginTop: 16 }}>
            {EXERCISE_LIBRARY.map((ex) => (
              <div
                key={ex.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #d5dec6",
                  borderRadius: 6,
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <span className="pill small">{ex.category}</span>
                    <span style={{ fontSize: 10, color: "#748265", textTransform: "uppercase" }}>{ex.intensityType} Intensity</span>
                  </div>
                  <h3 style={{ fontSize: 16, margin: "8px 0 4px" }}>{ex.name}</h3>
                  <div style={{ fontSize: 12, color: "#546048", marginBottom: 10 }}>
                    <strong>Default Dose:</strong> {ex.sets} sets &times; {ex.reps} reps {ex.distance ? `(${ex.distance})` : ""} · Rest: {ex.rest}
                  </div>

                  <div style={{ fontSize: 12, color: "#3e4835", background: "#f8f9f5", padding: "8px 10px", borderRadius: 4, marginBottom: 8 }}>
                    <strong>Coaching Cues:</strong>
                    <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                      {ex.coachingCues?.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>

                  {ex.scientificEvidence && (
                    <div style={{ fontSize: 11, color: "#6e7c61" }}>
                      📚 Evidence: <em>{ex.scientificEvidence}</em>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 5: SAVED PLANS (LEGACY ARCHIVE) */}
      {activeTab === "legacy" && (
        <section className="panel panel-pad">
          <div className="panel-title">
            <div>
              <span className="eyebrow">ARCHIVE</span>
              <h2>Legacy Saved Plans</h2>
              <p style={{ margin: "4px 0 0", color: "#677558", fontSize: 13 }}>
                Historical simple plans saved prior to the adaptive training engine.
              </p>
            </div>
          </div>
          {data?.plans?.length ? (
            data.plans.map((p) => (
              <div className="saved-plan" key={p.id} style={{ marginTop: 12 }}>
                <div className="panel-title">
                  <div>
                    <h3>{p.title}</h3>
                    <small>
                      {p.days?.filter((d) => d.done).length} / {p.days?.length} days complete
                    </small>
                  </div>
                  <Actions edit={() => {}} remove={() => {}} />
                </div>
              </div>
            ))
          ) : (
            <p style={{ marginTop: 16, color: "#677558" }}>No legacy plans found.</p>
          )}
        </section>
      )}

      {/* MODAL 1: DAILY CHECK-IN DIALOG */}
      {selectedDayIndex !== null && plan?.days?.[selectedDayIndex] && (
        <Modal
          title={`Daily Training Check-in · ${plan.days[selectedDayIndex].dayOfWeek} (${plan.days[selectedDayIndex].date})`}
          onClose={() => setSelectedDayIndex(null)}
        >
          <div style={{ maxHeight: "75vh", overflowY: "auto", paddingRight: 4 }}>
            <div style={{ marginBottom: 14 }}>
              <span className="pill small">{plan.days[selectedDayIndex].sessionType}</span>
              <h3 style={{ margin: "6px 0 2px" }}>{plan.days[selectedDayIndex].objective}</h3>
              <p style={{ fontSize: 12, color: "#606d53", margin: 0 }}>
                Duration: {plan.days[selectedDayIndex].expectedDuration} min · Target Intensity: {plan.days[selectedDayIndex].targetIntensity}
              </p>
            </div>

            {/* Status Selector */}
            <div style={{ display: "flex", gap: 10, margin: "14px 0" }}>
              <button
                type="button"
                className={`button ${checkInStatus === "completed" ? "orange" : "ghost"}`}
                style={{ flex: 1 }}
                onClick={() => setCheckInStatus("completed")}
              >
                ✓ Completed
              </button>
              <button
                type="button"
                className={`button ${checkInStatus === "partial" ? "orange" : "ghost"}`}
                style={{ flex: 1 }}
                onClick={() => setCheckInStatus("partial")}
              >
                ◐ Partial
              </button>
              <button
                type="button"
                className={`button ${checkInStatus === "missed" ? "orange" : "ghost"}`}
                style={{ flex: 1 }}
                onClick={() => setCheckInStatus("missed")}
              >
                ❌ Missed
              </button>
            </div>

            {/* If Missed: Why missed? */}
            {checkInStatus === "missed" && (
              <div style={{ background: "#fef3f3", border: "1px solid #f8d7da", padding: 14, borderRadius: 4, margin: "12px 0" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#721c24", marginBottom: 6 }}>
                  Why was this session missed?
                </label>
                <select
                  value={missedReason}
                  onChange={(e) => setMissedReason(e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #e0b4b4" }}
                >
                  <option>No time</option>
                  <option>Fatigue</option>
                  <option>Travel</option>
                  <option>Injury/pain</option>
                  <option>Weather</option>
                  <option>Coach decision</option>
                  <option>Other</option>
                </select>

                <div className="notice" style={{ marginTop: 10, background: "#ffffff", borderColor: "#f5c6cb" }}>
                  <strong>Safety Rule:</strong> The system will <em>not</em> automatically double tomorrow&apos;s workload. Missed training volume is never stacked onto subsequent days.
                </div>
              </div>
            )}

            {/* Planned Exercises Review */}
            {checkInStatus !== "missed" && plan.days[selectedDayIndex].exercises?.length > 0 && (
              <div style={{ margin: "14px 0", background: "#f8f9f5", padding: 12, borderRadius: 4 }}>
                <strong style={{ fontSize: 12, color: "#37422d" }}>Planned Main Training:</strong>
                {plan.days[selectedDayIndex].exercises.map((ex, idx) => (
                  <div key={idx} style={{ marginTop: 6, fontSize: 12, color: "#4d5940" }}>
                    • {ex.name}: {ex.sets} sets &times; {ex.reps} reps {ex.distance ? `(${ex.distance})` : ""} · Rest: {ex.rest}
                  </div>
                ))}
              </div>
            )}

            {/* Actual Recorded Data */}
            {checkInStatus !== "missed" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "12px 0" }}>
                <label className="field">
                  <span>Actual Sets</span>
                  <input
                    type="number"
                    placeholder="e.g. 4"
                    value={actualSets}
                    onChange={(e) => setActualSets(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Best Time / Metric Achieved</span>
                  <input
                    type="text"
                    placeholder="e.g. 3.21s or 2.10m"
                    value={actualMetric}
                    onChange={(e) => setActualMetric(e.target.value)}
                  />
                </label>
              </div>
            )}

            {/* RPE & Recovery */}
            {checkInStatus !== "missed" && (
              <div style={{ margin: "12px 0" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3a4631", marginBottom: 4 }}>
                  Rate of Perceived Exertion (RPE): <strong>{rpe} / 10</strong>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={rpe}
                  onChange={(e) => setRpe(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#748265" }}>
                  <span>1 (Very Easy)</span>
                  <span>5 (Moderate)</span>
                  <span>8 (Hard)</span>
                  <span>10 (Maximal)</span>
                </div>
              </div>
            )}

            {/* Recovery Feeling */}
            {checkInStatus !== "missed" && (
              <div style={{ margin: "12px 0" }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#3a4631", marginBottom: 6 }}>
                  Recovery & Freshness:
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Good", "Moderate", "Fatigued", "Sore"].map((st) => (
                    <button
                      key={st}
                      type="button"
                      className={`button small ${recoveryStatus === st ? "dark" : "ghost"}`}
                      onClick={() => setRecoveryStatus(st)}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Pain Flag */}
            <div style={{ margin: "16px 0", padding: "10px 14px", border: "1px solid #d5dec6", borderRadius: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={painFlag}
                  onChange={(e) => setPainFlag(e.target.checked)}
                />
                <span style={{ fontSize: 13, fontWeight: 600, color: painFlag ? "#b02a2a" : "#2f3827" }}>
                  ⚠ Report Pain, Discomfort or Injury Flag
                </span>
              </label>

              {painFlag && (
                <div className="safety-alert-banner" style={{ marginTop: 10 }}>
                  <strong>Training Safety Alert</strong>
                  Your reported symptoms should be reviewed by your coach and/or an appropriate qualified healthcare professional. The system will avoid increasing training load until reviewed.
                </div>
              )}
            </div>

            {/* Notes */}
            <label className="field wide" style={{ marginTop: 8 }}>
              <span>Athlete Session Notes</span>
              <textarea
                rows={2}
                placeholder="How did you feel? Note track conditions, spikes used, start feeling..."
                value={checkInNotes}
                onChange={(e) => setCheckInNotes(e.target.value)}
              />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="button ghost"
                onClick={() => setSelectedDayIndex(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button orange"
                onClick={handleSaveCheckIn}
              >
                Save Session Check-in
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: SUNDAY REVIEW & ADAPTATION DIALOG */}
      {reviewModalOpen && (
        <Modal
          title="Sunday Review & Adaptive Planning"
          onClose={() => setReviewModalOpen(false)}
        >
          <div style={{ maxHeight: "75vh", overflowY: "auto" }}>
            <span className="eyebrow">WEEKLY AUDIT CYCLE</span>
            <h3 style={{ margin: "4px 0 12px" }}>Previous Week Performance & Adherence</h3>

            <div className="reality-grid">
              <div className="reality-stat">
                <span>Adherence</span>
                <strong>{weeklyReviewData?.adherenceScore || 0}%</strong>
              </div>
              <div className="reality-stat">
                <span>Completed</span>
                <strong>{weeklyReviewData?.completedSessions || 0} / {weeklyReviewData?.plannedSessions || 0}</strong>
              </div>
              <div className="reality-stat">
                <span>Avg Session RPE</span>
                <strong>{weeklyReviewData?.averageRPE || 7} / 10</strong>
              </div>
              <div className="reality-stat">
                <span>Performance Trend</span>
                <strong style={{ textTransform: "capitalize" }}>{weeklyReviewData?.performanceTrend || "Stable"}</strong>
              </div>
            </div>

            <div style={{ background: "#f8f9f5", border: "1px solid #d5dec6", borderRadius: 4, padding: 14, margin: "14px 0" }}>
              <h4 style={{ margin: "0 0 6px", fontSize: 13, color: "#222a1b" }}>Adaptation Recommendation</h4>
              <p style={{ margin: 0, fontSize: 13, color: "#4b5641", lineHeight: 1.5 }}>
                {weeklyReviewData?.adaptationRecommendation || "Maintain current training volume and emphasize technical quality."}
              </p>
            </div>

            {weeklyReviewData?.safetyAlert && (
              <div className="safety-alert-banner">
                <strong>Safety Alert Flagged</strong>
                {weeklyReviewData.safetyAlert}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button
                type="button"
                className="button ghost"
                onClick={() => setReviewModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="button orange"
                onClick={() => handleGenerateNextWeek(true)}
              >
                Generate Next Week&apos;s Plan ➔
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: CONFIGURE GOALS DIALOG */}
      {goalsModalOpen && (
        <Modal
          title="Configure Season & Monthly Goals"
          onClose={() => setGoalsModalOpen(false)}
        >
          <form onSubmit={handleSaveGoals} style={{ maxHeight: "75vh", overflowY: "auto" }}>
            <div style={{ marginBottom: 14 }}>
              <span className="eyebrow">YEAR TARGET</span>
              <h4 style={{ margin: "2px 0 10px" }}>Season Goal Setting</h4>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label className="field">
                  <span>Target Time (seconds)</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 11.70"
                    value={editYearTarget}
                    onChange={(e) => setEditYearTarget(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Target Date</span>
                  <input
                    type="date"
                    required
                    value={editYearDate}
                    onChange={(e) => setEditYearDate(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <span className="eyebrow">MONTH OBJECTIVES</span>
              <h4 style={{ margin: "2px 0 10px" }}>Mesocycle Targets</h4>
              <label className="field wide" style={{ marginBottom: 10 }}>
                <span>Primary Objective</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Improve 0–20m acceleration"
                  value={editMonthObjective}
                  onChange={(e) => setEditMonthObjective(e.target.value)}
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label className="field">
                  <span>10m Sprint Target (sec)</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1.98"
                    value={editMonth10m}
                    onChange={(e) => setEditMonth10m(e.target.value)}
                  />
                </label>
                <label className="field">
                  <span>Standing Broad Jump (m)</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 2.45"
                    value={editMonthBroadJump}
                    onChange={(e) => setEditMonthBroadJump(e.target.value)}
                  />
                </label>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="button ghost"
                onClick={() => setGoalsModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button orange">
                Save Goals
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
