import React, { useState } from "react";
import {
  Calendar,
  Plus,
  CheckCircle2,
  Clock3,
  Edit,
  ArrowRight,
  Filter,
  Search,
} from "lucide-react";
import { dateLabel } from "../../lib/forms";

export function CoachTrainingPlansView({
  plans = [],
  athletes = [],
  loading,
  onStartPlanBuilder,
  onPublishPlan,
  onSelectAthlete,
  notify,
}) {
  const [statusFilter, setStatusFilter] = useState("All");
  const [athleteFilter, setAthleteFilter] = useState("All");
  const [planSearch, setPlanSearch] = useState("");

  const filteredPlans = plans.filter((pl) => {
    const ath = athletes.find((a) => a.athleteId === pl.athleteId);
    const matchStatus = statusFilter === "All" || pl.status === statusFilter;
    const matchAth = athleteFilter === "All" || pl.athleteId === athleteFilter;
    const matchSearch =
      !planSearch.trim() ||
      (ath?.name || "").toLowerCase().includes(planSearch.toLowerCase()) ||
      (pl.phase || "").toLowerCase().includes(planSearch.toLowerCase()) ||
      (pl.weeklyObjective || "").toLowerCase().includes(planSearch.toLowerCase());
    return matchStatus && matchAth && matchSearch;
  });

  return (
    <div className="coach-plans-view">
      {/* Filter Toolbar */}
      <div className="filters-search-toolbar">
        <div className="search-input-box">
          <Search size={15} color="#6a775b" />
          <input
            type="text"
            placeholder="Search plans by athlete, phase, or objective…"
            value={planSearch}
            onChange={(e) => setPlanSearch(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Athlete:</label>
          <select
            value={athleteFilter}
            onChange={(e) => setAthleteFilter(e.target.value)}
          >
            <option value="All">All Athletes</option>
            {athletes.map((a) => (
              <option key={a.athleteId} value={a.athleteId}>
                {a.name} ({a.event})
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Plan Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="draft">Draft (Coach Only)</option>
            <option value="published">Published</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty">Loading training plans…</div>
      ) : filteredPlans.length === 0 ? (
        <div className="empty-card-state" style={{ padding: "50px 20px" }}>
          <Calendar size={36} color="#8a9976" style={{ margin: "0 auto 10px" }} />
          <h3>No Training Plans Found</h3>
          <p>
            {statusFilter !== "All" || athleteFilter !== "All"
              ? "No training plans match the selected filters."
              : "No weekly training plans have been created yet. Click 'Create Training Plan' to build one."}
          </p>
        </div>
      ) : (
        <div className="plans-grid-stack" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredPlans.map((pl) => {
            const ath = athletes.find((a) => a.athleteId === pl.athleteId);
            const isDraft = pl.status === "draft";
            const daysCount = (pl.days || []).length;
            const completedCount = (pl.days || []).filter((d) => d.status === "completed").length;

            return (
              <div key={pl.id} className="panel panel-pad plan-item-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <h4 style={{ margin: 0, fontSize: 16 }}>
                        Week of {dateLabel(pl.weekStart)} – {pl.weekEnd ? dateLabel(pl.weekEnd) : ""}
                      </h4>
                      <span className={`pill small ${isDraft ? "amber" : "green"}`}>
                        {isDraft ? "Draft (Coach Only)" : "Published"}
                      </span>
                      <span className="pill small ghost">v{pl.version || 1}</span>
                    </div>
                    <p style={{ margin: "4px 0", fontSize: 13, color: "#2e3b23", fontWeight: 600 }}>
                      Athlete: {ath?.name || pl.athleteId} ({ath?.sport} · {ath?.event})
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: "#556247" }}>
                      Phase: <strong>{pl.phase || "Acceleration"}</strong> · Objective: <strong>{pl.weeklyObjective}</strong>
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {isDraft && (
                      <button
                        className="button orange small"
                        onClick={async () => {
                          try {
                            await onPublishPlan(pl.id);
                            notify?.("Plan published successfully. Now visible to athlete.");
                          } catch (err) {
                            notify?.("Error publishing: " + err.message, "error");
                          }
                        }}
                      >
                        <CheckCircle2 size={13} />
                        Publish
                      </button>
                    )}
                    <button
                      className="button ghost small"
                      onClick={() => onStartPlanBuilder(pl.athleteId)}
                    >
                      <Edit size={13} />
                      Edit Plan
                    </button>
                    <button
                      className="button dark small"
                      onClick={() => onSelectAthlete(pl.athleteId, "training")}
                    >
                      View Details
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Day-by-Day Mini Strip */}
                <div className="plan-days-strip">
                  {(pl.days || []).map((d, dIdx) => (
                    <div
                      key={dIdx}
                      className={`plan-mini-day ${d.status === "completed" ? "completed" : d.status === "missed" ? "missed" : "scheduled"}`}
                    >
                      <div className="mini-day-top">
                        <span className="mini-day-name">{d.dayOfWeek.slice(0, 3)}</span>
                        <span className={`mini-day-badge ${d.status || "scheduled"}`}>
                          {d.status === "completed" ? "✓" : d.status === "missed" ? "✕" : "•"}
                        </span>
                      </div>
                      <span className="mini-day-session" title={d.sessionType}>
                        {d.sessionType}
                      </span>
                      <span className="mini-day-status-label">
                        {d.status || "Scheduled"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
