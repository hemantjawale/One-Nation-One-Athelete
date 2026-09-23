import { useOutletContext } from "react-router-dom";
import { ShieldCheck, Fingerprint } from "lucide-react";
import { PageTitle, PageLink } from "../components/UI";
export default function Transparency() {
  const { data, go } = useOutletContext(),
    s = data.insights,
    f = data.fairness;
  return (
    <>
      <PageTitle
        kicker="EXPLAINABLE / ACCOUNTABLE / HUMAN"
        title="Nothing behind the score"
        subtitle="Understand each calculation, its limits, and who controls your data."
      />
      <div className="notice">
        Deterministic decision support. This progress index is not a selection
        score, clinical assessment, or prediction of elite talent. Missing
        inputs contribute zero.
      </div>
      <section className="panel panel-pad">
        <h2>The progress formula</h2>
        {s.dimensions.map((d) => (
          <div className="formula-row" key={d.name}>
            <b>{d.weight}%</b>
            <div>
              <h3>{d.name}</h3>
              <p>{d.explanation}</p>
            </div>
            <span>{Math.round(d.value)}/100</span>
          </div>
        ))}
      </section>
      <div className="dashboard-grid">
        <section className="panel panel-pad">
          <ShieldCheck size={28} />
          <h2>Fairness through evidence</h2>
          <p>
            The live audit compares opportunity eligibility across consenting
            groups. Demo profiles and sample listings are excluded. Groups below
            five are suppressed.
          </p>
          <p>
            Outcome gaps are observational: they do not prove model bias or
            fairness. Review data quality, eligibility rules, and unequal access
            with humans.
          </p>
        </section>
        <section className="panel panel-pad">
          <Fingerprint size={28} />
          <h2>Data you can control</h2>
          <p>
            Health and performance sharing are separate. Revoke either
            permission from your profile. Export your records or permanently
            delete your account.
          </p>
          <PageLink onClick={() => go("settings")}>Manage consent</PageLink>
        </section>
      </div>
      <section className="panel panel-pad">
        <h2>Live opportunity access audit</h2>
        <span className="pill">{f.status}</span>
        <p>
          Share eligible for at least one current community listing. Approximate
          95% Wilson confidence intervals; gaps measured within each dimension.
        </p>
        {f.groups.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Dimension</th>
                  <th>Group</th>
                  <th>Athletes</th>
                  <th>Eligibility</th>
                  <th>95% interval</th>
                  <th>Gap</th>
                </tr>
              </thead>
              <tbody>
                {f.groups.map((g) => (
                  <tr key={g.dimension + g.label}>
                    <td>{g.dimension}</td>
                    <td>{g.label}</td>
                    <td>{g.count}</td>
                    <td>{g.rate}%</td>
                    <td>{g.interval.join("–")}%</td>
                    <td>{g.gap} pp</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="panel panel-pad">
        <h2>Your activity log</h2>
        {data.audit
          .slice(-15)
          .reverse()
          .map((a) => (
            <div className="audit-row" key={a.id}>
              <span>{a.action}</span>
              <small>{new Date(a.at).toLocaleString("en-IN")}</small>
            </div>
          ))}
        {!data.audit.length && <p>No changes recorded yet.</p>}
      </section>
    </>
  );
}
