import { useOutletContext } from "react-router-dom";
import { Plus, Wallet, Fingerprint, Download } from "lucide-react";
import { PageTitle, Stat, Actions, PageLink, Empty } from "../components/UI";
import { dateLabel, money } from "../lib/forms";
import { exportData } from "../lib/api";
export default function Finance() {
  const { data, add, remove, go, notify } = useOutletContext();
  return (
    <>
      <PageTitle
        kicker="LESS FRICTION / MORE FORWARD"
        title="Fund your ambition"
        subtitle="Understand sporting costs and prepare a reusable sponsorship portfolio."
        action={
          <button className="button orange" onClick={() => add("expenses")}>
            <Plus size={17} />
            Add expense
          </button>
        }
      />
      <div className="stat-grid three">
        {["Planned", "Paid", "Funded"].map((status, i) => (
          <Stat
            key={status}
            label={status.toUpperCase()}
            value={money(
              data.expenses
                .filter((e) => e.status === status)
                .reduce((n, e) => n + e.amount, 0),
            )}
            detail={
              [
                "Upcoming sporting expenses",
                "Invested in your journey",
                "Covered through support",
              ][i]
            }
            icon={Wallet}
          />
        ))}
      </div>
      <section className="panel panel-pad">
        <div className="panel-title">
          <h2>Expense tracker</h2>
          <PageLink onClick={() => go("opportunities")}>
            Explore funding
          </PageLink>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Expense</th>
                <th>Date</th>
                <th>Category</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.expenses.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td>{dateLabel(r.date)}</td>
                  <td>{r.category}</td>
                  <td>
                    <strong>{money(r.amount)}</strong>
                  </td>
                  <td>
                    <span className="pill">{r.status}</span>
                  </td>
                  <td>
                    <Actions
                      edit={() => add("expenses", r)}
                      remove={() => remove("expenses", r)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.expenses.length && (
          <Empty text="Track equipment, travel, coaching, and competition costs." />
        )}
      </section>
      <div className="portfolio-callout">
        <Fingerprint size={40} />
        <div>
          <h2>One portfolio. More possibilities.</h2>
          <p>
            Your export includes achievements, training history, and expenses.
          </p>
        </div>
        <button
          className="button dark"
          onClick={() =>
            exportData("sponsorship-portfolio.json").catch((e) =>
              notify(e.message, "error"),
            )
          }
        >
          <Download size={17} />
          Export portfolio
        </button>
      </div>
    </>
  );
}
