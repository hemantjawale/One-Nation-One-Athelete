import { Router } from "express";
import { createHash } from "node:crypto";
import { schemas } from "../services/schemas.js";
export const allRecords = async (db, id) =>
  (
    await Promise.all(
      Object.keys(schemas).map((k) => db.list(k, { ownerId: id })),
    )
  ).flat();
export const audit = (db, user, action, record) =>
  db.put("audit", {
    ownerId: user.id,
    action,
    record,
    at: new Date().toISOString(),
  });
export function recordRoutes(db) {
  const r = Router();
  r.use("/:kind", (req, res, next) =>
    schemas[req.params.kind]
      ? next()
      : res.status(404).json({ error: "Unknown record type" }),
  );
  async function validate(req) {
    const body = schemas[req.params.kind].parse(req.body);
    if (
      req.params.kind === "injuries" &&
      body.stage === "Return to play" &&
      !body.cleared
    ) {
      const e = new Error(
        "Record professional clearance before returning to play.",
      );
      e.status = 400;
      throw e;
    }
    if (body.attachmentId) {
      const f = await db.get("files", body.attachmentId);
      if (!f || f.ownerId !== req.user.id) {
        const e = new Error("Invalid certificate attachment");
        e.status = 400;
        throw e;
      }
    }
    return body;
  }
  r.get("/:kind", async (req, res) =>
    res.json(await db.list(req.params.kind, { ownerId: req.user.id })),
  );
  r.post("/:kind", async (req, res) => {
    const body = await validate(req),
      key = req.get("Idempotency-Key"),
      id = key
        ? createHash("sha256")
            .update(req.user.id + ":" + req.params.kind + ":" + key)
            .digest("hex")
        : undefined;
    if (id) {
      const old = await db.get(req.params.kind, id);
      if (old) return res.json(old);
    }
    const row = await db.put(req.params.kind, {
      ...body,
      id,
      ownerId: req.user.id,
      verified: false,
    });
    await audit(db, req.user, "Created " + req.params.kind, row.id);
    res.status(201).json(row);
  });
  r.put("/:kind/:id", async (req, res) => {
    const old = await db.get(req.params.kind, req.params.id);
    if (!old || old.ownerId !== req.user.id) return res.sendStatus(404);
    const body = await validate(req),
      row = await db.put(req.params.kind, {
        ...old,
        ...body,
        verified: false,
        verifiedBy: null,
      });
    await audit(db, req.user, "Updated " + req.params.kind, row.id);
    res.json(row);
  });
  r.delete("/:kind/:id", async (req, res) => {
    const old = await db.get(req.params.kind, req.params.id);
    if (!old || old.ownerId !== req.user.id) return res.sendStatus(404);
    await db.remove(req.params.kind, old.id);
    await audit(db, req.user, "Deleted " + req.params.kind, old.id);
    res.json({ ok: true });
  });
  return r;
}
