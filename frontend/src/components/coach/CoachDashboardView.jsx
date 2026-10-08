import React from "react";
import {
  Users,
  Activity,
  AlertTriangle,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  Clock3,
  TrendingUp,
  ChevronRight,
  Plus,
  ArrowRight,
  Target,
  Sparkles,
} from "lucide-react";

export function CoachDashboardView({
  dashboardData,
  onSelectAthlete,
  onNavigateTab,
  onStartPlanBuilder,
}) {
  const summary = dashboardData?.summary || {
    totalAthletes: 0,
    trainingToday: 0,
    needsReview: 0,
    safetyFlags: 0,
    missedTraining: 0,
    onTrack: 0,
  };

  const recentAthletes = dashboardData?.recentAthletes || [];
  const todaySessions = dashboardData?.todaySessions || [];
  const safetyAlerts = dashboardData?.safetyAlerts || [];

  const todayFormatted = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

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
    <div className="coach-dashboard-view">
      {/* Top Greeting & High-Performance Command Hero */}
      <div className="coach-welcome-banner">
        <div className="coach-welcome-left">
          <div className="coach-kicker-row">
            <span className="coach-kicker">ATHLETE PERFORMANCE RADAR</span>
            <span className="coach-live-date-pill">🗓️ {todayFormatted}</span>
          </div>
          <h2>GOOD MORNING, COACH</h2>
          <p>
            Real-time portfolio overview of your connected athletes, daily training compliance,
            safety flags, and periodized training roadmaps.
          </p>
          <div className="coach-hero-stats-row">
            <span className="hero-stat-badge">
              <strong>{summary.totalAthletes}</strong> Athletes Connected
            </span>
            <span className="hero-stat-badge highlight">
              <strong>{summary.trainingToday}</strong> Training Today
            </span>
            {summary.safetyFlags > 0 ? (
              <span className="hero-stat-badge danger">
                ⚠️ <strong>{summary.safetyFlags}</strong> Safety Alerts
              </span>
            ) : (
              <span className="hero-stat-badge success">
                ✓ Medical All Clear
              </span>
            )}
          </div>
        </div>
        <div className="coach-welcome-actions">
          <button
            className="button orange"
            onClick={() => onStartPlanBuilder()}
          >
            <Plus size={16} />
            Create Training Plan
          </button>
          <button
            className="button ghost"
            style={{ color: "#ffffff", borderColor: "rgba(255,255,255,0.25)" }}
            onClick={() => onNavigateTab("athletes")}
          >
            <Users size={16} />
            View All Athletes ({summary.totalAthletes})
          </button>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="coach-kpi-grid">
        <div
          className="coach-kpi-card clickable"
          onClick={() => onNavigateTab("athletes")}
        >
          <div className="coach-kpi-header">
            <span>Roster</span>
            <span className="kpi-mini-tag">Active</span>
          </div>
          <div className="kpi-body-row">
            <div className="kpi-icon-wrap" style={{ background: "#eef3e6", color: "#364c24" }}>
              <Users size={22} />
            </div>
            <div>
              <strong className="kpi-value">{summary.totalAthletes}</strong>
              <span className="kpi-label">Connected Athletes</span>
            </div>
          </div>
          <div className="kpi-card-footer-hint">Click to manage squad roster →</div>
        </div>

        <div className="coach-kpi-card">
          <div className="coach-kpi-header">
            <span>Today's Workouts</span>
            <span className="kpi-mini-tag success">Daily</span>
          </div>
          <div className="kpi-body-row">
            <div className="kpi-icon-wrap" style={{ background: "#e8f5e9", color: "#2e7d32" }}>
              <Activity size={22} />
            </div>
            <div>
              <strong className="kpi-value" style={{ color: "#2e7d32" }}>
                {summary.trainingToday}
              </strong>
              <span className="kpi-label">Active Sessions</span>
            </div>
          </div>
          <div className="kpi-card-footer-hint">Tracked via daily check-in radar</div>
        </div>

        <div
          className="coach-kpi-card clickable"
          onClick={() => onNavigateTab("athletes", { status: "Needs Review" })}
        >
          <div className="coach-kpi-header">
            <span>Adherence Check</span>
            <span className="kpi-mini-tag warning">Review</span>
          </div>
          <div className="kpi-body-row">
            <div className="kpi-icon-wrap" style={{ background: "#fff8e1", color: "#f57f17" }}>
              <Clock3 size={22} />
            </div>
            <div>
              <strong className="kpi-value" style={{ color: "#f57f17" }}>
                {summary.needsReview}
              </strong>
              <span className="kpi-label">Needs Review</span>
            </div>
          </div>
          <div className="kpi-card-footer-hint">Low adherence or uncompleted tasks</div>
        </div>

        <div
          className="coach-kpi-card clickable"
          onClick={() => onNavigateTab("recovery")}
        >
          <div className="coach-kpi-header">
            <span>Health & Safety</span>
            {summary.safetyFlags > 0 ? (
              <span className="kpi-mini-tag danger">Action Needed</span>
            ) : (
              <span className="kpi-mini-tag success">Clear</span>
            )}
          </div>
          <div className="kpi-body-row">
            <div
              className="kpi-icon-wrap"
              style={{
                background: summary.safetyFlags > 0 ? "#ffebee" : "#f1f3f4",
                color: summary.safetyFlags > 0 ? "#c62828" : "#5f6368",
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <div>
              <strong
                className="kpi-value"
                style={{ color: summary.safetyFlags > 0 ? "#c62828" : "#2e3b23" }}
              >
                {summary.safetyFlags}
              </strong>
              <span className="kpi-label">Safety Flags</span>
            </div>
          </div>
          <div className="kpi-card-footer-hint">
            {summary.safetyFlags > 0 ? "Review pain or fatigue reports →" : "No athletes flagged with pain"}
          </div>
        </div>
      </div>

      {/* Critical Safety Flags Banner if present */}
      {safetyAlerts.length > 0 && (
        <div className="safety-alert-banner-coach">
          <div className="alert-head">
            <div className="alert-icon-beacon">
              <AlertTriangle size={22} color="#dc2626" />
            </div>
            <div>
              <strong>SAFETY ALERT: ATTENTION REQUIRED BEFORE TRAINING LOAD ADVANCEMENT</strong>
              <p>
                {safetyAlerts.length} athlete(s) reported pain, acute soreness, or active injuries in recent check-ins.
                Do not increase training volume until evaluated.
              </p>
            </div>
          </div>
          <div className="alert-items-list">
            {safetyAlerts.map((alert, idx) => (
              <div key={idx} className="alert-item-row">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="alert-bullet">🔴</span>
                  <span className="alert-ath-name">{alert.athleteName}</span>
                  <span className="alert-ath-sport">({alert.sport} · {alert.event})</span>
                </div>
                <span className="alert-ath-msg">{alert.flag?.message || alert.flag?.label}</span>
                <button
                  className="button small danger ghost"
                  onClick={() => onSelectAthlete(alert.athleteId, "recovery")}
                >
                  Inspect Health Dossier →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Two-Column Layout: Left Recent Athletes, Right Today's Training & Quick Review */}
      <div className="coach-dashboard-columns">
        {/* Left Column: Athletes Portfolio */}
        <div className="dashboard-col-main">
          <div className="section-header-row">
            <div>
              <h3>Recent Athletes</h3>
              <p className="subtitle-sm">Connected athlete status, adherence, and phase progression</p>
            </div>
            <button
              className="button ghost small"
              onClick={() => onNavigateTab("athletes")}
            >
              View All ({recentAthletes.length}) <ChevronRight size={14} />
            </button>
          </div>

          {recentAthletes.length === 0 ? (
            <div className="empty-card-state">
              <Users size={36} color="#8a9976" />
              <h4>No Connected Athletes Yet</h4>
              <p>
                Athletes can connect with your coaching workspace by entering your coach email in
                their athlete profile settings.
              </p>
            </div>
          ) : (
            <div className="athletes-portfolio-grid">
              {recentAthletes.map((ath) => {
                const initials = (ath.name || "A")
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("");
                return (
                  <div key={ath.athleteId} className="athlete-portfolio-card">
                    <div className="ath-card-header">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="ath-avatar-initials-sm" title={ath.name}>
                          {initials}
                        </div>
                        <div>
                          <h4 className="ath-card-name">{ath.name}</h4>
                          <span className="ath-card-sport">
                            {ath.sport} • {ath.event}
                          </span>
                          {ath.district && (
                            <span className="ath-card-location-tag">
                              📍 {ath.district}, {ath.state}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`status-badge ${getStatusBadgeClass(ath.trainingStatus)}`}>
                        {ath.trainingStatus}
                      </span>
                    </div>

                    <div className="ath-metrics-row">
                      <div className="metric-box">
                        <span className="metric-lbl">CURRENT PB</span>
                        <strong className="metric-val">{ath.currentPB ? `${ath.currentPB}${ath.unit || "s"}` : "—"}</strong>
                      </div>
                      <div className="metric-box">
                        <span className="metric-lbl">TARGET GOAL</span>
                        <strong className="metric-val">{ath.yearTarget ? `${ath.yearTarget}${ath.unit || "s"}` : ath.goal || "—"}</strong>
                      </div>
                      <div className="metric-box">
                        <span className="metric-lbl">PHASE</span>
                        <strong className="metric-val">{ath.phase || "Foundation"}</strong>
                      </div>
                    </div>

                    <div className="ath-adherence-wrap">
                      <div className="adherence-label-row">
                        <span>14-Day Compliance</span>
                        <strong>{ath.adherence}%</strong>
                      </div>
                      <div className="adherence-progress-track">
                        <div
                          className="adherence-progress-fill"
                          style={{
                            width: `${Math.min(100, Math.max(5, ath.adherence))}%`,
                            background:
                              ath.adherence >= 80 ? "#2b7a1f" : ath.adherence >= 50 ? "#c9792c" : "#c92c2c",
                          }}
                        />
                      </div>
                    </div>

                    {ath.flags && ath.flags.length > 0 && (
                      <div className="ath-card-flags">
                        {ath.flags.slice(0, 2).map((fl, fIdx) => (
                          <span key={fIdx} className={`flag-tag ${fl.type || "warning"}`}>
                            {fl.label}: {fl.message}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="ath-card-footer">
                      <span className="last-train-hint">
                        Last: {ath.lastTrainingDate || "No session recorded"}
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="button small ghost"
                          onClick={() => onStartPlanBuilder(ath.athleteId)}
                          title="Create or edit training plan"
                        >
                          <Calendar size={13} />
                          Plan
                        </button>
                        <button
                          className="button small dark"
                          onClick={() => onSelectAthlete(ath.athleteId)}
                        >
                          Open Dossier
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Today's Training & High-Priority Actions */}
        <div className="dashboard-col-side">
          <div className="panel panel-pad" style={{ marginBottom: 16 }}>
            <div className="section-header-row" style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="radar-live-beacon" />
                <h3 style={{ fontSize: 16, margin: 0 }}>Today&apos;s Training Radar</h3>
              </div>
              <span className="pill small">{todaySessions.length} active</span>
            </div>

            {todaySessions.length === 0 ? (
              <div className="empty-mini">
                <Calendar size={24} color="#8a9976" style={{ margin: "0 auto 6px" }} />
                <p>No training sessions scheduled for today across your athletes.</p>
              </div>
            ) : (
              <div className="today-training-list">
                {todaySessions.map((ts, idx) => {
                  const initial = (ts.athleteName || "A")[0];
                  return (
                    <div
                      key={idx}
                      className="today-session-card clickable"
                      onClick={() => ts.athleteId && onSelectAthlete(ts.athleteId, "training")}
                      title="Click to view athlete training schedule"
                    >
                      <div className="today-ath-avatar">{initial}</div>
                      <div className="today-session-meta">
                        <strong className="today-session-ath-name">{ts.athleteName}</strong>
                        <span className="today-session-type">{ts.sessionType}</span>
                        {ts.objective && <span className="today-session-obj">{ts.objective}</span>}
                      </div>
                      <div className="ts-right">
                        {ts.status === "completed" && (
                          <span className="ts-status completed">
                            <CheckCircle2 size={13} /> Completed
                          </span>
                        )}
                        {ts.status === "partially_completed" && (
                          <span className="ts-status partial">
                            <AlertTriangle size={13} /> Partial
                          </span>
                        )}
                        {ts.status === "missed" && (
                          <span className="ts-status missed">
                            ❌ Missed
                          </span>
                        )}
                        {ts.status === "scheduled" && (
                          <span className="ts-status scheduled">
                            <Clock3 size={13} /> Scheduled
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Hub Navigation Cards */}
          <div className="panel panel-pad">
            <h4 style={{ margin: "0 0 12px", fontSize: 14 }}>Management Centers</h4>
            <div className="quick-centers-list">
              <div
                className="quick-center-item"
                onClick={() => onNavigateTab("plans")}
              >
                <Calendar size={16} />
                <div>
                  <strong>Training Plans Hub</strong>
                  <small>Weekly schedules, drafts, and published versions</small>
                </div>
                <ChevronRight size={14} />
              </div>

              <div
                className="quick-center-item"
                onClick={() => onNavigateTab("performance")}
              >
                <Activity size={16} />
                <div>
                  <strong>Performance Progression</strong>
                  <small>Benchmarks, test records & race splits</small>
                </div>
                <ChevronRight size={14} />
              </div>

              <div
                className="quick-center-item"
                onClick={() => onNavigateTab("recovery")}
              >
                <ShieldAlert size={16} />
                <div>
                  <strong>Recovery & Safety Flags</strong>
                  <small>Fatigue monitoring and pain reports</small>
                </div>
                <ChevronRight size={14} />
              </div>

              <div
                className="quick-center-item"
                onClick={() => onNavigateTab("goals")}
              >
                <Target size={16} />
                <div>
                  <strong>Yearly & Monthly Goals</strong>
                  <small>Season target tracking and verification</small>
                </div>
                <ChevronRight size={14} />
              </div>

              <div
                className="quick-center-item"
                onClick={() => onNavigateTab("notifications")}
              >
                <Sparkles size={16} />
                <div>
                  <strong>Notification Center</strong>
                  <small>Data-driven alerts and action items</small>
                </div>
                <ChevronRight size={14} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
