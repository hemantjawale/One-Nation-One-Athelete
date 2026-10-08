import { useOutletContext } from "react-router-dom";
import { Plus, Trophy, ShieldCheck, MapPin, AlertCircle, CheckCircle2 } from "lucide-react";
import { PageTitle, Chart, PageLink, Actions, Empty } from "../components/UI";
import { dateLabel } from "../lib/forms";
import { sync } from "../lib/api";
import { ExportMenu } from "../components/ExportMenu";

export default function Performance() {
  const { data, add, remove, go, queued, action, user, notify } = useOutletContext(),
    p = data.profile,
    s = data.insights,
    b = data.benchmarks,
    c = data.comparison;

  // Personal performance metric
  const personalBest = c?.athlete?.personalBest ?? s.best ?? null;
  const isLowerBetter = c?.athlete?.direction === "lower_is_better" || (p.unit === "sec");

  return (
    <>
      <PageTitle
        kicker="MEASURE / UNDERSTAND / IMPROVE"
        title="Progress over promises"
        subtitle="Your actual results. Clear explanations. A stronger next session."
        action={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <ExportMenu
              user={user}
              data={data}
              notify={notify}
              pageContext="performance"
              buttonLabel="Export PDF"
              className="button dark"
            />
            <button className="button orange" onClick={() => add("sessions")}>
              <Plus size={17} />
              Log session
            </button>
          </div>
        }
      />

      <div className="dashboard-grid">
        <section className="panel panel-pad">
          <h2>
            {p.sportProfile?.discipline
              ? `${p.sportProfile.discipline} · ${p.event}`
              : p.event}{" "}
            progression
          </h2>
          <Chart
            sessions={data.sessions.filter(
              (r) => r.event === p.event && r.unit === p.unit,
            )}
          />
        </section>
        <section className="panel panel-pad">
          <span className="eyebrow">EXPLAINABLE PROGRESS INDEX</span>
          <div className="score-display">
            {s.score ?? "—"}
            <small>/100</small>
          </div>
          {s.dimensions.map((d) => (
            <div className="dimension" key={d.name} title={d.explanation}>
              <div>
                <span>{d.name}</span>
                <b>
                  {Math.round(d.value)} <small>× {d.weight}%</small>
                </b>
              </div>
              <div className="bar">
                <i style={{ width: d.value + "%" }} />
              </div>
            </div>
          ))}
          <PageLink onClick={() => go("transparency")}>
            How this is calculated
          </PageLink>
        </section>
      </div>

      {/* Automatic Sport-Aware Performance Comparison Engine */}
      <section className="panel panel-pad comparison-section">
        <div className="panel-title" style={{ marginBottom: 4 }}>
          <div>
            <span className="eyebrow">AUTOMATIC SPORT-AWARE COMPARISON</span>
            <h2>Performance Benchmark Engine</h2>
          </div>
          <span className="pill" style={{ background: "#e8ede0", color: "#30392a" }}>
            PROFILE DERIVED
          </span>
        </div>
        <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#647352" }}>
          Benchmarked automatically against verified competition data for your exact sport,
          discipline, age category, gender, and location. No manual category configuration needed.
        </p>

        {/* Dynamic Derived Parameters Bar */}
        <div className="auto-derived-bar">
          <span style={{ fontWeight: 600, color: "#506040", marginRight: 4 }}>Active Matching:</span>
          <span className="pill-tag accent">{c?.athlete?.sport || p.sport}</span>
          <span className="pill-tag">{c?.athlete?.event || p.event}</span>
          <span className="pill-tag">{c?.athlete?.gender || p.gender}</span>
          <span className="pill-tag">
            {c?.athlete?.ageCategory?.name || c?.athlete?.ageCategory?.label || "Age Group"}
            {c?.athlete?.age ? ` (${c.athlete.age} yrs)` : ""}
          </span>
          {c?.athlete?.weightCategory && (
            <span className="pill-tag">{c.athlete.weightCategory}</span>
          )}
          {p.district && <span className="pill-tag">{p.district} (District)</span>}
          {p.state && <span className="pill-tag">{p.state} (State)</span>}
          <span className="pill-tag">India (National)</span>
        </div>

        {/* Missing Weight Category Warning */}
        {c?.missingWeight && (
          <div className="notice" style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" }}>
            <AlertCircle size={18} style={{ display: "inline", verticalAlign: "middle", marginRight: 8 }} />
            <strong>Weight Category Required:</strong> {c.message}{" "}
            <button
              onClick={() => go("settings")}
              style={{
                marginLeft: 10,
                padding: "2px 8px",
                background: "#92400e",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Update Profile
            </button>
          </div>
        )}

        {/* Your Performance Banner */}
        <div className="comparison-hero">
          <div>
            <span className="eyebrow" style={{ color: "#c1cfb5" }}>YOUR BEST MEASURED PERFORMANCE</span>
            <div className="hero-metric-val">
              {personalBest !== null ? personalBest : "—"}{" "}
              <span style={{ fontSize: 20, color: "#f5f7ee", fontWeight: 400 }}>
                {c?.athlete?.unit || p.unit}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: "#c1cfb5" }}>
              {isLowerBetter ? "Lower is better (speed / time metric)" : "Higher is better (mark / score metric)"} ·{" "}
              {p.event}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="eyebrow" style={{ color: "#c1cfb5" }}>PERSONAL TARGET</span>
            <div style={{ fontSize: 24, fontWeight: 600, color: "#f5f7ee" }}>
              {p.target ? `${p.target} ${p.unit}` : "Not set"}
            </div>
          </div>
        </div>

        {/* Three-Tier Comparison Grid: District, State, National */}
        <div className="comparison-tiers-grid">
          {/* District Tier */}
          <TierCard
            tierName="District"
            location={c?.athlete?.district ? `${c.athlete.district} District` : "District"}
            stats={c?.district}
            unit={c?.athlete?.unit || p.unit}
            isLowerBetter={isLowerBetter}
            personalBest={personalBest}
          />

          {/* State Tier */}
          <TierCard
            tierName="State"
            location={c?.athlete?.state ? `${c.athlete.state} State` : "State"}
            stats={c?.state}
            unit={c?.athlete?.unit || p.unit}
            isLowerBetter={isLowerBetter}
            personalBest={personalBest}
          />

          {/* National Tier */}
          <TierCard
            tierName="National"
            location="All India National"
            stats={c?.national}
            unit={c?.athlete?.unit || p.unit}
            isLowerBetter={isLowerBetter}
            personalBest={personalBest}
          />
        </div>

        {/* Verification & Data Sources Metadata */}
        <div className="comparison-meta-box">
          <div>
            <strong>Verified Sources:</strong>{" "}
            {c?.metadata?.sources?.length ? (
              c.metadata.sources.map((s, idx) => (
                <span key={idx} style={{ marginRight: 10 }}>
                  {s.name || s.provider}{" "}
                  <span className="verification-pill">
                    <CheckCircle2 size={10} /> Verified
                  </span>
                </span>
              ))
            ) : (
              <span>Internal verified sports database</span>
            )}
          </div>
          <div>
            <strong>Last Updated:</strong>{" "}
            {c?.metadata?.updatedAt
              ? new Date(c.metadata.updatedAt).toLocaleDateString()
              : "Live calculation"}
          </div>
        </div>
      </section>

      {/* Consented Peer Cohort Research Distribution */}
      <section className="panel panel-pad">
        <h2>Consented Peer Network Distribution</h2>
        <p>
          Peer percentiles among registered consenting athletes in age band ({b.ageBand}),
          same event and classification. Minimum 5 verified peer samples required.
        </p>
        <div className="benchmark-grid">
          {b.groups.map((g) => (
            <article key={g.scope}>
              <span className="eyebrow">{g.scope.toUpperCase()}</span>
              <strong>
                {g.percentile === null ? "—" : g.percentile + "th"}
              </strong>
              <small>
                {g.percentile === null
                  ? "At least 5 verified peers required"
                  : `Percentile among ${g.count} peers`}
              </small>
            </article>
          ))}
        </div>
        <p style={{ margin: 0, fontSize: 11, color: "#83926e" }}>
          Self-reported progress index and research dataset comparison only, not an official sports federation ranking.
        </p>
      </section>

      {/* Training Log with Strict TrainingDate Ordering */}
      <section className="panel panel-pad">
        <div className="panel-title">
          <h2>Training log</h2>
          <span className="pill">{data.sessions.length} ENTRIES</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Session / event</th>
                <th>Training date</th>
                <th>Result</th>
                <th>Load</th>
                <th>Wellbeing</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...data.sessions]
                .sort((a, b) => (b.date || b.trainingDate || "").localeCompare(a.date || a.trainingDate || ""))
                .map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.title}</strong>
                      <small>
                        {r.event}
                        {r.verified ? " · Verified" : ""}
                      </small>
                    </td>
                    <td>{dateLabel(r.date || r.trainingDate)}</td>
                    <td>
                      {r.metric || "—"} {r.unit}
                    </td>
                    <td>
                      {r.duration} min × {r.effort}
                    </td>
                    <td>
                      Pain {r.pain}/10 · Fatigue {r.fatigue}/10
                    </td>
                    <td>
                      <Actions
                        edit={() => add("sessions", r)}
                        remove={() => remove("sessions", r)}
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!data.sessions.length && <Empty />}
        {queued > 0 && (
          <div className="notice">
            {queued} offline session(s) waiting to sync.{" "}
            <button
              onClick={() =>
                action(() => sync(user.id), "Offline records synced.")
              }
            >
              Sync now
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function TierCard({ tierName, location, stats, unit, isLowerBetter, personalBest }) {
  if (!stats || !stats.available) {
    return (
      <article className="tier-card">
        <div>
          <div className="tier-card-header">
            <div>
              <div className="tier-title">{tierName}</div>
              <div className="tier-sub">{location}</div>
            </div>
            <span className="quality-badge none">No records</span>
          </div>
          <div className="tier-unavailable-box">
            {stats?.reason || `${tierName} comparison unavailable for this event or category.`}
          </div>
        </div>
        <div className="tier-footer">
          <span>Sample size: 0</span>
          <span>Unavailable</span>
        </div>
      </article>
    );
  }

  const qualityClass =
    stats.dataQuality === "Strong dataset"
      ? "strong"
      : stats.dataQuality === "Moderate data"
        ? "moderate"
        : "limited";

  const gapValue = stats.gap;
  const isAhead = isLowerBetter ? gapValue <= 0 : gapValue >= 0;

  return (
    <article className="tier-card">
      <div>
        <div className="tier-card-header">
          <div>
            <div className="tier-title">{tierName}</div>
            <div className="tier-sub">{location}</div>
          </div>
          <span className={`quality-badge ${qualityClass}`}>
            {stats.dataQuality}
          </span>
        </div>

        <div className="tier-stats-list">
          <div className="tier-stat-row">
            <span className="stat-label">Best Record</span>
            <span className="stat-val" style={{ color: "#ff914d", fontSize: 16 }}>
              {stats.best !== null ? `${stats.best} ${unit}` : "—"}
            </span>
          </div>

          <div className="tier-stat-row">
            <span className="stat-label">Average (Mean)</span>
            <span className="stat-val">
              {stats.average !== null ? `${stats.average} ${unit}` : "—"}
            </span>
          </div>

          <div className="tier-stat-row">
            <span className="stat-label">Rank</span>
            <span className="stat-val">
              {personalBest !== null && stats.rank !== null ? `#${stats.rank} / ${stats.sampleSize}` : "—"}
            </span>
          </div>

          <div className="tier-stat-row">
            <span className="stat-label">Percentile</span>
            <span className="stat-val">
              {personalBest !== null && stats.percentile !== null ? `${stats.percentile}th` : "—"}
            </span>
          </div>

          <div className="tier-stat-row">
            <span className="stat-label">Gap to Record</span>
            <span className={`stat-val ${isAhead ? "stat-gap-ahead" : "stat-gap-behind"}`}>
              {personalBest !== null && gapValue !== null
                ? `${gapValue > 0 ? "+" : ""}${gapValue} ${unit}`
                : "—"}
            </span>
          </div>
        </div>

        {/* Official AFI PDF National Record Highlights */}
        {tierName === "National" && stats.nationalRecord && (
          <div
            style={{
              background: "#fdf8f4",
              border: "1px solid #fed7aa",
              borderRadius: 6,
              padding: "10px 12px",
              marginTop: 12,
              fontSize: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <strong style={{ color: "#c2410c", textTransform: "uppercase", fontSize: 10, letterSpacing: "0.5px" }}>
                Official National Record (AFI)
              </strong>
              {stats.nationalRecord.source?.url && (
                <a
                  href={stats.nationalRecord.source.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#ea580c", textDecoration: "underline", fontSize: 11, fontWeight: 600 }}
                  title="Open official Athletics Federation of India PDF record"
                >
                  View Official PDF ↗
                </a>
              )}
            </div>
            <div style={{ color: "#1f2937", fontWeight: 600, fontSize: 13 }}>
              {stats.nationalRecord.athleteName} ({stats.nationalRecord.state}) · {stats.nationalRecord.performance?.display || `${stats.nationalRecord.performance?.value} ${unit}`}
            </div>
            <div style={{ color: "#6b7280", fontSize: 11, marginTop: 2 }}>
              {stats.nationalRecord.competition?.name} · {stats.nationalRecord.competition?.date} · {stats.nationalRecord.competition?.location}
            </div>
            {stats.nationalRecord.gap !== null && personalBest !== null && (
              <div style={{ marginTop: 4, fontSize: 11.5, color: stats.nationalRecord.gap <= 0 ? "#15803d" : "#b45309", fontWeight: 600 }}>
                Delta to National Record: {stats.nationalRecord.gap > 0 ? "+" : ""}{stats.nationalRecord.gap} {unit}
              </div>
            )}
          </div>
        )}

        {/* Official Youth Record Highlights */}
        {tierName === "National" && stats.youthNationalRecord && (
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 6,
              padding: "8px 12px",
              marginTop: 8,
              fontSize: 11.5,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#166534", fontWeight: 600, fontSize: 10, textTransform: "uppercase" }}>
                National Youth (U18) Record
              </span>
              {stats.youthNationalRecord.source?.url && (
                <a
                  href={stats.youthNationalRecord.source.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#15803d", textDecoration: "underline", fontSize: 10.5 }}
                >
                  Youth PDF ↗
                </a>
              )}
            </div>
            <div style={{ color: "#1f2937", marginTop: 2 }}>
              <strong>{stats.youthNationalRecord.athleteName}</strong> ({stats.youthNationalRecord.state}) · {stats.youthNationalRecord.performance?.display || `${stats.youthNationalRecord.performance?.value} ${unit}`}
            </div>
          </div>
        )}
      </div>

      <div className="tier-footer">
        <span>Verified sample: {stats.sampleSize}</span>
        <span className="verification-pill">
          <CheckCircle2 size={10} /> Verified
        </span>
      </div>
    </article>
  );
}
