export const today = () => new Date().toISOString().slice(0, 10);
export const dateLabel = (d) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
export const field = (
  key,
  label,
  type = "text",
  options,
  optional = false,
) => ({ key, label, type, options, optional });
export const stages = [
  "Rest",
  "Mobility",
  "Strength",
  "Sport-specific training",
  "Fitness assessment",
  "Return to play",
];
export const units = ["sec", "m", "cm", "points", "kg"];
const notes = field("notes", "Notes", "textarea", null, true);
export const forms = {
  sessions: {
    title: "Training session",
    fields: [
      field("title", "Session title"),
      field("date", "Date", "date"),
      field("event", "Event"),
      field("unit", "Measurement unit", "select", units),
      field("duration", "Duration (minutes)", "number"),
      field("effort", "Effort · 1 to 10", "number"),
      field("metric", "Measured result (0 if unmeasured)", "number"),
      field("pain", "Pain · 0 to 10", "number"),
      field("fatigue", "Fatigue · 0 to 10", "number"),
      notes,
    ],
    defaults: {
      title: "",
      date: today(),
      event: "100m",
      unit: "sec",
      duration: 45,
      effort: 5,
      metric: 0,
      pain: 0,
      fatigue: 3,
      notes: "",
    },
  },
  achievements: {
    title: "Achievement",
    fields: [
      field("title", "Competition / achievement"),
      field("date", "Date", "date"),
      field("level", "Level", "select", [
        "School",
        "District",
        "State",
        "National",
        "International",
      ]),
      field("result", "Result"),
      notes,
    ],
    defaults: {
      title: "",
      date: today(),
      level: "District",
      result: "",
      notes: "",
    },
  },
  injuries: {
    title: "Recovery record",
    fields: [
      field("title", "Concern or injury"),
      field("date", "Start date", "date"),
      field("stage", "Current milestone", "select", stages),
      notes,
      field(
        "cleared",
        "A qualified professional has cleared return to play",
        "checkbox",
      ),
    ],
    defaults: {
      title: "",
      date: today(),
      stage: "Rest",
      notes: "",
      cleared: false,
    },
  },
  expenses: {
    title: "Expense",
    fields: [
      field("title", "Expense title"),
      field("date", "Date", "date"),
      field("category", "Category", "select", [
        "Equipment",
        "Travel",
        "Coaching",
        "Nutrition",
        "Medical",
        "Other",
      ]),
      field("amount", "Amount (₹)", "number"),
      field("status", "Status", "select", ["Planned", "Paid", "Funded"]),
      notes,
    ],
    defaults: {
      title: "",
      date: today(),
      category: "Equipment",
      amount: 0,
      status: "Planned",
      notes: "",
    },
  },
  plans: {
    title: "Weekly plan",
    fields: [
      field("title", "Plan title"),
      field("date", "Week starting", "date"),
      notes,
    ],
    defaults: { title: "", date: today(), notes: "", days: [] },
  },
  opportunities: {
    title: "Opportunity",
    fields: [
      field("title", "Title"),
      field("type", "Type", "select", [
        "Trial",
        "Scholarship",
        "Competition",
        "Academy",
        "Sponsorship",
        "Coach",
        "Government scheme",
      ]),
      field("sport", "Sport (or All sports)"),
      field("event", "Event / position", "text", null, true),
      field("unit", "Performance unit", "select", units),
      field("minResult", "Minimum result (0 for none)", "number"),
      field("maxResult", "Maximum result (0 for none)", "number"),
      field("location", "State or All India"),
      field("minAge", "Minimum age", "number"),
      field("maxAge", "Maximum age", "number"),
      field("deadline", "Deadline", "date"),
      field(
        "classification",
        "Classification (blank for all)",
        "text",
        null,
        true,
      ),
      field("url", "Official HTTPS link", "url", null, true),
      field("description", "Description", "textarea"),
    ],
    defaults: {
      title: "",
      type: "Trial",
      sport: "Athletics",
      event: "",
      unit: "sec",
      minResult: 0,
      maxResult: 0,
      location: "All India",
      minAge: 14,
      maxAge: 25,
      deadline: today(),
      classification: "",
      url: "",
      description: "",
    },
  },
};
