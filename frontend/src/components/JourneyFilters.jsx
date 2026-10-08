import { useState, useMemo } from "react";
import {
  Calendar,
  Filter,
  RotateCcw,
  Activity,
  Trophy,
  HeartPulse,
  Download,
} from "lucide-react";
import {
  QUICK_FILTERS,
  MONTH_NAMES,
  filterRecords,
  getFilterLabel,
  calculateJourneySummary,
} from "../lib/filters";
import { dateLabel } from "../lib/forms";
import { exportPdfByType } from "../lib/pdf";

export function JourneySection({
  data,
  user,
  notify,
}) {
  const currentYear = new Date().getFullYear();
  const availableYears = [
    String(currentYear + 1),
    String(currentYear),
    String(currentYear - 1),
    String(currentYear - 2),
  ];

  const allRecords = useMemo(() => {
    return [
      ...(data?.sessions || []).map((s) => ({ ...s, kind: "sessions" })),
      ...(data?.achievements || []).map((a) => ({ ...a, kind: "achievements" })),
      ...(data?.injuries || []).map((i) => ({ ...i, kind: "injuries" })),
    ];
  }, [data?.sessions, data?.achievements, data?.injuries]);

  const [filters, setFilters] = useState({
    quickFilter: "all",
    year: "",
    month: "",
    from: "",
    to: "",
    kind: "all",
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filteredRecords = useMemo(() => {
    return filterRecords(allRecords, filters);
  }, [allRecords, filters]);

  const activeLabel = useMemo(() => {
    return getFilterLabel(filters);
  }, [filters]);

  const summary = useMemo(() => {
    return calculateJourneySummary(filteredRecords, data?.profile || {});
  }, [filteredRecords, data?.profile]);

  function handleQuickFilter(id) {
    if (id === "custom") {
      setShowAdvanced(true);
      setFilters((prev) => ({ ...prev, quickFilter: "custom" }));
    } else {
      setFilters({
        quickFilter: id,
        year: "",
        month: "",
        from: "",
        to: "",
        kind: filters.kind,
      });
    }
  }

  function handleReset() {
    setFilters({
      quickFilter: "all",
      year: "",
      month: "",
      from: "",
      to: "",
      kind: "all",
    });
    setShowAdvanced(false);
  }

  async function handleExportCurrentView() {
    setExporting(true);
    try {
      await exportPdfByType({
        type: "journey",
        user,
        data,
        filteredRecords,
        filterLabel: activeLabel,
      });
      notify?.(`Training Journey (${activeLabel}) PDF exported.`);
    } catch (err) {
      notify?.(err.message || "Failed to export journey PDF", "error");
    } finally {
      setExporting(false);
    }
  }

  const isFiltered =
    filters.quickFilter !== "all" ||
    Boolean(filters.year) ||
    Boolean(filters.month) ||
    Boolean(filters.from) ||
    Boolean(filters.to) ||
    filters.kind !== "all";

  return (
    <section className="panel panel-pad journey-section">
      <div className="panel-title" style={{ flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>Your journey, in context</h2>
          <small style={{ color: "#81946a" }}>
            Chronological history of your training, achievements, and recovery milestones
          </small>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isFiltered && (
            <button
              type="button"
              className="button ghost small"
              onClick={handleReset}
              title="Reset all filters"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          )}

          <button
            type="button"
            className="button dark small"
            onClick={handleExportCurrentView}
            disabled={exporting}
          >
            <Download size={14} />
            <span>{exporting ? "Exporting…" : "Export view PDF"}</span>
          </button>
        </div>
      </div>

      {/* QUICK FILTER PILLS */}
      <div className="journey-quick-filters" role="group" aria-label="Timeline quick filters">
        {QUICK_FILTERS.map((q) => (
          <button
            key={q.id}
            type="button"
            className={`pill-filter ${filters.quickFilter === q.id ? "active" : ""}`}
            onClick={() => handleQuickFilter(q.id)}
          >
            {q.label}
          </button>
        ))}

        <button
          type="button"
          className={`pill-filter ${showAdvanced ? "active" : ""}`}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Filter size={12} />
          {showAdvanced ? "Hide Filters" : "More Filters"}
        </button>
      </div>

      {/* ADVANCED FILTER PANEL */}
      {showAdvanced && (
        <div className="journey-advanced-filters">
          <div className="filter-group">
            <label>
              <span>Year</span>
              <select
                value={filters.year}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    year: e.target.value,
                    quickFilter: "custom",
                  }))
                }
              >
                <option value="">All Years</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Month</span>
              <select
                value={filters.month}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    month: e.target.value,
                    quickFilter: "custom",
                  }))
                }
              >
                <option value="">All Months</option>
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={String(idx + 1)}>
                    {m}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>From Date</span>
              <input
                type="date"
                value={filters.from}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    from: e.target.value,
                    quickFilter: "custom",
                  }))
                }
              />
            </label>

            <label>
              <span>To Date</span>
              <input
                type="date"
                value={filters.to}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    to: e.target.value,
                    quickFilter: "custom",
                  }))
                }
              />
            </label>

            <label>
              <span>Activity Type</span>
              <select
                value={filters.kind}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, kind: e.target.value }))
                }
              >
                <option value="all">All Types</option>
                <option value="sessions">Training Sessions</option>
                <option value="achievements">Achievements</option>
                <option value="injuries">Recovery & Health</option>
              </select>
            </label>
          </div>
        </div>
      )}

      {/* LIVE FILTERED SUMMARY BAR */}
      <div className="journey-summary-bar">
        <div className="summary-item">
          <span className="summary-label">WINDOW</span>
          <strong className="summary-value">{activeLabel}</strong>
        </div>

        <div className="summary-item">
          <span className="summary-label">TOTAL ACTIVITIES</span>
          <strong className="summary-value">{summary.totalRecords}</strong>
        </div>

        <div className="summary-item">
          <span className="summary-label">TRAINING TIME</span>
          <strong className="summary-value">{summary.formattedDuration}</strong>
        </div>

        {summary.avgMetric && (
          <div className="summary-item">
            <span className="summary-label">AVG RESULT</span>
            <strong className="summary-value">
              {summary.avgMetric} {summary.unit}
            </strong>
          </div>
        )}

        <div className="summary-item">
          <span className="summary-label">MILESTONES</span>
          <strong className="summary-value">
            {summary.achievementsCount} Ach · {summary.injuriesCount} Rec
          </strong>
        </div>
      </div>

      {/* TIMELINE LIST */}
      {filteredRecords.length > 0 ? (
        <div className="timeline">
          {[...filteredRecords]
            .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
            .map((r) => (
              <article key={r.id}>
                <i className={r.kind} />
                <time>{dateLabel(r.date)}</time>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {r.kind === "sessions" ? (
                        <Activity size={12} />
                      ) : r.kind === "achievements" ? (
                        <Trophy size={12} />
                      ) : (
                        <HeartPulse size={12} />
                      )}
                      {r.kind.toUpperCase()}
                    </span>
                    {r.verified && (
                      <span className="pill small verified" style={{ fontSize: 10, padding: "2px 6px" }}>
                        Verified
                      </span>
                    )}
                  </div>
                  <h3>{r.title}</h3>
                  <p>
                    {r.result ||
                      r.stage ||
                      (r.metric
                        ? `${r.event || ""} · ${r.metric} ${r.unit || ""}`
                        : `${r.duration || 0} minutes of training`)}
                  </p>
                  {r.certificate?.url && (
                    <a
                      href={r.certificate.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontSize: 11, color: "#e26d40", display: "inline-block", marginTop: 4 }}
                    >
                      View certificate proof ↗
                    </a>
                  )}
                </div>
              </article>
            ))}
        </div>
      ) : (
        <div className="journey-empty-state">
          <Calendar size={32} style={{ color: "#a5b49b", marginBottom: 12 }} />
          <h3>No records found</h3>
          <p>
            There are no training or performance records matching <b>{activeLabel}</b>.
            <br />
            Try changing the month, year, or date range.
          </p>
          <button type="button" className="button ghost small" onClick={handleReset}>
            <RotateCcw size={14} />
            Reset all filters
          </button>
        </div>
      )}
    </section>
  );
}
