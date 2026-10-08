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
export const sportProfileSchema = z
  .object({
    sport: text,
    discipline: z.string().max(100).optional(),
    event: z.string().max(100).optional(),
    positionGroup: z.string().max(100).optional(),
    position: z.string().max(100).optional(),
    format: z.string().max(100).optional(),
    role: z.string().max(100).optional(),
    specialization: z.string().max(100).optional(),
    battingStyle: z.string().max(100).optional(),
    bowlingStyle: z.string().max(100).optional(),
    stroke: z.string().max(100).optional(),
    distance: z.string().max(100).optional(),
    style: z.string().max(100).optional(),
    weightCategory: z.string().max(100).optional(),
    classification: z.string().max(100).optional(),
    classificationStatus: z
      .enum(["Self-reported", "Pending Classification", "Officially Classified"])
      .default("Self-reported")
      .optional(),
    measurement: z
      .object({
        type: z.string().max(50),
        unit: z.string().max(20),
        unitLabel: z.string().max(50).optional(),
        direction: z.enum(["lower_is_better", "higher_is_better"]),
        optional: z.boolean().optional(),
      })
      .optional(),
  })
  .optional();

export const profileSchema = z.object({
  name: text,
  sport: text,
  sportLocked: z.boolean().default(false),
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
  sportProfile: sportProfileSchema,
});
export const certificateSchema = z
  .object({
    url: z.string(),
    publicId: z.string(),
    resourceType: z.string().optional().default("image"),
    format: z.string().optional(),
    originalName: z.string().optional(),
  })
  .nullable()
  .optional();

export const verificationStatuses = [
  "Self Uploaded",
  "Pending Verification",
  "Coach Verified",
  "Organization Verified",
  "Officially Verified",
];

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
    certificate: certificateSchema,
    verificationStatus: z.enum(verificationStatuses).default("Self Uploaded"),
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
  recovery_logs: z.object({
    date,
    sleepDuration: num(0, 24),
    sleepQuality: z.enum(["Poor", "Fair", "Good", "Excellent"]).default("Good"),
    fatigue: num(1, 10),
    stress: num(1, 10),
    mood: num(1, 10),
    soreness: num(1, 10),
    generalRecovery: num(1, 10),
    painFlag: z.boolean().default(false),
    painLevel: num(0, 10).default(0),
    painArea: z.string().max(100).default(""),
    previousSessionRPE: num(1, 10).optional(),
    previousSessionDifficulty: z.string().max(100).default(""),
    hydration: z.enum(["Poor", "Moderate", "Good"]).default("Good").optional(),
    travel: z.boolean().default(false).optional(),
    unusualStress: z.boolean().default(false).optional(),
    notes: z.string().max(2000).default(""),
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
