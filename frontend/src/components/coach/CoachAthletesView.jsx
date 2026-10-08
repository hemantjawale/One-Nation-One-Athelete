import React, { useState } from "react";
import {
  Users,
  Search,
  Filter,
  Calendar,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Plus,
  LayoutGrid,
  List,
} from "lucide-react";

export function CoachAthletesView({
  athletes,
  loading,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sportFilter,
  onSportFilterChange,
  onSelectAthlete,
  onStartPlanBuilder,
}) {
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"

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

  // Derive unique sports list
  const uniqueSports = ["All", ...new Set(athletes.map((a) => a.sport).filter(Boolean))];

  return (
    <div className="coach-athletes-view">
      {/* Search, Filters, and View Switcher Toolbar */}
      <div className="filters-search-toolbar">
        <div className="search-input-box">
          <Search size={16} color="#6a775b" />
          <input
            type="text"
            placeholder="Search athlete by name, sport, event, or district…"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Sport:</label>
          <select
            value={sportFilter}
            onChange={(e) => onSportFilterChange(e.target.value)}
          >
            {uniqueSports.map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="On Track">On Track</option>
            <option value="Needs Review">Needs Review</option>
            <option value="Behind Goal">Behind Goal</option>
            <option value="Low Adherence">Low Adherence</option>
            <option value="Recovery Concern">Recovery Concern</option>
            <option value="Safety Flag">Safety Flag</option>
            <option value="No Recent Data">No Recent Data</option>
          </select>
        </div>

        <div className="view-toggle-wrap">
          <button
            className={`toggle-btn ${viewMode === "cards" ? "active" : ""}`}
            onClick={() => setViewMode("cards")}
            title="Card view"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            className={`toggle-btn ${viewMode === "table" ? "active" : ""}`}
            onClick={() => setViewMode("table")}
            title="Table view"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Quick Status Filter Chips */}
      <div className="status-quick-pills-row">
        {[
          ["All", "All Athletes"],
          ["On Track", "On Track"],
          ["Needs Review", "Needs Review"],
          ["Behind Goal", "Behind Goal"],
          ["Low Adherence", "Low Adherence"],
          ["Recovery Concern", "Recovery Concern"],
          ["Safety Flag", "Safety Flag"],
        ].map(([stVal, stLabel]) => (
          <button
            key={stVal}
            className={`quick-status-chip ${statusFilter === stVal ? "active" : ""}`}
            onClick={() => onStatusFilterChange(stVal)}
          >
            {stVal === "Safety Flag" && "⚠️ "}
            {stLabel}
          </button>
        ))}
      </div>

      {/* Content Rendering: Loading, Empty, Cards, or Table */}
      {loading ? (
        <div className="empty" style={{ padding: "40px 0" }}>
          Loading your athletes…
        </div>
      ) : athletes.length === 0 ? (
        <div className="empty-card-state" style={{ padding: "50px 20px" }}>
          <Users size={40} color="#8a9976" style={{ margin: "0 auto 12px" }} />
          <h3>No Connected Athletes Matching Filters</h3>
          <p>
            {searchQuery || statusFilter !== "All" || sportFilter !== "All"
              ? "Try resetting your search or status filter to see all connected athletes."
              : "No athletes are connected to this coach account yet. Athletes can add your email in their profile."}
          </p>
        </div>
      ) : viewMode === "cards" ? (
        <div className="athletes-portfolio-grid">
          {athletes.map((ath) => {
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
                        {ath.sport} • {ath.event} • {ath.gender} • {ath.age}y
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
                    <span className="metric-lbl">GOAL</span>
                    <strong className="metric-val">{ath.yearTarget ? `${ath.yearTarget}${ath.unit || "s"}` : ath.goal || "—"}</strong>
                  </div>
                  <div className="metric-box">
                    <span className="metric-lbl">PHASE</span>
                    <strong className="metric-val">{ath.currentPhase || "Foundation"}</strong>
                  </div>
                </div>

                <div className="ath-adherence-wrap">
                  <div className="adherence-label-row">
                    <span>Training Adherence</span>
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
                    {ath.flags.map((fl, fIdx) => (
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
      ) : (
        <div className="panel" style={{ overflowX: "auto" }}>
          <table className="coach-athletes-table">
            <thead>
              <tr>
                <th>Athlete</th>
                <th>Sport & Event</th>
                <th>Age / Gender</th>
                <th>Current PB</th>
                <th>Target Goal</th>
                <th>Current Phase</th>
                <th>Adherence</th>
                <th>Status</th>
                <th>Last Active</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((ath) => {
                const initials = (ath.name || "A")
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("");
                return (
                  <tr key={ath.athleteId}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="ath-avatar-initials-xs">{initials}</div>
                        <div>
                          <strong>{ath.name}</strong>
                          <small style={{ display: "block", color: "#6a775b" }}>{ath.district || ath.state}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span>{ath.sport}</span>
                      <small style={{ display: "block", color: "#6a775b" }}>{ath.event}</small>
                    </td>
                    <td>
                      {ath.gender} • {ath.age}y
                    </td>
                    <td>
                      <strong>{ath.currentPB ? `${ath.currentPB}${ath.unit || "s"}` : "—"}</strong>
                    </td>
                    <td>
                      <strong>{ath.yearTarget ? `${ath.yearTarget}${ath.unit || "s"}` : ath.goal || "—"}</strong>
                    </td>
                    <td>{ath.currentPhase || "Foundation"}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div
                          style={{
                            width: 44,
                            height: 6,
                            background: "#e4ebdb",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${ath.adherence}%`,
                              height: "100%",
                              background: ath.adherence >= 80 ? "#2b7a1f" : "#c9792c",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{ath.adherence}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(ath.trainingStatus)}`}>
                        {ath.trainingStatus}
                      </span>
                    </td>
                    <td>
                      <small>{ath.lastTrainingDate || "None"}</small>
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        className="button small ghost"
                        style={{ marginRight: 6 }}
                        onClick={() => onStartPlanBuilder(ath.athleteId)}
                      >
                        Plan
                      </button>
                      <button
                        className="button small dark"
                        onClick={() => onSelectAthlete(ath.athleteId)}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
