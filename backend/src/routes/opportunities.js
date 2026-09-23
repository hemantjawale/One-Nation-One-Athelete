import { Router } from "express";
import { z } from "zod";
import { opportunitySchema } from "../services/schemas.js";
import { match, insights } from "../services/intelligence.js";
import { allRecords } from "./records.js";
export function opportunityRoutes(db) {
  const r = Router(),
    publisher = (req) => ["coach", "organiser"].includes(req.user.role);
  async function profile(id) {
    const p = (await db.get("profiles", id)) || {};
    return { ...p, bestMetric: insights(p, await allRecords(db, id)).best };
  }
  r.get("/opportunities", async (req, res) => {
    const p = await profile(req.user.id);
    res.json(
      (await db.list("opportunities"))
        .map((o) => match(p, o))
        .sort((a, b) => b.match - a.match),
    );
  });
  r.post("/opportunities", async (req, res) => {
    if (!publisher(req)) return res.sendStatus(403);
    res
      .status(201)
      .json(
        await db.put("opportunities", {
          ...opportunitySchema.parse(req.body),
          ownerId: req.user.id,
          sample: false,
        }),
      );
  });
  r.put("/opportunities/:id", async (req, res) => {
    const o = await db.get("opportunities", req.params.id);
    if (!publisher(req) || !o || o.ownerId !== req.user.id)
      return res.sendStatus(403);
    res.json(
      await db.put("opportunities", {
        ...o,
        ...opportunitySchema.parse(req.body),
      }),
    );
  });
  r.delete("/opportunities/:id", async (req, res) => {
    const o = await db.get("opportunities", req.params.id);
    if (!o || o.ownerId !== req.user.id) return res.sendStatus(403);
    for (const a of await db.list("applications", { opportunityId: o.id }))
      await db.remove("applications", a.id);
    await db.remove("opportunities", o.id);
    res.json({ ok: true });
  });
  r.get("/applications", async (req, res) =>
    res.json(await db.list("applications", { ownerId: req.user.id })),
  );
  r.post("/applications", async (req, res) => {
    const { opportunityId } = z
        .object({ opportunityId: z.string() })
        .parse(req.body),
      o = await db.get("opportunities", opportunityId);
    if (!o) return res.sendStatus(404);
    const result = match(await profile(req.user.id), o);
    if (!result.eligible)
      return res.status(400).json({ error: result.blockers.join(", ") });
    const id = req.user.id + ":" + o.id,
      existing = await db.get("applications", id);
    res.json(
      existing ||
        (await db.put("applications", {
          id,
          ownerId: req.user.id,
          opportunityId: o.id,
          title: o.title,
          status: o.sample ? "Demo application" : "Interest registered",
          date: new Date().toISOString().slice(0, 10),
        })),
    );
  });
  r.delete("/applications/:id", async (req, res) => {
    const a = await db.get("applications", req.params.id);
    if (!a || a.ownerId !== req.user.id) return res.sendStatus(404);
    await db.remove("applications", a.id);
    res.json({ ok: true });
  });
  r.get("/applicants", async (req, res) => {
    if (!publisher(req)) return res.sendStatus(403);
    const out = [];
    for (const o of await db.list("opportunities", { ownerId: req.user.id })) {
      for (const a of await db.list("applications", { opportunityId: o.id })) {
        const p = await db.get("profiles", a.ownerId);
        out.push({
          id: a.id,
          title: o.title,
          status: a.status,
          date: a.date,
          athlete: p?.name || "Athlete",
          sport: p?.sport || "",
          state: p?.state || "",
        });
      }
    }
    res.json(out);
  });
  r.put("/applicants/:id", async (req, res) => {
    const a = await db.get("applications", req.params.id),
      o = a && (await db.get("opportunities", a.opportunityId));
    if (!publisher(req) || !o || o.ownerId !== req.user.id)
      return res.sendStatus(403);
    const body = z
      .object({
        status: z.enum([
          "Interest registered",
          "Under review",
          "Shortlisted",
          "Not selected",
        ]),
      })
      .parse(req.body);
    res.json(await db.put("applications", { ...a, ...body }));
  });
  return r;
}
