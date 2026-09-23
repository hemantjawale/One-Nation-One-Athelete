import { useOutletContext } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageTitle, Chart, PageLink, Actions, Empty } from "../components/UI";
import { dateLabel } from "../lib/forms";
import { sync } from "../lib/api";
export default function Performance() {
  const { data, add, remove, go, queued, action, user } = useOutletContext(),
    p = data.profile,
    s = data.insights,
    b = data.benchmarks;
  return (
    <>
      <PageTitle
        kicker="MEASURE / UNDERSTAND / IMPROVE"
        title="Progress over promises"
        subtitle="Your actual results. Clear explanations. A stronger next session."
        action={
          <button className="button orange" onClick={() => add("sessions")}>
            <Plus size={17} />
            Log session
          </button>
        }
      />
      <div className="dashboard-grid">
        <section className="panel panel-pad">
          <h2>{p.event} progression</h2>
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
      <section className="panel panel-pad">
        <h2>Compare like with like</h2>
        <p>
          Same sport, event, age band ({b.ageBand}), category, classification,
          and unit. One best verified result per consenting peer; demo accounts
          excluded.
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
        <p>
          Dataset comparison only, not an official national ranking. Your own
          result may be self-reported.
        </p>
      </section>
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
                <th>Date</th>
                <th>Result</th>
                <th>Load</th>
                <th>Wellbeing</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...data.sessions]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.title}</strong>
                      <small>
                        {r.event}
                        {r.verified ? " · Verified" : ""}
                      </small>
                    </td>
                    <td>{dateLabel(r.date)}</td>
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
