import { useOutletContext } from "react-router-dom";
import { Plus, HeartPulse, Activity, Clock3, Check } from "lucide-react";
import { PageTitle, Stat, Actions, Empty } from "../components/UI";
import { stages, dateLabel } from "../lib/forms";
export default function Recovery() {
  const { data, add, remove } = useOutletContext(),
    s = data.insights;
  return (
    <>
      <PageTitle
        kicker="WELLBEING / BEFORE EVERYTHING"
        title="Come back stronger"
        subtitle="A shared recovery journey, one reviewed milestone at a time."
        action={
          <button className="button orange" onClick={() => add("injuries")}>
            <Plus size={17} />
            Add recovery record
          </button>
        }
      />
      <div className="recovery-banner">
        <HeartPulse size={45} strokeWidth={1} />
        <div>
          <span className="eyebrow">{s.risk.toUpperCase()}</span>
          <h2>{s.guidance}</h2>
          <p>
            Risk indicators only. No diagnosis. A qualified professional should
            guide rehabilitation and return to play.
          </p>
        </div>
      </div>
      <div className="stat-grid three">
        <Stat
          label="REPORTED PAIN"
          value={s.pain}
          suffix="/10"
          detail="Highest in last 7 logged sessions"
          icon={HeartPulse}
        />
        <Stat
          label="AVERAGE FATIGUE"
          value={s.fatigue.toFixed(1)}
          suffix="/10"
          detail="Last 7 logged sessions"
          icon={Activity}
        />
        <Stat
          label="RECENT WORKLOAD"
          value={s.workload}
          detail="Duration × effort, last 7 sessions"
          icon={Clock3}
        />
      </div>
      {data.injuries.length ? (
        data.injuries.map((r) => (
          <section className="panel panel-pad" key={r.id}>
            <div className="panel-title">
              <div>
                <h2>{r.title}</h2>
                <small>Started {dateLabel(r.date)}</small>
              </div>
              <Actions
                edit={() => add("injuries", r)}
                remove={() => remove("injuries", r)}
              />
            </div>
            <div className="recovery-stages">
              {stages.map((stage, i) => (
                <div
                  key={stage}
                  className={i <= stages.indexOf(r.stage) ? "complete" : ""}
                >
                  <span>
                    {i < stages.indexOf(r.stage) ? <Check size={17} /> : i + 1}
                  </span>
                  <strong>{stage}</strong>
                </div>
              ))}
            </div>
            <p>
              {r.notes || "Add clinician guidance and milestone observations."}
            </p>
            <span className="pill">
              {r.cleared
                ? "Professional clearance recorded"
                : "Clearance not yet recorded"}
            </span>
          </section>
        ))
      ) : (
        <section className="panel">
          <Empty
            title="Keep wellbeing in the picture"
            text="Record a recovery journey when needed. Log pain and fatigue with every training session."
          />
        </section>
      )}
    </>
  );
}
