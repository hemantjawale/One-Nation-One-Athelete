import { Router } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { text, num } from "../services/schemas.js";

/**
 * Centralized File & Video Authorization Helper
 * Validates user permissions against athlete profile, consent settings, and requested file action.
 */
export function canAccessAthleteFile(user, athleteProfile, file, action, options = {}) {
  if (!user) {
    return { allowed: false, status: 401, reason: "Authentication required" };
  }
  if (!file) {
    return { allowed: false, status: 404, reason: "File not found" };
  }

  const isOwner = file.ownerId === user.id;
  const isAdmin = user.role === "admin";
  const isAssignedCoach =
    user.role === "coach" &&
    Boolean(
      athleteProfile &&
        athleteProfile.coachId &&
        (athleteProfile.coachId === user.id ||
          athleteProfile.coachId.toLowerCase() === user.email?.toLowerCase()),
    );

  const isAssignedMedical =
    user.role === "medical" &&
    Boolean(
      athleteProfile &&
        athleteProfile.coachId &&
        (athleteProfile.coachId === user.id ||
          athleteProfile.coachId.toLowerCase() === user.email?.toLowerCase()),
    );

  if (action === "read") {
    if (isOwner || isAdmin) return { allowed: true };

    if (isAssignedCoach) {
      const isReviewRequested = Boolean(file.requestCoachReview);
      const isPerformanceConsented = Boolean(athleteProfile?.sharePerformance);
      const isLinked = Boolean(options.linked);

      if (isPerformanceConsented || isReviewRequested || isLinked) {
        return { allowed: true };
      }
      return {
        allowed: false,
        status: 403,
        reason: "Access denied. Athlete has not granted performance sharing consent.",
      };
    }

    if (isAssignedMedical) {
      if (athleteProfile?.shareHealth) {
        return { allowed: true };
      }
      return {
        allowed: false,
        status: 403,
        reason: "Access denied. Athlete has not granted health sharing consent.",
      };
    }

    return {
      allowed: false,
      status: 403,
      reason: "Access denied. You are not authorized to access this file.",
    };
  }

  if (action === "update" || action === "annotate") {
    if (isOwner) {
      return { allowed: true, role: "owner" };
    }
    if (isAdmin) {
      return { allowed: true, role: "admin" };
    }
    if (isAssignedCoach) {
      return { allowed: true, role: "coach" };
    }
    return {
      allowed: false,
      status: 403,
      reason: "Access denied. Only file owner or assigned coach can update this file.",
    };
  }

  if (action === "delete") {
    if (isOwner || isAdmin) {
      return { allowed: true };
    }
    return {
      allowed: false,
      status: 403,
      reason: "Access denied. Only the file owner can delete this file.",
    };
  }

  return { allowed: false, status: 403, reason: "Access denied." };
}

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
      await unlink(f.path).catch(() => {});
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
          createdAt: new Date().toISOString(),
        }),
      );
  });

  r.get("/:id/content", async (req, res) => {
    const f = await db.get("files", req.params.id);
    if (!f) return res.sendStatus(404);

    const p = await db.get("profiles", f.ownerId);

    const linked = (await db.list("achievements", { ownerId: f.ownerId })).some(
      (a) =>
        a.attachmentId === f.id ||
        a.certificate?.publicId === f.id ||
        (typeof a.certificate?.url === "string" &&
          a.certificate.url.includes(f.id)),
    );

    const access = canAccessAthleteFile(req.user, p, f, "read", { linked });
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.reason });
    }

    if (f.content && f.content.startsWith("data:")) {
      const matches = f.content.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        return res
          .type(mimeType)
          .set("Content-Disposition", `inline; filename="${f.name || f.id}"`)
          .send(buffer);
      }
    }
    res
      .type(f.mime)
      .set("Content-Disposition", `inline; filename="${f.id}"`)
      .sendFile(path.join(directory, f.id), { dotfiles: "allow" });
  });

  r.put("/:id", async (req, res) => {
    const f = await db.get("files", req.params.id);
    if (!f) return res.sendStatus(404);

    const p = await db.get("profiles", f.ownerId);
    const access = canAccessAthleteFile(req.user, p, f, "update");
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.reason });
    }

    const isOwner = f.ownerId === req.user.id;
    const isCoach = req.user.role === "coach";

    if (isOwner || req.user.role === "admin") {
      // Owner update: can update athlete metadata & MediaPipe analysis
      const updateSchema = z.object({
        name: text.optional(),
        notes: z.string().max(2000).optional(),
        trainingWeek: z.string().max(50).optional(),
        trainingDay: z.string().max(50).optional(),
        sessionTitle: z.string().max(200).optional(),
        event: z.string().max(100).optional(),
        phase: z.string().max(100).optional(),
        requestCoachReview: z.boolean().optional(),
        analysis: z.record(z.any()).nullable().optional(),
      });

      const body = updateSchema.parse(req.body);
      const cleanBody = Object.fromEntries(
        Object.entries(body).filter(([, v]) => v !== undefined),
      );
      const updated = await db.put("files", {
        ...f,
        ...cleanBody,
        coachAnnotation: f.coachAnnotation, // Preserve coach annotation untouched
        updatedAt: new Date().toISOString(),
      });
      return res.json(updated);
    }

    if (isCoach) {
      // Coach update: CAN ONLY update coachAnnotation fields. CANNOT overwrite MediaPipe analysis or athlete metadata!
      const coachAnnotationSchema = z.object({
        observation: z.string().max(2000).default("").optional(),
        correction: z.string().max(2000).default("").optional(),
        drillRecommendation: z.string().max(2000).default("").optional(),
        coachFollowUpNote: z.string().max(2000).default("").optional(),
      });

      const rawAnnotation = req.body.coachAnnotation || req.body;
      const parsed = coachAnnotationSchema.parse(rawAnnotation);

      const existingAnnotation = f.coachAnnotation || {};
      const newAnnotation = {
        observation:
          parsed.observation !== undefined
            ? parsed.observation
            : existingAnnotation.observation || "",
        correction:
          parsed.correction !== undefined
            ? parsed.correction
            : existingAnnotation.correction || "",
        drillRecommendation:
          parsed.drillRecommendation !== undefined
            ? parsed.drillRecommendation
            : existingAnnotation.drillRecommendation || "",
        coachFollowUpNote:
          parsed.coachFollowUpNote !== undefined
            ? parsed.coachFollowUpNote
            : existingAnnotation.coachFollowUpNote || "",
        annotatedBy: req.user.name || req.user.email || "Coach",
        annotatedAt: new Date().toISOString(),
      };

      const updated = await db.put("files", {
        ...f,
        requestCoachReview: false,
        coachAnnotation: newAnnotation,
        coachReviewedAt: new Date().toISOString(),
        coachReviewedBy: req.user.name || req.user.email,
        coachFollowUpNote: newAnnotation.coachFollowUpNote,
        // IMMUTABLE ATHLETE/SYSTEM CV ANALYSIS & METADATA
        analysis: f.analysis,
        name: f.name,
        notes: f.notes,
        ownerId: f.ownerId,
        updatedAt: new Date().toISOString(),
      });
      return res.json(updated);
    }

    return res.status(403).json({ error: "Access denied." });
  });

  r.delete("/:id", async (req, res) => {
    const f = await db.get("files", req.params.id);
    if (!f) return res.sendStatus(404);

    const p = await db.get("profiles", f.ownerId);
    const access = canAccessAthleteFile(req.user, p, f, "delete");
    if (!access.allowed) {
      return res.status(access.status || 403).json({ error: access.reason });
    }

    await unlink(path.join(directory, f.id)).catch(() => {});
    await db.remove("files", f.id);
    res.json({ ok: true });
  });

  return r;
}
