import { Router } from "express";
import multer from "multer";
import { createHash } from "node:crypto";
import { schemas } from "../services/schemas.js";
import {
  isCloudinaryConfigured,
  uploadCertificate,
  deleteCertificate,
} from "../services/cloudinary.js";

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

  const memUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  });

  // Certificate upload to Cloudinary
  r.post("/certificates/upload", memUpload.single("certificate"), async (req, res) => {
    try {
      const f = req.file;
      if (!f) {
        return res.status(400).json({ error: "Choose a certificate file to upload." });
      }

      if (!isCloudinaryConfigured()) {
        return res.status(400).json({
          error:
            "Cloudinary is not configured. Please add the required environment variables (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).",
        });
      }

      const b = f.buffer;
      const isPng = b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const isJpg = b[0] === 255 && b[1] === 216 && b[2] === 255;
      const isPdf = b.subarray(0, 5).toString() === "%PDF-";
      const isWebp =
        b.subarray(0, 4).toString() === "RIFF" &&
        b.subarray(8, 12).toString() === "WEBP";

      const mime = isPng
        ? "image/png"
        : isJpg
          ? "image/jpeg"
          : isPdf
            ? "application/pdf"
            : isWebp
              ? "image/webp"
              : null;

      if (!mime) {
        return res.status(400).json({
          error: "Invalid file format. Upload a valid JPG, JPEG, PNG, WEBP, or PDF certificate.",
        });
      }

      const result = await uploadCertificate({
        buffer: b,
        originalName: f.originalname,
        mime,
        athleteId: req.user.id,
      });

      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  });

  // Delete certificate from Cloudinary
  r.delete("/certificates", async (req, res) => {
    try {
      const publicId = req.query.publicId || req.body?.publicId;
      if (!publicId) return res.status(400).json({ error: "Public ID is required." });

      const result = await deleteCertificate(publicId, req.query.type || "image");
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  r.delete("/certificates/:publicId", async (req, res) => {
    try {
      const publicId = req.params.publicId;
      if (!publicId) return res.status(400).json({ error: "Public ID is required." });

      const result = await deleteCertificate(publicId, req.query.type || "image");
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Combined timeline endpoint with date filtering
  r.get("/timeline", async (req, res) => {
    const kinds = ["sessions", "achievements", "injuries"];
    let rows = (
      await Promise.all(kinds.map((k) => db.list(k, { ownerId: req.user.id })))
    ).flat();

    const { from, to, year, month, kind } = req.query;
    if (kind) rows = rows.filter((r) => r.kind === kind);
    if (from) rows = rows.filter((r) => (r.date || r.trainingDate) >= from);
    if (to) rows = rows.filter((r) => (r.date || r.trainingDate) <= to);
    if (year) rows = rows.filter((r) => {
      const d = r.date || r.trainingDate;
      return d && d.startsWith(`${year}-`);
    });
    if (month && year) {
      const padM = String(month).padStart(2, "0");
      rows = rows.filter((r) => {
        const d = r.date || r.trainingDate;
        return d && d.startsWith(`${year}-${padM}`);
      });
    }

    // Strictly order by training date (newest first)
    rows.sort((a, b) => {
      const da = a.date || a.trainingDate || "";
      const db = b.date || b.trainingDate || "";
      return db.localeCompare(da);
    });
    res.json(rows);
  });

  r.use("/:kind", (req, res, next) =>
    schemas[req.params.kind]
      ? next()
      : res.status(404).json({ error: "Unknown record type" }),
  );

  async function validate(req) {
    if (req.params.kind === "sessions") {
      if (req.body.trainingDate && !req.body.date) {
        req.body.date = req.body.trainingDate;
      }
      if (req.body.date && !req.body.trainingDate) {
        req.body.trainingDate = req.body.date;
      }
    }
    const body = schemas[req.params.kind].parse(req.body);
    if (req.params.kind === "sessions") {
      body.trainingDate = body.date;
    }
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

  r.get("/:kind", async (req, res) => {
    let list = await db.list(req.params.kind, { ownerId: req.user.id });
    const { from, to, year, month, event } = req.query;

    if (from || to || year || month || event) {
      list = list.filter((r) => {
        const d = r.date || r.trainingDate;
        if (!d) return true;
        const [rYear, rMonth] = d.split("-");
        if (year && rYear !== String(year)) return false;
        if (month && String(Number(rMonth)) !== String(Number(month))) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        if (event && r.event && r.event.toLowerCase() !== event.toLowerCase()) return false;
        return true;
      });
    }

    // Arrange records according to actual training date / date (newest trainingDate first)
    list.sort((a, b) => {
      const da = a.date || a.trainingDate || "";
      const db = b.date || b.trainingDate || "";
      return db.localeCompare(da);
    });

    res.json(list);
  });

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
      verificationStatus: req.params.kind === "achievements" ? "Self Uploaded" : undefined,
    });
    await audit(db, req.user, "Created " + req.params.kind, row.id);
    res.status(201).json(row);
  });

  r.put("/:kind/:id", async (req, res) => {
    const old = await db.get(req.params.kind, req.params.id);
    if (!old || old.ownerId !== req.user.id) return res.sendStatus(404);
    const body = await validate(req);

    // If achievement certificate changed, clean up replaced Cloudinary asset
    if (
      req.params.kind === "achievements" &&
      old.certificate?.publicId &&
      body.certificate?.publicId !== old.certificate.publicId
    ) {
      deleteCertificate(old.certificate.publicId, old.certificate.resourceType).catch(() => {});
    }

    const row = await db.put(req.params.kind, {
      ...old,
      ...body,
      verified: false,
      verifiedBy: null,
      verificationStatus: req.params.kind === "achievements" ? "Self Uploaded" : undefined,
    });
    await audit(db, req.user, "Updated " + req.params.kind, row.id);
    res.json(row);
  });

  r.delete("/:kind/:id", async (req, res) => {
    const old = await db.get(req.params.kind, req.params.id);
    if (!old || old.ownerId !== req.user.id) return res.sendStatus(404);

    // If achievement had a Cloudinary certificate, clean it up
    if (req.params.kind === "achievements" && old.certificate?.publicId) {
      deleteCertificate(old.certificate.publicId, old.certificate.resourceType).catch(() => {});
    }

    await db.remove(req.params.kind, old.id);
    await audit(db, req.user, "Deleted " + req.params.kind, old.id);
    res.json({ ok: true });
  });

  return r;
}
