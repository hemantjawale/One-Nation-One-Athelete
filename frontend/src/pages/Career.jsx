import { useOutletContext } from "react-router-dom";
import { PageTitle, PageLink } from "../components/UI";
export default function Career() {
  const { data, go, notify } = useOutletContext(),
    p = data.profile;
  const options = [
    [
      "Coach",
      "Turn experience into someone else’s breakthrough.",
      "Document your methods, assist a qualified coach, and explore sport-specific certification.",
    ],
    [
      "Referee / official",
      "Protect the spirit of the game.",
      "Study your sport’s current federation rules and enquire about local officiating courses.",
    ],
    [
      "Performance analyst",
      "Find the story inside the numbers.",
      "Build a portfolio using match annotation, spreadsheets, and basic statistics.",
    ],
    [
      "Sports management",
      "Make great sporting experiences possible.",
      "Volunteer at tournaments, learn event planning, and explore relevant education pathways.",
    ],
    [
      "Fitness professional",
      "Help more people discover their potential.",
      "Explore accredited qualifications and supervised practice within your scope.",
    ],
  ];
  if (/degree|college|graduate|bsc|btech/i.test(p.education))
    options.unshift(options.splice(2, 1)[0]);
  return (
    <>
      <PageTitle
        kicker="YOUR EXPERIENCE / A NEW DIRECTION"
        title="Beyond the finish line"
        subtitle="Explore pathways that keep your sporting knowledge in play."
      />
      <div className="notice">
        Exploratory pathways for {p.sport}. Education:{" "}
        {p.education || "not added yet"}. These are rules-based suggestions, not
        job offers or guaranteed career outcomes.
      </div>
      <div className="career-grid">
        {options.map(([title, sub, detail], i) => (
          <article className="career-card" key={title}>
            <span>0{i + 1} / NEXT CHAPTER</span>
            <h2>{title}</h2>
            <p>{sub}</p>
            <hr />
            <h4>YOUR FIRST STEP</h4>
            <p>{detail}</p>
            <PageLink
              onClick={() => {
                go("settings");
                notify("Add this pathway to your sporting / career goal.");
              }}
            >
              Set a career goal
            </PageLink>
          </article>
        ))}
      </div>
    </>
  );
}
