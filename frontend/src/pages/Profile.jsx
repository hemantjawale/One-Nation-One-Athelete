import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Check, Download, Trash2 } from "lucide-react";
import { PageTitle, Input } from "../components/UI";
import { field, units } from "../lib/forms";
import { api, exportData } from "../lib/api";
export default function Profile() {
  const c = useOutletContext();
  return <ProfileForm key={c.data.profile.updatedAt || c.user.id} {...c} />;
}
function ProfileForm({ data, action, busy, notify, deleteAccount }) {
  const [p, setP] = useState(data.profile);
  const fields = [
    field("name", "Full name"),
    field("birthDate", "Date of birth", "date"),
    field("sport", "Sport", "select", [
      "Athletics",
      "Badminton",
      "Basketball",
      "Football",
      "Cricket",
      "Swimming",
      "Shooting",
      "Archery",
      "Wrestling",
      "Weightlifting",
      "Para athletics",
    ]),
    field("event", "Event / position"),
    field(
      "unit",
      "Performance unit (seconds: lower is better)",
      "select",
      units,
    ),
    field("gender", "Gender category", "select", [
      "Female",
      "Male",
      "Non-binary",
      "Prefer not to say",
    ]),
    field("classification", "Classification (Open or official para class)"),
    field("state", "State / union territory"),
    field("district", "District", "text", null, true),
    field("target", "Personal performance target", "number"),
    field("competitionDate", "Next competition date", "date", null, true),
    field("equipment", "Available equipment"),
    field("education", "Education", "text", null, true),
    field("goal", "Sporting / career goal", "textarea", null, true),
  ];
  return (
    <>
      <PageTitle
        kicker="YOUR IDENTITY / YOUR CONTROL"
        title="Make it yours"
        subtitle="Build your profile and choose exactly what you share."
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          action(
            () => api("/profile", { method: "PUT", body: p }),
            "Profile and privacy choices saved.",
          );
        }}
      >
        <section className="panel panel-pad">
          <h2>Athlete details</h2>
          <div className="form-grid">
            {fields.map((f) => (
              <Input
                key={f.key}
                f={f}
                value={p[f.key]}
                onChange={(v) => setP({ ...p, [f.key]: v })}
              />
            ))}
          </div>
        </section>
        <section className="panel panel-pad">
          <h2>Privacy & consent</h2>
          <p>
            Choose a registered professional. Sharing is off by default. Medical
            accounts see only health information; coaches receive the categories
            you approve.
          </p>
          <Input
            f={field(
              "coachId",
              "Registered coach / medical email",
              "email",
              null,
              true,
            )}
            value={p.coachId}
            onChange={(v) => setP({ ...p, coachId: v })}
          />
          {[
            [
              "sharePerformance",
              "Share performance and achievements with my linked coach",
            ],
            [
              "shareHealth",
              "Share injury records, pain and fatigue with my linked professional",
            ],
            [
              "allowAnalytics",
              "Contribute verified results and profile categories to anonymous cohort and fairness statistics (groups of at least five)",
            ],
          ].map(([key, label]) => (
            <Input
              key={key}
              f={field(key, label, "checkbox")}
              value={p[key]}
              onChange={(v) => setP({ ...p, [key]: v })}
            />
          ))}
          <button className="button orange" disabled={busy}>
            {busy ? "Saving…" : "Save profile & consent"}
            <Check size={17} />
          </button>
        </section>
      </form>
      <section className="panel panel-pad">
        <h2>Your data belongs to you</h2>
        <p>
          Export your records, or permanently remove this account and its files.
          Offline records are stored on this device; use your own browser
          profile for private health data.
        </p>
        <div className="inline-actions">
          <button
            className="button ghost"
            onClick={() =>
              exportData("my-athlete-data.json").catch((e) =>
                notify(e.message, "error"),
              )
            }
          >
            <Download size={17} />
            Export all data
          </button>
          <button className="button danger" onClick={deleteAccount}>
            <Trash2 size={17} />
            Delete account
          </button>
        </div>
      </section>
    </>
  );
}
