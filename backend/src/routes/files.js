import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { text, num } from "../services/schemas.js";
export function fileRoutes(db, directory) {
  const r = Router(),
    upload = multer({
      storage: multer.diskStorage({
        destination: directory,
        filename: (_req, _file, cb) => cb(null, randomUUID()),
      }),
      limits: { fileSize: 50 * 1024 * 1024, files: 1 },
    });
  r.get("/", async (req, res) =>
    res.json(await db.list("files", { ownerId: req.user.id })),
  );
  r.post("/", upload.single("file"), async (req, res) => {
    const f = req.file;
    if (!f) return res.status(400).json({ error: "Choose a file" });
    const b = await readFile(f.path);
    const mime = b
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? "image/png"
      : b[0] === 255 && b[1] === 216 && b[2] === 255
        ? "image/jpeg"
        : b.subarray(0, 5).toString() === "%PDF-"
          ? "application/pdf"
          : b.subarray(4, 8).toString() === "ftyp"
            ? "video/mp4"
            : b.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))
              ? "video/webm"
              : null;
    if (!mime) {
      await unlink(f.path);
      return res
        .status(400)
        .json({ error: "Use a valid MP4, WebM, PDF, JPG or PNG file." });
    }
    res
      .status(201)
      .json(
        await db.put("files", {
          id: f.filename,
          ownerId: req.user.id,
          name: f.originalname.slice(0, 200),
          size: f.size,
          mime,
          notes: "",
          analysis: null,
        }),
      );
  });
  r.get("/:id/content", async (req, res) => {
    const f = await db.get("files", req.params.id);
    if (!f) return res.sendStatus(404);
    if (f.ownerId !== req.user.id) {
      const p = await db.get("profiles", f.ownerId),
        linked = (await db.list("achievements", { ownerId: f.ownerId })).some(
          (a) => a.attachmentId === f.id,
        );
      if (
        !p ||
        p.coachId !== req.user.id ||
        !p.sharePerformance ||
        req.user.role !== "coach" ||
        !linked
      )
        return res.sendStatus(403);
    }
    res
      .type(f.mime)
      .set("Content-Disposition", `inline; filename="${f.id}"`)
      .sendFile(path.join(directory, f.id), { dotfiles: "allow" });
  });
  r.put("/:id", async (req, res) => {
    const f = await db.get("files", req.params.id);
    if (!f || f.ownerId !== req.user.id) return res.sendStatus(404);
    const body = z
      .object({
        name: text,
        notes: z.string().max(2000).default(""),
        analysis: z
          .object({
            samples: num(3, 10000),
            kneeAngle: num(0, 180),
            consistency: num(0, 100),
            duration: num(0, 10000),
            source: z.literal("MediaPipe Pose · client measured"),
          })
          .nullable()
          .default(null),
      })
      .parse(req.body);
    res.json(await db.put("files", { ...f, ...body }));
  });
  r.delete("/:id", async (req, res) => {
    const f = await db.get("files", req.params.id);
    if (!f || f.ownerId !== req.user.id) return res.sendStatus(404);
    await unlink(path.join(directory, f.id)).catch(() => {});
    await db.remove("files", f.id);
    res.json({ ok: true });
  });
  return r;
}
