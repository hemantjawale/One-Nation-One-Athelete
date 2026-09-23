import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import rateLimit from "express-rate-limit";
import { signIn, cookieOptions } from "../middleware/auth.js";
import { seedAthlete } from "../services/seed.js";
export function authRoutes(db, secret) {
  const r = Router();
  r.use(rateLimit({ windowMs: 15 * 60000, limit: 40 }));
  r.post("/register", async (req, res) => {
    const body = z
      .object({
        name: z.string().trim().min(1).max(100),
        email: z
          .string()
          .email()
          .transform((v) => v.toLowerCase()),
        password: z.string().min(8).max(100),
        role: z
          .enum(["athlete", "coach", "organiser", "medical"])
          .default("athlete"),
      })
      .parse(req.body);
    const u = await db.insert("users", {
      ...body,
      id: body.email,
      password: await bcrypt.hash(body.password, 12),
    });
    res.status(201).json({ user: signIn(res, u, secret) });
  });
  r.post("/login", async (req, res) => {
    const body = z
        .object({ email: z.string().email(), password: z.string().max(100) })
        .parse(req.body),
      u = await db.get("users", body.email.toLowerCase());
    if (!u || !u.password || !(await bcrypt.compare(body.password, u.password)))
      return res.status(401).json({ error: "Email or password is incorrect." });
    res.json({ user: signIn(res, u, secret) });
  });
  r.post("/demo", async (_req, res) => {
    const id = "demo-" + randomUUID(),
      u = await db.insert("users", {
        id,
        email: id + "@example.test",
        name: "Aarav Sharma",
        role: "athlete",
        demo: true,
      });
    await seedAthlete(db, id);
    res.json({ user: signIn(res, u, secret) });
  });
  r.post("/logout", (_req, res) =>
    res.clearCookie("onona", cookieOptions).json({ ok: true }),
  );
  return r;
}
