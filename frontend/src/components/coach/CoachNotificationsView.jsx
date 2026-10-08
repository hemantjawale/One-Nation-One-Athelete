import React, { useState } from "react";
import {
  Bell,
  AlertTriangle,
  ShieldAlert,
  Clock3,
  TrendingUp,
  Calendar,
  Filter,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export function CoachNotificationsView({
  notifications = [],
  loading,
  onSelectAthlete,
}) {
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = notifications.filter((n) => {
    if (categoryFilter === "all") return true;
    return n.category === categoryFilter;
  });

  return (
    <div className="coach-notifications-view">
      <div className="section-header-row" style={{ marginBottom: 16 }}>
        <div>
          <h2>Coach Notifications & Attention Alerts</h2>
          <p className="subtitle-sm">
            Event-driven alerts generated directly from real training check-ins, medical flags, and competition milestones.
          </p>
        </div>
        <div className="filter-group">
          <label>Filter:</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Alerts ({notifications.length})</option>
            <option value="health">Health & Safety</option>
            <option value="adherence">Training Adherence</option>
            <option value="performance">Performance PBs</option>
            <option value="competition">Competitions</option>
            <option value="training">Training Plans</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="empty">Checking notifications…</div>
      ) : filtered.length === 0 ? (
        <div className="empty-card-state" style={{ padding: "50px 20px" }}>
          <CheckCircle2 size={36} color="#2b7a1f" style={{ margin: "0 auto 10px" }} />
          <h3>All Clear · No Active Alerts</h3>
          <p>
            Your connected athletes have no pending safety alerts, repeated missed sessions, or urgent flags.
          </p>
        </div>
      ) : (
        <div className="notifications-list-stack" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((item) => {
            const isDanger = item.type === "danger";
            const isWarning = item.type === "warning";
            const isSuccess = item.type === "success";

            return (
              <div
                key={item.id}
                className={`panel panel-pad notif-card-item ${isDanger ? "border-danger" : isWarning ? "border-warning" : isSuccess ? "border-success" : ""}`}
                style={{
                  borderLeft: `4px solid ${isDanger ? "#c62828" : isWarning ? "#f57f17" : isSuccess ? "#2e7d32" : "#2e3b23"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ marginTop: 2 }}>
                      {isDanger && <ShieldAlert size={18} color="#c62828" />}
                      {isWarning && <AlertTriangle size={18} color="#f57f17" />}
                      {isSuccess && <TrendingUp size={18} color="#2e7d32" />}
                      {!isDanger && !isWarning && !isSuccess && <Calendar size={18} color="#2e3b23" />}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <strong style={{ fontSize: 15 }}>{item.title}</strong>
                        <span className="pill small ghost">{item.athleteName}</span>
                      </div>
                      <p style={{ margin: "4px 0", fontSize: 13, color: "#333" }}>{item.message}</p>
                      <small style={{ color: "#6a775b" }}>Date: {item.date}</small>
                    </div>
                  </div>

                  <button
                    className="button small dark"
                    onClick={() => onSelectAthlete(item.athleteId, item.category === "health" ? "recovery" : "training")}
                  >
                    Inspect Athlete <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
