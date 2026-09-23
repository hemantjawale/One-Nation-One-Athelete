import { useOutletContext } from "react-router-dom";
import { Activity, Trophy } from "lucide-react";
import { PageTitle, Chart, Empty } from "../components/UI";
import { dateLabel } from "../lib/forms";
import { api } from "../lib/api";
export default function Coach() {
  const { data, user, action, busy } = useOutletContext();
  if (!["coach", "medical"].includes(user.role))
    return (
      <Empty
        title="Coach & medical workspace"
        text="Sign in using a coach or medical account to view explicitly shared athlete records."
      />
    );
  return (
    <>
      <PageTitle
        kicker="NOTICE EARLY / SUPPORT BETTER"
        title="The people behind the progress"
        subtitle="Only athletes who explicitly share with your account appear here."
      />
      <div className="notice">
        Connection ID: <b>{user.email}</b>. Athletes link this email in Profile
        & privacy. Roles are self-registered for this project; verification is
        an attestation by the linked account.
      </div>
      {data.coach?.length ? (
        data.coach.map((a) => (
          <section className="panel panel-pad" key={a.profile.id}>
            <div className="panel-title">
              <h2>{a.profile.name}</h2>
              <span className="pill">
                {a.profile.sport} · {a.profile.event}
              </span>
            </div>
            <p>
              {a.sessions.length} shared sessions ·{" "}
              {a.achievements.filter((r) => !r.verified).length} achievements
              awaiting review · {a.injuries.length} shared recovery records
            </p>
            {a.profile.sharePerformance && user.role === "coach" && (
              <>
                <CoachSignals athlete={a} />
                <Chart
                  sessions={a.sessions.filter(
                    (r) =>
                      r.event === a.profile.event && r.unit === a.profile.unit,
                  )}
                />
                {[
                  ...a.sessions.filter((r) => r.metric > 0),
                  ...a.achievements,
                ].map((r) => (
                  <div className="activity-row" key={r.id}>
                    {r.kind === "sessions" ? (
                      <Activity size={19} />
                    ) : (
                      <Trophy size={22} />
                    )}
                    <div>
                      <strong>{r.title}</strong>
                      <small>
                        {r.result || `${r.metric} ${r.unit}`} ·{" "}
                        {dateLabel(r.date)}
                      </small>
                      {r.attachmentId && (
                        <a
                          href={"/api/files/" + r.attachmentId + "/content"}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Review certificate ↗
                        </a>
                      )}
                    </div>
                    <button
                      className="button ghost small"
                      disabled={busy || r.verified}
                      onClick={() =>
                        action(
                          () =>
                            api("/verify/" + r.kind + "/" + r.id, {
                              method: "POST",
                            }),
                          "Record verified.",
                        )
                      }
                    >
                      {r.verified
                        ? "Verified"
                        : r.kind === "sessions"
                          ? "Verify result"
                          : "Verify achievement"}
                    </button>
                  </div>
                ))}
                {a.plans.map((p, i) => (
                  <p key={i}>
                    {p.title}: {p.completed}/{p.total} days completed
                  </p>
                ))}
              </>
            )}
            {a.profile.shareHealth ? (
              <>
                <h3>Shared wellbeing</h3>
                {a.wellbeing.slice(-3).map((r, i) => (
                  <p key={i}>
                    {dateLabel(r.date)} · Pain {r.pain}/10 · Fatigue {r.fatigue}
                    /10
                  </p>
                ))}
                {a.injuries.map((r) => (
                  <p key={r.id}>
                    {r.title} · {r.stage} · {r.notes}
                  </p>
                ))}
              </>
            ) : (
              <p>Health information is private.</p>
            )}
          </section>
        ))
      ) : (
        <section className="panel">
          <Empty
            title="A team starts with trust"
            text="Ask an athlete to connect your email and grant access in their privacy settings."
          />
        </section>
      )}
    </>
  );
}

function CoachSignals({ athlete: a }) {
  const rows = a.sessions
    .filter(
      (r) =>
        r.event === a.profile.event &&
        r.unit === a.profile.unit &&
        r.metric > 0,
    )
    .sort((x, y) => x.date.localeCompare(y.date));
  const change =
    rows.length > 1
      ? ((rows.at(-1).metric - rows[0].metric) / rows[0].metric) *
        (a.profile.unit === "sec" ? -100 : 100)
      : null;
  const recent = a.sessions.filter(
    (r) => Date.parse(r.date) >= Date.now() - 14 * 86400000,
  ).length;
  const total = a.plans.reduce((n, p) => n + p.total, 0),
    done = a.plans.reduce((n, p) => n + p.completed, 0);
  return (
    <div className="notice">
      <b>Coach signals · </b>
      {change === null
        ? "More measured results needed."
        : change < -3
          ? `Performance down ${Math.abs(change).toFixed(1)}% since baseline; review context with the athlete.`
          : change > 3
            ? `Improvement of ${change.toFixed(1)}% since baseline.`
            : "Performance is within 3% of baseline."}{" "}
      {recent} sessions in the last 14 days.{" "}
      {total ? `Plan adherence: ${Math.round((done / total) * 100)}%.` : ""}{" "}
      {a.profile.competitionDate
        ? `Next competition: ${dateLabel(a.profile.competitionDate)}.`
        : ""}
    </div>
  );
}
