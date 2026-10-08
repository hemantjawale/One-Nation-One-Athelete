import React, { useState } from "react";
import {
  ArrowLeft,
  Activity,
  Calendar,
  HeartPulse,
  Target,
  Layers,
  Award,
  AlertTriangle,
  ShieldAlert,
  Clock3,
  CheckCircle2,
  TrendingUp,
  RotateCcw,
  Plus,
  Edit,
  Save,
  Info,
} from "lucide-react";
import { Modal } from "../UI";
import { dateLabel } from "../../lib/forms";

export function CoachAthleteDetailView({
  athleteDetail,
  loading,
  onBack,
  onStartPlanBuilder,
  onSaveGoals,
  onRescheduleSession,
  notify,
}) {
  const [activeTab, setActiveTab] = useState("overview"); // overview, performance, training, recovery, goals, roadmap

  // Goal edit modal state
  const [goalsModalOpen, setGoalsModalOpen] = useState(false);
  const [editYearTarget, setEditYearTarget] = useState("");
  const [editYearDate, setEditYearDate] = useState("");
  const [editYearComp, setEditYearComp] = useState("");
  const [editMonthObjective, setEditMonthObjective] = useState("");
  const [editMonth10m, setEditMonth10m] = useState("");
  const [editMonthBroadJump, setEditMonthBroadJump] = useState("");
  const [editMonthStatus, setEditMonthStatus] = useState("In Progress");

  // Reschedule session modal state
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [rescheduleDayIndex, setRescheduleDayIndex] = useState(null);
  const [rescheduleNewDate, setRescheduleNewDate] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");

  if (loading || !athleteDetail) {
    return (
      <div className="panel panel-pad" style={{ textAlign: "center", padding: "60px 20px" }}>
        <h3>Loading Athlete Dossier…</h3>
        <p>Fetching sport-specific records, performance benchmarks, and training history.</p>
      </div>
    );
  }

  const {
    profile,
    performance,
    training,
    recovery,
    roadmap,
    goals,
    realityCheck,
    safetyFlags,
    activePlan,
    sessions = [],
  } = athleteDetail;

  function openGoalsModal() {
    setEditYearTarget(goals?.yearGoal?.targetPB || goals?.yearGoal?.targetValue || "");
    setEditYearDate(goals?.yearGoal?.targetDate || "");
    setEditYearComp(goals?.yearGoal?.targetCompetition || "");
    setEditMonthObjective(goals?.monthGoal?.primaryObjective || "");
    setEditMonth10m(goals?.monthGoal?.targetMetricValue || "");
    setEditMonthBroadJump(goals?.monthGoal?.secondaryTargetValue || "");
    setEditMonthStatus(goals?.monthGoal?.status || "In Progress");
    setGoalsModalOpen(true);
  }

  async function handleGoalsSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        yearGoal: {
          ...goals?.yearGoal,
          targetPB: editYearTarget ? Number(editYearTarget) : goals?.yearGoal?.targetPB,
          targetDate: editYearDate,
          targetCompetition: editYearComp,
        },
        monthGoal: {
          ...goals?.monthGoal,
          primaryObjective: editMonthObjective,
          targetMetricValue: editMonth10m ? Number(editMonth10m) : goals?.monthGoal?.targetMetricValue,
          secondaryTargetValue: editMonthBroadJump ? Number(editMonthBroadJump) : goals?.monthGoal?.secondaryTargetValue,
          status: editMonthStatus,
        },
      };
      await onSaveGoals(profile.id, payload);
      setGoalsModalOpen(false);
    } catch (err) {
      notify?.("Error saving goals: " + err.message, "error");
    }
  }

  function openRescheduleModal(dayIndex, currentDate) {
    setRescheduleDayIndex(dayIndex);
    setRescheduleNewDate(currentDate || "");
    setRescheduleNotes("");
    setRescheduleModalOpen(true);
  }

  async function handleRescheduleSubmit(e) {
    e.preventDefault();
    if (!activePlan?.id || rescheduleDayIndex === null) return;
    try {
      await onRescheduleSession(activePlan.id, {
        dayIndex: rescheduleDayIndex,
        newDate: rescheduleNewDate,
        coachNotes: rescheduleNotes,
      });
      setRescheduleModalOpen(false);
      notify?.("Session rescheduled successfully.");
    } catch (err) {
      notify?.("Error rescheduling session: " + err.message, "error");
    }
  }

  function getStatusBadgeClass(status) {
    switch (status) {
      case "On Track":
        return "badge-green";
      case "Needs Review":
        return "badge-amber";
      case "Behind Goal":
        return "badge-orange";
      case "Low Adherence":
        return "badge-amber-dark";
      case "Recovery Concern":
        return "badge-purple";
      case "Safety Flag":
        return "badge-red";
      case "No Recent Data":
      default:
        return "badge-gray";
    }
  }

  return (
    <div className="coach-athlete-detail-view">
      {/* Top Header Card */}
      <div className="athlete-dossier-header-panel">
        <button className="button ghost small back-btn" onClick={onBack}>
          <ArrowLeft size={15} />
          Back to Athletes
        </button>

        <div className="athlete-header-content">
          <div className="ath-main-info">
            <div className="ath-avatar-initials">
              {profile.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h1 className="ath-title-name">{profile.name}</h1>
                <span className={`status-badge ${getStatusBadgeClass(profile.trainingStatus)}`}>
                  {profile.trainingStatus || "On Track"}
                </span>
                {safetyFlags && safetyFlags.length > 0 && (
                  <span className="attention-badge danger">
                    <ShieldAlert size={12} /> {safetyFlags[0].label}
                  </span>
                )}
              </div>
              <p className="ath-sub-spec">
                {profile.sport} • {profile.event} • {profile.gender} • {profile.age} yrs •{" "}
                {profile.district ? `${profile.district}, ${profile.state}` : profile.state || "India"}
              </p>
            </div>
          </div>

          {/* Quick Metrics Header Bar */}
          <div className="ath-header-kpis">
            <div className="header-kpi-item">
              <span className="lbl">CURRENT PB</span>
              <strong className="val">{profile.currentPB ? `${profile.currentPB}${profile.unit || "s"}` : "—"}</strong>
            </div>
            <div className="header-kpi-item">
              <span className="lbl">TARGET</span>
              <strong className="val">{profile.target ? `${profile.target}${profile.unit || "s"}` : "—"}</strong>
            </div>
            <div className="header-kpi-item">
              <span className="lbl">CURRENT PHASE</span>
              <strong className="val" style={{ color: "#2e3b23" }}>
                {activePlan?.phase || roadmap?.currentLevelName || "Acceleration"}
              </strong>
            </div>
            <div className="header-kpi-item">
              <span className="lbl">COMPETITION</span>
              <strong className="val">
                {profile.competitionDate ? dateLabel(profile.competitionDate) : "Not Set"}
              </strong>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="athlete-header-action-row">
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="button orange"
              onClick={() => onStartPlanBuilder(profile.id)}
            >
              <Calendar size={15} />
              Create / Edit Weekly Plan
            </button>
            <button
              className="button ghost"
              onClick={openGoalsModal}
            >
              <Target size={15} />
              Edit Season & Month Goals
            </button>
          </div>
        </div>

        {/* Navigation Tabs (Section 9) */}
        <div className="athlete-detail-tab-bar">
          {[
            ["overview", "Overview", Activity],
            ["performance", "Performance", TrendingUp],
            ["training", "Training & Plans", Calendar],
            ["recovery", "Recovery & Health", HeartPulse],
            ["goals", "Goals", Target],
            ["roadmap", "Roadmap (Levels 1–6)", Layers],
          ].map(([id, label, Icon]) => (
            <button
              key={id}
              className={`athlete-detail-tab-btn ${activeTab === id ? "active" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================
          TAB 1: OVERVIEW
      ======================================================== */}
      {activeTab === "overview" && (
        <div className="tab-pane-grid">
          {/* Personal & Sporting Identity */}
          <div className="panel panel-pad">
            <h3 className="section-title">Athlete Profile & Sporting Bio</h3>
            <div className="info-grid-2col">
              <div className="info-field">
                <span className="fld-label">Date of Birth / Age</span>
                <strong className="fld-val">{profile.birthDate || "—"} ({profile.age} years)</strong>
              </div>
              <div className="info-field">
                <span className="fld-label">Gender & Classification</span>
                <strong className="fld-val">{profile.gender} • {profile.classification || "Open"}</strong>
              </div>
              <div className="info-field">
                <span className="fld-label">State & District</span>
                <strong className="fld-val">{profile.state || "—"} / {profile.district || "—"}</strong>
              </div>
              <div className="info-field">
                <span className="fld-label">Discipline & Event</span>
                <strong className="fld-val">{profile.sport} • {profile.event}</strong>
              </div>
              <div className="info-field">
                <span className="fld-label">Access to Equipment</span>
                <strong className="fld-val">{profile.equipment || "Standard Track"}</strong>
              </div>
              <div className="info-field">
                <span className="fld-label">Target Competition</span>
                <strong className="fld-val">{goals?.yearGoal?.targetCompetition || "State Championship"}</strong>
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="panel panel-pad">
            <h3 className="section-title">Performance Summary</h3>
            <div className="info-grid-2col">
              <div className="info-field">
                <span className="fld-label">Measured Personal Best</span>
                <strong className="fld-val" style={{ fontSize: 20, color: "#2e3b23" }}>
                  {profile.currentPB ? `${profile.currentPB}${profile.unit || "s"}` : "—"}
                </strong>
              </div>
              <div className="info-field">
                <span className="fld-label">Season Target</span>
                <strong className="fld-val" style={{ fontSize: 20, color: "#c9792c" }}>
                  {profile.target ? `${profile.target}${profile.unit || "s"}` : "—"}
                </strong>
              </div>
              <div className="info-field">
                <span className="fld-label">Goal Gap</span>
                <strong className="fld-val">
                  {profile.currentPB && profile.target
                    ? `${(profile.currentPB - profile.target).toFixed(2)}${profile.unit || "s"}`
                    : "—"}
                </strong>
              </div>
              <div className="info-field">
                <span className="fld-label">Total Recorded Sessions</span>
                <strong className="fld-val">{sessions.length} sessions</strong>
              </div>
            </div>

            {realityCheck && (
              <div className="notice" style={{ marginTop: 14 }}>
                <strong>Sports-Science Reality Check:</strong> {realityCheck.analysis || realityCheck.evaluation}
              </div>
            )}
          </div>

          {/* Training Summary */}
          <div className="panel panel-pad">
            <h3 className="section-title">Training Summary</h3>
            <div className="info-grid-2col">
              <div className="info-field">
                <span className="fld-label">Current Weekly Phase</span>
                <strong className="fld-val">{activePlan?.phase || "Acceleration"}</strong>
              </div>
              <div className="info-field">
                <span className="fld-label">Weekly Objective</span>
                <strong className="fld-val">{activePlan?.weeklyObjective || "0–20m acceleration mechanics"}</strong>
              </div>
              <div className="info-field">
                <span className="fld-label">Training Adherence (14 Days)</span>
                <strong className="fld-val">{profile.adherence || 0}%</strong>
              </div>
              <div className="info-field">
                <span className="fld-label">Weekly Plan Source</span>
                <span className={`source-tag ${activePlan?.source || "system"}`}>
                  {activePlan?.source === "coach"
                    ? "Coach Assigned"
                    : activePlan?.source === "coach_modified"
                    ? "Coach Modified"
                    : "System Suggested"}
                </span>
              </div>
            </div>
          </div>

          {/* Recovery Summary */}
          <div className="panel panel-pad">
            <h3 className="section-title">Recovery & Safety Status</h3>
            <div className="info-grid-2col">
              <div className="info-field">
                <span className="fld-label">Latest Recovery Rating</span>
                <strong className="fld-val">
                  {sessions[0]?.fatigue >= 8 ? "Fatigued" : sessions[0]?.pain >= 5 ? "Pain Flagged" : "Good"}
                </strong>
              </div>
              <div className="info-field">
                <span className="fld-label">Active Injury Records</span>
                <strong className="fld-val">
                  {recovery?.activeInjuries?.length ? `${recovery.activeInjuries.length} Active` : "None"}
                </strong>
              </div>
            </div>
            {safetyFlags && safetyFlags.length > 0 && (
              <div className="safety-alert-box" style={{ marginTop: 12 }}>
                <ShieldAlert size={16} />
                <span>{safetyFlags[0].message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 2: PERFORMANCE (SECTION 11)
      ======================================================== */}
      {activeTab === "performance" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Top Performance Cards */}
          <div className="coach-kpi-grid">
            <div className="coach-kpi-card">
              <span className="kpi-label">Current Personal Best</span>
              <strong className="kpi-value" style={{ color: "#2e3b23" }}>
                {performance?.currentPB ? `${performance.currentPB}${profile.unit || "s"}` : "—"}
              </strong>
              <small style={{ color: "#6a775b" }}>Official timing</small>
            </div>
            <div className="coach-kpi-card">
              <span className="kpi-label">Previous PB</span>
              <strong className="kpi-value">
                {performance?.previousPB ? `${performance.previousPB}${profile.unit || "s"}` : "—"}
              </strong>
              <small style={{ color: "#6a775b" }}>Baseline mark</small>
            </div>
            <div className="coach-kpi-card">
              <span className="kpi-label">Target Goal</span>
              <strong className="kpi-value" style={{ color: "#c9792c" }}>
                {profile.target ? `${profile.target}${profile.unit || "s"}` : "—"}
              </strong>
              <small style={{ color: "#6a775b" }}>Season championship</small>
            </div>
            <div className="coach-kpi-card">
              <span className="kpi-label">Goal Gap</span>
              <strong className="kpi-value">
                {performance?.currentPB && profile.target
                  ? `${(performance.currentPB - profile.target).toFixed(2)}${profile.unit || "s"}`
                  : "—"}
              </strong>
              <small style={{ color: "#6a775b" }}>Required improvement</small>
            </div>
          </div>

          {/* Sport-Aware Benchmark Comparison */}
          {performance?.benchmarkComparison && (
            <div className="panel panel-pad">
              <h3 className="section-title">
                District, State & National Benchmark Comparison
              </h3>
              <p className="subtitle-sm">
                Sport-aware percentile rankings for {profile.sport} · {profile.event} · {profile.gender} · {profile.age}y
              </p>

              <div className="benchmark-tier-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 14 }}>
                <div className="benchmark-tier-card">
                  <span className="tier-lbl">DISTRICT BENCHMARK</span>
                  <strong>{performance.benchmarkComparison.district?.bestValue ? `${performance.benchmarkComparison.district.bestValue}s` : "12.40s"}</strong>
                  <p>{profile.district || "Nashik"} District Standard</p>
                  <span className="percentile-tag">
                    {performance.benchmarkComparison.district?.percentile
                      ? `Top ${100 - performance.benchmarkComparison.district.percentile}%`
                      : "Top 15% District"}
                  </span>
                </div>

                <div className="benchmark-tier-card">
                  <span className="tier-lbl">STATE BENCHMARK</span>
                  <strong>{performance.benchmarkComparison.state?.bestValue ? `${performance.benchmarkComparison.state.bestValue}s` : "11.90s"}</strong>
                  <p>{profile.state || "Maharashtra"} State Championship Qualifying</p>
                  <span className="percentile-tag">
                    {performance.benchmarkComparison.state?.percentile
                      ? `Top ${100 - performance.benchmarkComparison.state.percentile}%`
                      : "Top 25% State"}
                  </span>
                </div>

                <div className="benchmark-tier-card">
                  <span className="tier-lbl">NATIONAL RECORD</span>
                  <strong>
                    {performance.benchmarkComparison.nationalRecord?.performance?.display ||
                      (performance.benchmarkComparison.national?.best !== null
                        ? `${performance.benchmarkComparison.national?.best}s`
                        : "10.23s")}
                  </strong>
                  <p>
                    {performance.benchmarkComparison.nationalRecord
                      ? `${performance.benchmarkComparison.nationalRecord.athleteName} (${performance.benchmarkComparison.nationalRecord.state})`
                      : "Official All-India Senior Record"}
                  </p>
                  {performance.benchmarkComparison.nationalRecord?.source?.url && (
                    <a
                      href={performance.benchmarkComparison.nationalRecord.source.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 11, color: "#c94a29", textDecoration: "underline", display: "inline-block", marginTop: 4, fontWeight: 600 }}
                    >
                      AFI Senior PDF ↗
                    </a>
                  )}
                </div>

                {performance.benchmarkComparison.youthNationalRecord && (
                  <div className="benchmark-tier-card">
                    <span className="tier-lbl" style={{ color: "#2b7a1f" }}>YOUTH (U18) RECORD</span>
                    <strong>
                      {performance.benchmarkComparison.youthNationalRecord.performance?.display ||
                        `${performance.benchmarkComparison.youthNationalRecord.performance?.value}s`}
                    </strong>
                    <p>
                      {performance.benchmarkComparison.youthNationalRecord.athleteName} (
                      {performance.benchmarkComparison.youthNationalRecord.state})
                    </p>
                    {performance.benchmarkComparison.youthNationalRecord.source?.url && (
                      <a
                        href={performance.benchmarkComparison.youthNationalRecord.source.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 11, color: "#2b7a1f", textDecoration: "underline", display: "inline-block", marginTop: 4, fontWeight: 600 }}
                      >
                        Youth PDF ↗
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Historical Results Ordered Strictly by trainingDate */}
          <div className="panel panel-pad">
            <h3 className="section-title">Performance History</h3>
            <p className="subtitle-sm">Chronologically sorted by training date</p>
            {sessions.filter((s) => s.metric > 0).length === 0 ? (
              <p style={{ color: "#6a775b" }}>No verified performance timing recorded yet.</p>
            ) : (
              <table className="coach-athletes-table" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>Training Date</th>
                    <th>Session Title</th>
                    <th>Result / Time</th>
                    <th>RPE Effort</th>
                    <th>Pain / Fatigue</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions
                    .filter((s) => s.metric > 0)
                    .map((s, idx) => (
                      <tr key={idx}>
                        <td><strong>{s.date || s.trainingDate}</strong></td>
                        <td>{s.title}</td>
                        <td>
                          <strong style={{ color: "#2e3b23" }}>
                            {s.metric} {s.unit}
                          </strong>
                        </td>
                        <td>{s.effort ? `${s.effort}/10` : "—"}</td>
                        <td>
                          {s.pain > 0 ? (
                            <span style={{ color: "#c62828", fontWeight: 600 }}>Pain {s.pain}/10</span>
                          ) : (
                            <span style={{ color: "#2e7d32" }}>No pain</span>
                          )}
                        </td>
                        <td><small>{s.notes || "—"}</small></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 3: TRAINING & PLANS (SECTIONS 12, 16, 27, 28, 29, 39)
      ======================================================== */}
      {activeTab === "training" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Active Weekly Training Plan Header */}
          <div className="panel panel-pad">
            <div className="section-header-row">
              <div>
                <span className="coach-kicker">ACTIVE TRAINING SCHEDULE</span>
                <h3 style={{ margin: "4px 0" }}>
                  {activePlan?.weekStart
                    ? `Week of ${dateLabel(activePlan.weekStart)} – ${activePlan.weekEnd ? dateLabel(activePlan.weekEnd) : ""}`
                    : "Current Weekly Training Plan"}
                </h3>
                <p className="subtitle-sm">
                  Objective: <strong>{activePlan?.weeklyObjective || "Acceleration Development"}</strong> · Phase:{" "}
                  <strong>{activePlan?.phase || "Acceleration"}</strong> · Version:{" "}
                  <strong>v{activePlan?.version || 1}</strong>
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className={`source-tag ${activePlan?.source || "system"}`}>
                  {activePlan?.source === "coach" ? "Coach Assigned Plan" : "System Suggested"}
                </span>
                <button
                  className="button orange small"
                  onClick={() => onStartPlanBuilder(profile.id)}
                >
                  <Edit size={14} />
                  Edit Plan
                </button>
              </div>
            </div>

            {/* Day-by-Day Session Cards (Monday..Sunday) */}
            <div className="weekly-plan-days-container" style={{ marginTop: 16 }}>
              {(activePlan?.days || []).map((day, idx) => {
                const completion = day.athleteCompletion || {};
                const isCompleted = day.status === "completed";
                const isPartial = day.status === "partially_completed";
                const isMissed = day.status === "missed";

                return (
                  <div
                    key={idx}
                    className={`coach-day-plan-card ${isCompleted ? "status-comp" : isMissed ? "status-miss" : isPartial ? "status-part" : ""}`}
                  >
                    <div className="day-card-head">
                      <div>
                        <strong>{day.dayOfWeek}</strong>
                        <span className="day-date-hint">{day.date || day.trainingDate}</span>
                      </div>
                      <div className="day-card-status">
                        {isCompleted && (
                          <span className="badge-green small">
                            <CheckCircle2 size={12} /> Completed
                          </span>
                        )}
                        {isPartial && (
                          <span className="badge-amber small">
                            <AlertTriangle size={12} /> Partial
                          </span>
                        )}
                        {isMissed && (
                          <span className="badge-red small">
                            ❌ Missed
                          </span>
                        )}
                        {!isCompleted && !isPartial && !isMissed && (
                          <span className="badge-gray small">
                            Scheduled
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="day-card-body">
                      <div className="session-type-badge">{day.sessionType}</div>
                      <p className="session-obj">{day.objective || "General training exposure"}</p>

                      {/* Planned Exercises */}
                      <div className="planned-exercises-block">
                        <span className="lbl-mini">PLANNED</span>
                        {day.exercises && day.exercises.length > 0 ? (
                          day.exercises.map((ex, eIdx) => (
                            <div key={eIdx} className="ex-item-line">
                              • {ex.name} ({ex.sets} × {ex.reps} {ex.distance ? `· ${ex.distance}` : ""})
                            </div>
                          ))
                        ) : (
                          <small style={{ color: "#6a775b" }}>Rest or active recovery protocol</small>
                        )}
                        {day.targetIntensity && (
                          <small style={{ display: "block", color: "#6a775b", marginTop: 4 }}>
                            Intensity: {day.targetIntensity} · Duration: {day.expectedDuration}m
                          </small>
                        )}
                      </div>

                      {/* Actual Athlete Results (Section 28 Planned vs Actual) */}
                      {(isCompleted || isPartial || isMissed) && (
                        <div className="actual-completion-block">
                          <span className="lbl-mini">ACTUAL ATHLETE RECORD</span>
                          {isMissed ? (
                            <div className="missed-reason-box">
                              <strong>Missed Reason:</strong> {completion.missedReason || "No reason recorded"}
                              <button
                                className="button small ghost"
                                style={{ marginTop: 6 }}
                                onClick={() => openRescheduleModal(day.dayIndex, day.date || day.trainingDate)}
                              >
                                Reschedule Session
                              </button>
                            </div>
                          ) : (
                            <div className="actual-metrics-box">
                              <div className="actual-metric-stats">
                                <span>Completion: <strong>{day.completionScore ?? (isCompleted ? 100 : 60)}%</strong></span>
                                <span>Performance: <strong>{day.performanceScore ?? (isCompleted ? 95 : 65)}%</strong></span>
                                {completion.rpe && <span>RPE: <strong>{completion.rpe}/10</strong></span>}
                                {completion.recovery && <span>Recovery: <strong>{completion.recovery}</strong></span>}
                              </div>
                              {completion.actualMetric && (
                                <div style={{ marginTop: 4 }}>
                                  Best Metric: <strong>{completion.actualMetric}s</strong>
                                </div>
                              )}
                              {completion.notes && (
                                <p className="completion-notes-text">&quot;{completion.notes}&quot;</p>
                              )}
                              {completion.painFlag && (
                                <div className="pain-warning-pill">
                                  <AlertTriangle size={12} /> Athlete flagged pain during session
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Training History (Section 12 & 39 Strictly Ordered by trainingDate) */}
          <div className="panel panel-pad">
            <h3 className="section-title">Complete Training History</h3>
            <p className="subtitle-sm">
              Strictly ordered by training date (newest first). Preserves original training date even if updated today.
            </p>

            {sessions.length === 0 ? (
              <p style={{ color: "#6a775b" }}>No historical sessions logged.</p>
            ) : (
              <table className="coach-athletes-table" style={{ marginTop: 12 }}>
                <thead>
                  <tr>
                    <th>Training Date</th>
                    <th>Session Title</th>
                    <th>Duration</th>
                    <th>RPE Effort</th>
                    <th>Result</th>
                    <th>Pain / Fatigue</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s, idx) => (
                    <tr key={idx}>
                      <td><strong>{s.date || s.trainingDate}</strong></td>
                      <td>{s.title}</td>
                      <td>{s.duration} min</td>
                      <td>{s.effort ? `${s.effort}/10` : "—"}</td>
                      <td>{s.metric ? `${s.metric} ${s.unit}` : "—"}</td>
                      <td>
                        {s.pain >= 5 ? (
                          <span style={{ color: "#c62828", fontWeight: 600 }}>Pain {s.pain}/10</span>
                        ) : s.fatigue >= 8 ? (
                          <span style={{ color: "#f57f17" }}>High Fatigue {s.fatigue}/10</span>
                        ) : (
                          <span style={{ color: "#2e7d32" }}>Normal</span>
                        )}
                      </td>
                      <td><small>{s.notes || "—"}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 4: RECOVERY & HEALTH (SECTION 32 & 33)
      ======================================================== */}
      {activeTab === "recovery" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="panel panel-pad">
            <h3 className="section-title">Athlete Recovery & Wellbeing Monitoring</h3>
            <p className="subtitle-sm">
              Honest recovery indicators, muscle soreness, nervous system readiness, and injury history.
            </p>

            <div className="coach-kpi-grid" style={{ marginTop: 14 }}>
              <div className="coach-kpi-card">
                <span className="kpi-label">Latest Soreness / Pain</span>
                <strong
                  className="kpi-value"
                  style={{ color: recovery?.latestPain >= 5 ? "#c62828" : "#2e7d32" }}
                >
                  {recovery?.latestPain !== null && recovery?.latestPain !== undefined ? `${recovery.latestPain}/10` : "0/10"}
                </strong>
                <small>{recovery?.latestPain >= 5 ? "Elevated Pain Flag" : "Normal"}</small>
              </div>

              <div className="coach-kpi-card">
                <span className="kpi-label">Latest Fatigue</span>
                <strong
                  className="kpi-value"
                  style={{ color: recovery?.latestFatigue >= 8 ? "#f57f17" : "#2e3b23" }}
                >
                  {recovery?.latestFatigue !== null && recovery?.latestFatigue !== undefined ? `${recovery.latestFatigue}/10` : "3/10"}
                </strong>
                <small>{recovery?.latestFatigue >= 8 ? "Fatigue Warning" : "Managed"}</small>
              </div>

              <div className="coach-kpi-card">
                <span className="kpi-label">Active Injuries</span>
                <strong
                  className="kpi-value"
                  style={{ color: recovery?.activeInjuries?.length ? "#c62828" : "#2e7d32" }}
                >
                  {recovery?.activeInjuries?.length || 0}
                </strong>
                <small>Requiring medical clearance</small>
              </div>

              <div className="coach-kpi-card">
                <span className="kpi-label">Recovery Status</span>
                <strong className="kpi-value">
                  {recovery?.recoveryStatus || "Good"}
                </strong>
                <small>Readiness for loading</small>
              </div>
            </div>
          </div>

          {/* Active Injuries / Clinical Records */}
          <div className="panel panel-pad">
            <h3 className="section-title">Injury Records & Return to Play Stages</h3>
            {!recovery?.injuries || recovery.injuries.length === 0 ? (
              <p style={{ color: "#6a775b" }}>No injuries recorded for this athlete.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                {recovery.injuries.map((inj, idx) => (
                  <div key={idx} className="injury-row-card">
                    <div>
                      <strong>{inj.title}</strong>
                      <span className="inj-date">Logged: {inj.date}</span>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#444" }}>{inj.notes}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span className={`pill ${inj.cleared ? "green" : "red"}`}>
                        {inj.stage || "Rehabilitation"}
                      </span>
                      <small style={{ display: "block", marginTop: 4 }}>
                        {inj.cleared ? "Cleared to train" : "Under restriction"}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 5: GOALS (SECTIONS 14 & 15)
      ======================================================== */}
      {activeTab === "goals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="section-header-row">
            <div>
              <h3>Season & Monthly Goal Management</h3>
              <p className="subtitle-sm">Evidence-based goal setting and honest progress trajectory</p>
            </div>
            <button className="button orange small" onClick={openGoalsModal}>
              <Edit size={14} />
              Configure Goals
            </button>
          </div>

          {/* 2027 Season / Year Goal Card */}
          <div className="panel panel-pad">
            <div className="section-header-row" style={{ marginBottom: 12 }}>
              <div>
                <span className="coach-kicker">ANNUAL TARGET</span>
                <h3 style={{ margin: 0 }}>
                  {goals?.yearGoal?.year || new Date().getFullYear()} Season Goal · {goals?.yearGoal?.event || profile.event}
                </h3>
              </div>
              <span className="pill dark">Verified Target</span>
            </div>

            <div className="goal-trajectory-row">
              <div className="goal-trajectory-step">
                <span className="step-lbl">STARTING BASELINE</span>
                <strong>{goals?.yearGoal?.startingPB || profile.currentPB || 12.21}s</strong>
              </div>
              <div className="goal-arrow">→</div>
              <div className="goal-trajectory-step current">
                <span className="step-lbl">CURRENT PB</span>
                <strong>{profile.currentPB || goals?.yearGoal?.currentPB || 12.21}s</strong>
              </div>
              <div className="goal-arrow">→</div>
              <div className="goal-trajectory-step target">
                <span className="step-lbl">SEASON TARGET</span>
                <strong>{goals?.yearGoal?.targetPB || profile.target || 11.70}s</strong>
              </div>
            </div>

            <div className="goal-comp-detail" style={{ marginTop: 14 }}>
              <p>
                Target Meet: <strong>{goals?.yearGoal?.targetCompetition || "State Championship"}</strong> · Date:{" "}
                <strong>{goals?.yearGoal?.targetDate || "2027-06-20"}</strong>
              </p>
            </div>
          </div>

          {/* Monthly Goals Card */}
          <div className="panel panel-pad">
            <div className="section-header-row" style={{ marginBottom: 12 }}>
              <div>
                <span className="coach-kicker">MONTHLY MILESTONE</span>
                <h3 style={{ margin: 0 }}>
                  {goals?.monthGoal?.month || "Current Month"} Milestone Focus
                </h3>
              </div>
              <span className={`status-badge ${goals?.monthGoal?.status === "Achieved" ? "badge-green" : "badge-amber"}`}>
                {goals?.monthGoal?.status || "In Progress"}
              </span>
            </div>

            <div className="info-grid-2col">
              <div className="info-field">
                <span className="fld-label">Primary Technical Objective</span>
                <strong className="fld-val">
                  {goals?.monthGoal?.primaryObjective || "Improve 0–20m horizontal acceleration & start mechanics"}
                </strong>
              </div>
              <div className="info-field">
                <span className="fld-label">Secondary Focus</span>
                <strong className="fld-val">
                  {goals?.monthGoal?.secondaryObjective || "Lower-body power & reactive ankle stiffness"}
                </strong>
              </div>
              <div className="info-field">
                <span className="fld-label">Primary Metric Target</span>
                <strong className="fld-val">
                  {goals?.monthGoal?.targetMetricName || "10m Acceleration"}: Target{" "}
                  {goals?.monthGoal?.targetMetricValue || 1.98}s (Current: {goals?.monthGoal?.currentMetricValue || 2.02}s)
                </strong>
              </div>
              <div className="info-field">
                <span className="fld-label">Secondary Metric Target</span>
                <strong className="fld-val">
                  {goals?.monthGoal?.secondaryMetricName || "Standing Broad Jump"}: Target{" "}
                  {goals?.monthGoal?.secondaryTargetValue || 2.45}m (Current: {goals?.monthGoal?.secondaryCurrentValue || 2.38}m)
                </strong>
              </div>
            </div>

            {goals?.monthGoal?.evaluationNotes && (
              <p className="notice" style={{ marginTop: 14 }}>
                <strong>Coach / System Notes:</strong> {goals.monthGoal.evaluationNotes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          TAB 6: ROADMAP (SECTION 13)
      ======================================================== */}
      {activeTab === "roadmap" && (
        <div className="panel panel-pad">
          <div className="section-header-row" style={{ marginBottom: 16 }}>
            <div>
              <span className="coach-kicker">LONG-TERM ATHLETE DEVELOPMENT</span>
              <h3 style={{ margin: 0 }}>Sprint Journey Roadmap (Levels 1 to 6)</h3>
              <p className="subtitle-sm">
                Objective criteria progression. Levels unlock exclusively based on recorded sessions and performance marks.
              </p>
            </div>
            <div className="roadmap-level-tag">
              Currently: <strong>Level {roadmap?.currentLevel || 1} ({roadmap?.currentLevelName || "Foundation"})</strong>
            </div>
          </div>

          <div className="roadmap-levels-stack">
            {(roadmap?.levels || []).map((lvl) => {
              const isCurrent = lvl.status === "active";
              const isComplete = lvl.status === "completed";
              const isLocked = lvl.status === "locked";

              return (
                <div
                  key={lvl.level}
                  className={`roadmap-level-card ${isCurrent ? "current" : isComplete ? "completed" : "locked"}`}
                >
                  <div className="lvl-left-badge">
                    <span className="lvl-num">L{lvl.level}</span>
                    {isComplete && <CheckCircle2 size={16} color="#2b7a1f" />}
                    {isCurrent && <span className="current-marker">ACTIVE</span>}
                  </div>

                  <div className="lvl-content">
                    <div className="lvl-header">
                      <h4>{lvl.title}</h4>
                      <span className="lvl-prog-text">
                        {isComplete ? "100% Completed" : isCurrent ? `${lvl.progressPercentage || 40}% in progress` : "Locked"}
                      </span>
                    </div>

                    <p className="lvl-focus">{lvl.focus}</p>

                    <div className="lvl-criteria-checklist">
                      <span className="criteria-head">Criteria Checklist:</span>
                      <ul>
                        {(lvl.criteria || lvl.checklist || []).map((crit, cIdx) => (
                          <li key={cIdx}>
                            {isComplete ? "✓" : isCurrent ? "•" : "○"} {crit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Goals Modal */}
      {goalsModalOpen && (
        <Modal title="Configure Season & Monthly Goals" onClose={() => setGoalsModalOpen(false)}>
          <form onSubmit={handleGoalsSubmit} className="coach-form-stack">
            <h4 style={{ margin: "0 0 8px" }}>Annual Season Target</h4>
            <div className="form-row-2">
              <div>
                <label>Target Personal Best ({profile.unit || "s"}):</label>
                <input
                  type="number"
                  step="0.01"
                  value={editYearTarget}
                  onChange={(e) => setEditYearTarget(e.target.value)}
                  placeholder="e.g. 11.70"
                  required
                />
              </div>
              <div>
                <label>Target Date:</label>
                <input
                  type="date"
                  value={editYearDate}
                  onChange={(e) => setEditYearDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label>Target Competition Meet:</label>
              <input
                type="text"
                value={editYearComp}
                onChange={(e) => setEditYearComp(e.target.value)}
                placeholder="e.g. State Junior Athletics Championship"
              />
            </div>

            <h4 style={{ margin: "14px 0 8px" }}>Monthly Milestone</h4>
            <div>
              <label>Primary Technical Objective:</label>
              <input
                type="text"
                value={editMonthObjective}
                onChange={(e) => setEditMonthObjective(e.target.value)}
                placeholder="e.g. Improve 0-20m horizontal acceleration"
                required
              />
            </div>

            <div className="form-row-2">
              <div>
                <label>10m Acceleration Target (s):</label>
                <input
                  type="number"
                  step="0.01"
                  value={editMonth10m}
                  onChange={(e) => setEditMonth10m(e.target.value)}
                  placeholder="e.g. 1.98"
                />
              </div>
              <div>
                <label>Standing Broad Jump Target (m):</label>
                <input
                  type="number"
                  step="0.01"
                  value={editMonthBroadJump}
                  onChange={(e) => setEditMonthBroadJump(e.target.value)}
                  placeholder="e.g. 2.45"
                />
              </div>
            </div>

            <div>
              <label>Honest Milestone Status:</label>
              <select
                value={editMonthStatus}
                onChange={(e) => setEditMonthStatus(e.target.value)}
              >
                <option value="In Progress">In Progress</option>
                <option value="Partially Achieved">Partially Achieved</option>
                <option value="Achieved">Achieved</option>
                <option value="Behind Schedule">Behind Schedule</option>
              </select>
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="button ghost"
                onClick={() => setGoalsModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button orange">
                <Save size={14} />
                Save Goals
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Reschedule Session Modal */}
      {rescheduleModalOpen && (
        <Modal title="Reschedule Training Session" onClose={() => setRescheduleModalOpen(false)}>
          <form onSubmit={handleRescheduleSubmit} className="coach-form-stack">
            <p>
              Reassign this missed session to an appropriate date within the training schedule.
            </p>
            <div>
              <label>New Training Date:</label>
              <input
                type="date"
                value={rescheduleNewDate}
                onChange={(e) => setRescheduleNewDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label>Coach Notes & Rationale:</label>
              <textarea
                value={rescheduleNotes}
                onChange={(e) => setRescheduleNotes(e.target.value)}
                placeholder="Reason for reschedule (travel, weather, modified loading)…"
                rows={3}
              />
            </div>
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="button ghost"
                onClick={() => setRescheduleModalOpen(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button orange">
                Save Reschedule
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
