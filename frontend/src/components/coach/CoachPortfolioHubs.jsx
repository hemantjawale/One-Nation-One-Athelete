import React from "react";
import {
  TrendingUp,
  Activity,
  ShieldAlert,
  AlertTriangle,
  Target,
  Layers,
  ArrowRight,
  CheckCircle2,
  Clock3,
} from "lucide-react";

export function CoachPerformanceHubView({ athletes = [], onSelectAthlete }) {
  return (
    <div className="coach-performance-hub-view">
      <div className="section-header-row" style={{ marginBottom: 16 }}>
        <div>
          <h2>Athletes Performance Portfolio</h2>
          <p className="subtitle-sm">
            Cross-athlete timing marks, season personal bests, and target competition progressions.
          </p>
        </div>
      </div>

      <div className="panel panel-pad" style={{ background: "#fbfcf8", border: "1px solid #d5dec6", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <strong style={{ display: "block", color: "#1f271b", fontSize: 13 }}>
              Official National Records (Athletics Federation of India)
            </strong>
            <span style={{ fontSize: 12, color: "#6a775b" }}>
              National level comparisons are verified against official AFI Record documents.
            </span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <a
              href="/records/National/National-Record_24NOV2024.pdf"
              target="_blank"
              rel="noreferrer"
              className="button small ghost"
              style={{ textDecoration: "none" }}
            >
              Senior National Records PDF ↗
            </a>
            <a
              href="/records/National/NYR_01SEP2022-1.pdf"
              target="_blank"
              rel="noreferrer"
              className="button small ghost"
              style={{ textDecoration: "none" }}
            >
              Youth (U18) Records PDF ↗
            </a>
          </div>
        </div>
      </div>

      <div className="panel panel-pad">
        <table className="coach-athletes-table">
          <thead>
            <tr>
              <th>Athlete</th>
              <th>Sport & Event</th>
              <th>Current PB</th>
              <th>Season Target</th>
              <th>Goal Gap</th>
              <th>Last Performance</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map((ath) => {
              const gap =
                ath.currentPB && ath.yearTarget
                  ? (ath.currentPB - ath.yearTarget).toFixed(2)
                  : null;
              return (
                <tr key={ath.athleteId}>
                  <td>
                    <strong>{ath.name}</strong>
                    <small style={{ display: "block", color: "#6a775b" }}>{ath.district || ath.state}</small>
                  </td>
                  <td>{ath.sport} • {ath.event}</td>
                  <td>
                    <strong style={{ color: "#2e3b23" }}>
                      {ath.currentPB ? `${ath.currentPB}${ath.unit || "s"}` : "—"}
                    </strong>
                  </td>
                  <td>
                    <strong style={{ color: "#c9792c" }}>
                      {ath.yearTarget ? `${ath.yearTarget}${ath.unit || "s"}` : ath.goal || "—"}
                    </strong>
                  </td>
                  <td>{gap ? `${gap}s` : "—"}</td>
                  <td>
                    <small>{ath.lastTrainingDate || "None"}</small>
                  </td>
                  <td>
                    <span className="pill small dark">{ath.trainingStatus}</span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="button small dark"
                      onClick={() => onSelectAthlete(ath.athleteId, "performance")}
                    >
                      Inspect <ArrowRight size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CoachRecoveryHubView({ athletes = [], onSelectAthlete }) {
  const flaggedAthletes = athletes.filter(
    (a) =>
      a.trainingStatus === "Safety Flag" ||
      a.trainingStatus === "Recovery Concern" ||
      (a.flags && a.flags.length > 0)
  );

  return (
    <div className="coach-recovery-hub-view">
      <div className="section-header-row" style={{ marginBottom: 16 }}>
        <div>
          <h2>Recovery & Safety Monitoring Center</h2>
          <p className="subtitle-sm">
            Centralized health compliance, fatigue alerts, and pain flags across your athlete squad.
          </p>
        </div>
      </div>

      {flaggedAthletes.length === 0 ? (
        <div className="panel panel-pad" style={{ textAlign: "center", padding: "50px 20px" }}>
          <CheckCircle2 size={36} color="#2b7a1f" style={{ margin: "0 auto 10px" }} />
          <h3>All Athletes Cleared · No Recovery Warnings</h3>
          <p style={{ color: "#556247" }}>
            No athletes have reported acute muscle soreness, active injuries, or high fatigue scores.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {flaggedAthletes.map((ath) => (
            <div key={ath.athleteId} className="panel panel-pad" style={{ borderLeft: "4px solid #c62828" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong>{ath.name}</strong>
                    <span className="pill small danger">{ath.trainingStatus}</span>
                    <span className="pill small ghost">{ath.sport} · {ath.event}</span>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    {(ath.flags || []).map((f, i) => (
                      <div key={i} className="flag-tag danger" style={{ display: "inline-block", marginRight: 8, marginTop: 4 }}>
                        {f.label}: {f.message}
                      </div>
                    ))}
                  </div>

                  <p style={{ margin: "8px 0 0", fontSize: 13, color: "#6a775b" }}>
                    Last training session logged: {ath.lastTrainingDate || "None"}
                  </p>
                </div>

                <button
                  className="button small dark"
                  onClick={() => onSelectAthlete(ath.athleteId, "recovery")}
                >
                  Review Medical Log <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CoachGoalsHubView({ athletes = [], onSelectAthlete }) {
  return (
    <div className="coach-goals-hub-view">
      <div className="section-header-row" style={{ marginBottom: 16 }}>
        <div>
          <h2>Squad Goals Portfolio</h2>
          <p className="subtitle-sm">
            Overview of annual season targets, target competitions, and progress trajectory across athletes.
          </p>
        </div>
      </div>

      <div className="panel panel-pad">
        <table className="coach-athletes-table">
          <thead>
            <tr>
              <th>Athlete</th>
              <th>Current PB</th>
              <th>Season Target</th>
              <th>Target Meet</th>
              <th>Competition Date</th>
              <th>Trajectory</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {athletes.map((ath) => (
              <tr key={ath.athleteId}>
                <td>
                  <strong>{ath.name}</strong>
                  <small style={{ display: "block", color: "#6a775b" }}>{ath.sport} · {ath.event}</small>
                </td>
                <td>{ath.currentPB ? `${ath.currentPB}s` : "—"}</td>
                <td>
                  <strong style={{ color: "#c9792c" }}>{ath.yearTarget ? `${ath.yearTarget}s` : ath.goal || "—"}</strong>
                </td>
                <td>{ath.targetCompetition || "State Championship"}</td>
                <td>{ath.competitionDate || "Not scheduled"}</td>
                <td>
                  <span className={`pill small ${ath.trainingStatus === "On Track" ? "green" : ath.trainingStatus === "Behind Goal" ? "red" : "amber"}`}>
                    {ath.trainingStatus}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    className="button small dark"
                    onClick={() => onSelectAthlete(ath.athleteId, "goals")}
                  >
                    Manage <ArrowRight size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CoachRoadmapsHubView({ athletes = [], onSelectAthlete }) {
  const levels = [
    { level: 1, name: "Foundation", title: "Level 1: Foundation Mechanics" },
    { level: 2, name: "Acceleration", title: "Level 2: Acceleration Drive" },
    { level: 3, name: "Maximum Velocity", title: "Level 3: Maximum Velocity" },
    { level: 4, name: "Speed Endurance", title: "Level 4: Speed Endurance" },
    { level: 5, name: "Competition Prep", title: "Level 5: Competition Preparation" },
    { level: 6, name: "Championship Peak", title: "Level 6: Championship Peak" },
  ];

  return (
    <div className="coach-roadmaps-hub-view">
      <div className="section-header-row" style={{ marginBottom: 16 }}>
        <div>
          <h2>Squad Roadmap & Long-Term Journey Distribution</h2>
          <p className="subtitle-sm">
            Sprint Development Journey levels (1 to 6) based on verified session exposure and testing requirements.
          </p>
        </div>
      </div>

      <div className="roadmap-tiers-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {levels.map((lvl) => {
          const athsInLevel = athletes.filter(
            (a) => (a.currentRoadmapLevel || 1) === lvl.level || (a.currentPhase && a.currentPhase.toLowerCase().includes(lvl.name.toLowerCase()))
          );
          return (
            <div key={lvl.level} className="panel panel-pad" style={{ minHeight: 180 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="pill dark">Level {lvl.level}</span>
                <span className="pill small ghost">{athsInLevel.length} athlete(s)</span>
              </div>
              <h4 style={{ margin: "0 0 6px" }}>{lvl.name}</h4>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#6a775b" }}>{lvl.title}</p>

              {athsInLevel.length === 0 ? (
                <small style={{ color: "#8a9976" }}>No athletes currently at this level.</small>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {athsInLevel.map((a) => (
                    <div
                      key={a.athleteId}
                      className="clickable"
                      style={{
                        padding: "6px 8px",
                        background: "#f9faf6",
                        border: "1px solid #dce4cf",
                        borderRadius: 4,
                        fontSize: 13,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                      onClick={() => onSelectAthlete(a.athleteId, "roadmap")}
                    >
                      <strong>{a.name}</strong>
                      <small style={{ color: "#2e3b23" }}>{a.event}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
