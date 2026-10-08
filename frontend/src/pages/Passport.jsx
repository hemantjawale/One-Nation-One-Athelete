import { useOutletContext } from "react-router-dom";
import { Fingerprint, Trophy, Plus } from "lucide-react";
import { Brand, PageTitle, Actions, Empty } from "../components/UI";
import { dateLabel } from "../lib/forms";
import { ExportMenu } from "../components/ExportMenu";
import { JourneySection } from "../components/JourneyFilters";

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
          <ExportMenu
            user={user}
            data={data}
            notify={notify}
            pageContext="passport"
            buttonLabel="Export"
          />
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
              <small>SPORT & EVENT</small>
              <strong>
                {p.sportProfile?.discipline
                  ? `${p.sport} · ${p.sportProfile.discipline} · ${p.event}`
                  : p.sportProfile?.positionGroup
                    ? `${p.sport} · ${p.sportProfile.positionGroup} · ${p.event}`
                    : `${p.sport} · ${p.event}`}
              </strong>
            </div>
            <div>
              <small>HOME GROUND</small>
              <strong>
                {p.district || "—"}, {p.state || "—"}
              </strong>
            </div>
            <div>
              <small>CATEGORY / CLASSIFICATION</small>
              <strong>
                {p.sportProfile?.classification || p.classification || "Open"}
                {p.sportProfile?.classificationStatus
                  ? ` (${p.sportProfile.classificationStatus})`
                  : ""}
              </strong>
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
                    ? "Verified by " + (a.verifiedBy || "Coach")
                    : a.verificationStatus || "Awaiting coach verification"}
                </span>
                {a.certificate?.url ? (
                  <a
                    href={a.certificate.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View certificate proof ↗
                  </a>
                ) : a.attachmentId ? (
                  <a
                    href={"/api/files/" + a.attachmentId + "/content"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View certificate ↗
                  </a>
                ) : null}
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

      <JourneySection data={data} user={user} notify={notify} />
    </>
  );
}
