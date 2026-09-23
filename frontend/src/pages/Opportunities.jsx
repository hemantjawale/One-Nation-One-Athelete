import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Search, CheckCircle2, Target, ArrowUpRight } from "lucide-react";
import { PageTitle, Actions, Empty } from "../components/UI";
import { dateLabel } from "../lib/forms";
import { api } from "../lib/api";
export default function Opportunities() {
  const { data, user, add, action, busy, confirmDelete, reload } =
      useOutletContext(),
    [filter, setFilter] = useState("All"),
    [query, setQuery] = useState("");
  const rows = data.opportunities.filter(
    (o) =>
      (filter === "All" || o.type === filter) &&
      o.title.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        kicker="THE RIGHT DOOR / AT THE RIGHT TIME"
        title="Your next opening"
        subtitle="Possibilities matched to your sport, age, location, classification, and results."
        action={
          ["coach", "organiser"].includes(user.role) && (
            <button
              className="button orange"
              onClick={() => add("opportunities")}
            >
              <Plus size={17} />
              Publish opportunity
            </button>
          )
        }
      />
      {data.applicants && (
        <section className="panel panel-pad">
          <h2>Applications to your listings</h2>
          {data.applicants.length ? (
            data.applicants.map((a) => (
              <div className="activity-row" key={a.id}>
                <div>
                  <strong>
                    {a.athlete} · {a.title}
                  </strong>
                  <small>
                    {a.sport} · {a.state} · {dateLabel(a.date)}
                  </small>
                </div>
                <select
                  aria-label={"Application status for " + a.athlete}
                  value={a.status}
                  disabled={busy}
                  onChange={(e) =>
                    action(
                      () =>
                        api("/applicants/" + encodeURIComponent(a.id), {
                          method: "PUT",
                          body: { status: e.target.value },
                        }),
                      "Status updated.",
                    )
                  }
                >
                  {[
                    "Interest registered",
                    "Under review",
                    "Shortlisted",
                    "Not selected",
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>
            ))
          ) : (
            <p>No athletes have registered interest yet.</p>
          )}
        </section>
      )}
      <div className="filter-bar">
        <div className="filter-pills">
          {[
            "All",
            "Trial",
            "Scholarship",
            "Competition",
            "Academy",
            "Sponsorship",
            "Coach",
            "Government scheme",
          ].map((t) => (
            <button
              key={t}
              className={filter === t ? "active" : ""}
              onClick={() => setFilter(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="search-box">
          <Search size={16} />
          <input
            aria-label="Search opportunities"
            placeholder="Search opportunities"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="opportunities-grid">
        {rows.map((o) => {
          const applied = data.applications.find(
            (a) => a.opportunityId === o.id,
          );
          return (
            <article className="opportunity-card" key={o.id}>
              <div className="opportunity-meta">
                <span className="pill">{o.type}</span>
                <span>
                  {o.sample ? "ILLUSTRATIVE LISTING" : "COMMUNITY LISTING"}
                </span>
              </div>
              <div className="opportunity-symbol">
                {o.type === "Trial"
                  ? "↗"
                  : o.type === "Scholarship"
                    ? "✳"
                    : o.type === "Competition"
                      ? "◎"
                      : "↝"}
              </div>
              <h2>{o.title}</h2>
              <p>
                {o.location} · Ages {o.minAge}–{o.maxAge} · {o.sport}
              </p>
              <p className="opportunity-description">{o.description}</p>
              <div className="match-line">
                <span>
                  {o.eligible ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <Target size={15} />
                  )}{" "}
                  {o.eligible
                    ? `${o.match}% profile match`
                    : "Check eligibility"}
                </span>
                <small>By {dateLabel(o.deadline)}</small>
              </div>
              <div className="match-reasons">
                {[...o.reasons, ...o.blockers].map((t) => (
                  <small key={t}>{t}</small>
                ))}
              </div>
              <div className="opportunity-actions">
                {applied ? (
                  <>
                    <span className="pill">{applied.status}</span>
                    <button
                      className="button ghost"
                      disabled={busy}
                      onClick={() =>
                        action(
                          () =>
                            api(
                              "/applications/" + encodeURIComponent(applied.id),
                              { method: "DELETE" },
                            ),
                          "Application withdrawn.",
                        )
                      }
                    >
                      Withdraw {o.sample ? "demo " : ""}application
                    </button>
                  </>
                ) : (
                  <button
                    className="button dark"
                    disabled={busy || !o.eligible}
                    onClick={() =>
                      action(
                        () =>
                          api("/applications", {
                            method: "POST",
                            body: { opportunityId: o.id },
                          }),
                        o.sample
                          ? "Demo application saved."
                          : "Interest registered. Use the official link for external application requirements.",
                      )
                    }
                  >
                    {o.sample ? "Try demo application" : "Register interest"}
                    <ArrowUpRight size={17} />
                  </button>
                )}
                {o.url && (
                  <a
                    className="text-link"
                    href={o.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Official details ↗
                  </a>
                )}
                {o.ownerId === user.id && (
                  <Actions
                    edit={() => add("opportunities", o)}
                    remove={() =>
                      confirmDelete(async () => {
                        await api("/opportunities/" + o.id, {
                          method: "DELETE",
                        });
                        await reload();
                      })
                    }
                  />
                )}
              </div>
            </article>
          );
        })}
      </div>
      {!rows.length && (
        <Empty
          title="No matching openings"
          text="Try another category or search phrase."
        />
      )}
    </>
  );
}
