import { useOutletContext } from "react-router-dom";
import {
  Plus,
  Trophy,
  Activity,
  TrendingUp,
  Compass,
  HeartPulse,
  ArrowUpRight,
} from "lucide-react";
import { PageTitle, Stat, Chart, Empty, PageLink } from "../components/UI";
import { dateLabel } from "../lib/forms";
export default function Dashboard() {
  const { data, add, go } = useOutletContext(),
    p = data.profile,
    s = data.insights,
    rows = data.sessions.filter(
      (r) => r.event === p.event && r.unit === p.unit,
    );
  return (
    <>
      <PageTitle
        kicker="EVERY DAY IS A STARTING LINE"
        title={`Let's go, ${p.name.split(" ")[0]}`}
        subtitle="Small steps. Measurable progress. Your next chapter starts here."
        action={
          <button className="button orange" onClick={() => add("sessions")}>
            <Plus size={17} />
            Log a session
          </button>
        }
      />
      <div className="dashboard-hero">
        <div>
          <span className="eyebrow">YOUR NEXT FINISH LINE</span>
          <h2>{p.goal || "GREATNESS STARTS WITH SHOWING UP."}</h2>
          <PageLink onClick={() => go("training")}>Make a plan</PageLink>
        </div>
        <div className="hero-track-number">
          01<span>ONE DAY AT A TIME</span>
        </div>
      </div>
      <div className="stat-grid">
        <Stat
          label="PERSONAL BEST"
          value={s.best ?? "—"}
          suffix={p.unit}
          detail={p.event + " · your logged results"}
          icon={Trophy}
        />
        <Stat
          label="TRAINING SESSIONS"
          value={s.sessions}
          detail="Every session moves you forward"
          icon={Activity}
        />
        <Stat
          label="PROGRESS SCORE"
          value={s.score ?? "—"}
          suffix="/100"
          detail="Transparent personal progress index"
          icon={TrendingUp}
        />
        <Stat
          label="OPPORTUNITIES"
          value={data.opportunities.filter((o) => o.eligible).length}
          detail="Eligible matches in this dataset"
          icon={Compass}
        />
      </div>
      <div className="dashboard-grid">
        <section className="panel panel-pad">
          <div className="panel-title">
            <div>
              <span className="eyebrow">THE WORK IS SHOWING</span>
              <h2>Performance trajectory</h2>
            </div>
            <button
              className="icon-button"
              aria-label="View performance"
              onClick={() => go("performance")}
            >
              <ArrowUpRight />
            </button>
          </div>
          <Chart sessions={rows} />
          <div className="chart-footer">
            <span>{p.event} / measured results</span>
            <span>
              {s.improvement > 0 ? "+" : ""}
              {s.improvement}% since baseline
            </span>
          </div>
        </section>
        <section className="panel panel-pad wellbeing">
          <HeartPulse size={26} />
          <span className="eyebrow">CHECK IN WITH YOURSELF</span>
          <h2>{s.risk}</h2>
          <p>{s.guidance}</p>
          <PageLink onClick={() => go("recovery")}>Your wellbeing</PageLink>
        </section>
      </div>
      <section className="panel panel-pad">
        <div className="panel-title">
          <h2>Recent activity</h2>
          <PageLink onClick={() => go("passport")}>Full timeline</PageLink>
        </div>
        {data.sessions.length ? (
          [...data.sessions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 3)
            .map((r) => (
              <div className="activity-row" key={r.id}>
                <span className="activity-icon">
                  <Activity size={18} />
                </span>
                <div>
                  <strong>{r.title}</strong>
                  <small>
                    {dateLabel(r.date)} · {r.duration} min
                  </small>
                </div>
                <b>
                  {r.metric || "—"} <small>{r.unit}</small>
                </b>
                <span className="pill">RECORDED</span>
              </div>
            ))
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}
