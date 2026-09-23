import { z } from "zod";
export const text = z.string().trim().min(1).max(300),
  num = (min, max) => z.coerce.number().min(min).max(max);
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v,
    "Invalid calendar date",
  );
export const units = ["sec", "m", "cm", "points", "kg"];
export const stages = [
  "Rest",
  "Mobility",
  "Strength",
  "Sport-specific training",
  "Fitness assessment",
  "Return to play",
];
export const profileSchema = z.object({
  name: text,
  sport: text,
  event: text,
  unit: z.enum(units).default("sec"),
  state: text,
  district: z.string().max(100).default(""),
  birthDate: date.refine((v) => new Date(v) <= new Date(), "Future birth date"),
  gender: z.enum(["Female", "Male", "Non-binary", "Prefer not to say"]),
  classification: text,
  equipment: text,
  target: num(0, 100000),
  goal: z.string().max(2000).default(""),
  education: z.string().max(300).default(""),
  competitionDate: z.union([date, z.literal("")]).default(""),
  coachId: z.string().max(150).default(""),
  sharePerformance: z.boolean().default(false),
  shareHealth: z.boolean().default(false),
  allowAnalytics: z.boolean().default(false),
});
export const schemas = {
  sessions: z.object({
    title: text,
    date,
    event: text,
    unit: z.enum(units),
    duration: num(1, 600),
    effort: num(1, 10),
    metric: num(0, 100000),
    pain: num(0, 10),
    fatigue: num(0, 10),
    notes: z.string().max(2000).default(""),
  }),
  achievements: z.object({
    title: text,
    date,
    level: z.enum(["School", "District", "State", "National", "International"]),
    result: text,
    notes: z.string().max(2000).default(""),
    attachmentId: z.string().optional(),
  }),
  injuries: z.object({
    title: text,
    date,
    stage: z.enum(stages),
    notes: z.string().max(2000).default(""),
    cleared: z.boolean().default(false),
  }),
  expenses: z.object({
    title: text,
    date,
    category: z.enum([
      "Equipment",
      "Travel",
      "Coaching",
      "Nutrition",
      "Medical",
      "Other",
    ]),
    amount: num(1, 10000000),
    status: z.enum(["Planned", "Paid", "Funded"]),
    notes: z.string().max(2000).default(""),
  }),
  plans: z.object({
    title: text,
    date,
    notes: z.string().max(2000).default(""),
    days: z
      .array(
        z.object({
          day: text,
          title: text,
          duration: num(0, 600),
          detail: z.string().max(2000),
          done: z.boolean().default(false),
        }),
      )
      .min(1)
      .max(7),
  }),
};
export const opportunitySchema = z
  .object({
    title: text,
    type: z.enum([
      "Trial",
      "Scholarship",
      "Competition",
      "Academy",
      "Sponsorship",
      "Coach",
      "Government scheme",
    ]),
    sport: text,
    event: z.string().max(100).default(""),
    unit: z.enum(units).default("sec"),
    minResult: num(0, 100000).default(0),
    maxResult: num(0, 100000).default(0),
    location: text,
    minAge: num(5, 100),
    maxAge: num(5, 100),
    deadline: date,
    classification: z.string().max(100).default(""),
    description: z.string().min(10).max(3000),
    url: z
      .union([
        z.literal(""),
        z
          .string()
          .url()
          .refine((v) => v.startsWith("https://"), "Use HTTPS"),
      ])
      .default(""),
  })
  .refine((v) => v.minAge <= v.maxAge, "Age range is invalid");
