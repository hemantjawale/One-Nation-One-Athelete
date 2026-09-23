import { useOutletContext } from "react-router-dom";
import { Fingerprint, Trophy, Plus, Download } from "lucide-react";
import { Brand, PageTitle, Actions, Empty } from "../components/UI";
import { dateLabel } from "../lib/forms";
import { exportData } from "../lib/api";
export default function Passport() {
  const { data, user, add, remove, notify } = useOutletContext(),
    p = data.profile;
  return (
    <>
      <PageTitle
        kicker="ONE IDENTITY / EVERY MILESTONE"
        title="Your athlete passport"
        subtitle="A portable story of your performance, achievements, and growth."
        action={
          <button
            className="button dark"
            onClick={() =>
              exportData().catch((e) => notify(e.message, "error"))
            }
          >
            <Download size={17} />
            Export passport
          </button>
        }
      />
      <div className="passport-layout">
        <div className="digital-passport">
          <div className="passport-top">
            <Brand light />
            <Fingerprint size={45} strokeWidth={1} />
          </div>
          <span className="eyebrow">UNIVERSAL ATHLETE IDENTITY</span>
          <h2>{p.name}</h2>
          <div className="passport-details">
            <div>
              <small>DISCIPLINE</small>
              <strong>
                {p.sport} · {p.event}
              </strong>
            </div>
            <div>
              <small>HOME GROUND</small>
              <strong>
                {p.district || "—"}, {p.state || "—"}
              </strong>
            </div>
            <div>
              <small>CATEGORY</small>
              <strong>{p.classification}</strong>
            </div>
            <div>
              <small>VERIFIED ACHIEVEMENTS</small>
              <strong>
                {data.achievements.filter((a) => a.verified).length} /{" "}
                {data.achievements.length}
              </strong>
            </div>
          </div>
          <div className="passport-id">
            <div className="barcode" />
            <small>IND / {user.id.slice(0, 18).toUpperCase()}</small>
          </div>
        </div>
        <section className="panel panel-pad">
          <div className="panel-title">
            <h2>Achievements</h2>
            <button
              className="button ghost small"
              onClick={() => add("achievements")}
            >
              <Plus size={16} />
              Add
            </button>
          </div>
          {data.achievements.map((a) => (
            <div className="achievement" key={a.id}>
              <Trophy size={23} />
              <div>
                <strong>{a.title}</strong>
                <p>{a.result}</p>
                <small>
                  {a.level} · {dateLabel(a.date)}
                </small>
                <span className="pill">
                  {a.verified
                    ? "Verified by " + a.verifiedBy
                    : "Awaiting coach verification"}
                </span>
                {a.attachmentId && (
                  <a
                    href={"/api/files/" + a.attachmentId + "/content"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View certificate ↗
                  </a>
                )}
              </div>
              <Actions
                edit={() => add("achievements", a)}
                remove={() => remove("achievements", a)}
              />
            </div>
          ))}
          {!data.achievements.length && (
            <Empty text="Add a result, then ask your linked coach to verify it." />
          )}
        </section>
      </div>
      <section className="panel panel-pad">
        <h2>Your journey, in context</h2>
        <div className="timeline">
          {[...data.sessions, ...data.achievements, ...data.injuries]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((r) => (
              <article key={r.id}>
                <i />
                <time>{dateLabel(r.date)}</time>
                <div>
                  <span className="eyebrow">{r.kind}</span>
                  <h3>{r.title}</h3>
                  <p>
                    {r.result ||
                      r.stage ||
                      (r.metric
                        ? `${r.event} · ${r.metric} ${r.unit}`
                        : `${r.duration} minutes of work`)}
                  </p>
                </div>
              </article>
            ))}
        </div>
      </section>
    </>
  );
}
