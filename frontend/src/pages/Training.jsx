import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Activity, HeartPulse, Clock3 } from "lucide-react";
import { PageTitle, Actions } from "../components/UI";
import { today } from "../lib/forms";
import { api } from "../lib/api";
export default function Training() {
  const { data, action, busy, add, remove } = useOutletContext(),
    p = data.profile,
    s = data.insights;
  return (
    <>
      <PageTitle
        kicker="INTENTION / CONSISTENCY / PROGRESS"
        title="Train with purpose"
        subtitle="A resource-aware weekly starting plan, based on your logged wellbeing."
        action={
          <button
            className="button orange"
            disabled={busy}
            onClick={() =>
              action(
                () =>
                  api("/records/plans", {
                    method: "POST",
                    body: {
                      title: "Weekly plan · " + today(),
                      date: today(),
                      days: s.plan,
                      notes: "Rules-based suggestion. Review with your coach.",
                    },
                  }),
                "Weekly plan saved.",
              )
            }
          >
            <Plus size={17} />
            Save this weekly plan
          </button>
        }
      />
      <div className="notice">
        Plan inputs: {p.sport} · {p.classification} · {p.equipment}. {s.risk}.
        These are explainable rules-based suggestions, not validated medical or
        coaching prescriptions.
      </div>
      <div className="week-grid">
        {s.plan.map((d, i) => (
          <article
            className={"day-card " + (!d.duration ? "rest" : "")}
            key={d.day}
          >
            <span className="eyebrow">
              {d.day.slice(0, 3)} <b>0{i + 1}</b>
            </span>
            <div>
              {d.duration ? <Activity size={24} /> : <HeartPulse size={24} />}
              <h3>{d.title}</h3>
              <p>{d.detail}</p>
            </div>
            <span className="day-duration">
              <Clock3 size={14} />
              {d.duration ? d.duration + " MIN" : "RECOVER"}
            </span>
          </article>
        ))}
      </div>
      <section className="panel panel-pad">
        <h2>Saved plans</h2>
        {data.plans.length ? (
          data.plans.map((plan) => (
            <div className="saved-plan" key={plan.id}>
              <div className="panel-title">
                <div>
                  <h3>{plan.title}</h3>
                  <small>
                    {plan.days.filter((d) => d.done).length} /{" "}
                    {plan.days.length} days complete
                  </small>
                </div>
                <Actions
                  edit={() => add("plans", plan)}
                  remove={() => remove("plans", plan)}
                />
              </div>
              <div className="plan-checks">
                {plan.days.map((d, i) => (
                  <PlanDay
                    key={d.day + String(d.done)}
                    {...{ d, i, plan, action, busy }}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <p>Save a week to track your training adherence.</p>
        )}
      </section>
    </>
  );
}
function PlanDay({ d, i, plan, action, busy }) {
  const [done, setDone] = useState(!!d.done);
  return (
    <label>
      <input
        type="checkbox"
        disabled={busy}
        checked={done}
        onChange={async (e) => {
          const next = e.target.checked;
          setDone(next);
          if (
            !(await action(() =>
              api("/records/plans/" + plan.id, {
                method: "PUT",
                body: {
                  ...plan,
                  days: plan.days.map((day, j) =>
                    j === i ? { ...day, done: next } : day,
                  ),
                },
              }),
            ))
          )
            setDone(!next);
        }}
      />
      {d.day}
    </label>
  );
}
