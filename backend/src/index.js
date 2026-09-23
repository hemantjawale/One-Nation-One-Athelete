import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import multer from "multer";
import { createStore } from "./services/store.js";
import { seedOpportunities } from "./services/seed.js";
import { authenticate } from "./middleware/auth.js";
import { authRoutes } from "./routes/auth.js";
import { recordRoutes } from "./routes/records.js";
import { athleteRoutes } from "./routes/athletes.js";
import { opportunityRoutes } from "./routes/opportunities.js";
import { fileRoutes } from "./routes/files.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  directory = path.resolve(process.env.DATA_DIR || path.join(root, ".data")),
  uploads = path.join(directory, "uploads");
await mkdir(uploads, { recursive: true });
let secret = process.env.JWT_SECRET;
if (!secret && process.env.NODE_ENV === "production")
  throw Error("Set JWT_SECRET for production.");
if (!secret) {
  try {
    secret = await readFile(path.join(directory, ".secret"), "utf8");
  } catch {
    secret = randomBytes(48).toString("hex");
    await writeFile(path.join(directory, ".secret"), secret);
  }
}
const db = await createStore(directory, process.env.MONGODB_URI);
await seedOpportunities(db);
const app = express();
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  }),
);
app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api", rateLimit({ windowMs: 60000, limit: 500 }));
app.get("/api/health", (_req, res) => res.json({ ok: true, storage: db.mode }));
app.use("/api/auth", authRoutes(db, secret));
app.use("/api", authenticate(db, secret));
app.use("/api/records", recordRoutes(db));
app.use("/api/files", fileRoutes(db, uploads));
app.use("/api", athleteRoutes(db, uploads));
app.use("/api", opportunityRoutes(db));
app.use("/api", (_req, res) =>
  res.status(404).json({ error: "Endpoint not found" }),
);
const frontend = path.resolve(root, "../frontend/dist");
if (existsSync(frontend)) {
  app.use(express.static(frontend));
  app.get("/{*path}", (_req, res) =>
    res.sendFile(path.join(frontend, "index.html")),
  );
}
app.use((err, _req, res, _next) => {
  if (err instanceof z.ZodError)
    return res
      .status(400)
      .json({
        error: err.issues
          .map((i) => i.path.join(".") + ": " + i.message)
          .join("; "),
      });
  if (err instanceof multer.MulterError)
    return res.status(400).json({ error: "Maximum file size is 50 MB." });
  if (err.code === 11000)
    return res
      .status(409)
      .json({ error: "An account with this email already exists." });
  console.error(err.message);
  res
    .status(err.status || 500)
    .json({
      error: err.status
        ? err.message
        : "Unable to complete this request. Please try again.",
    });
});
app.listen(process.env.PORT || 4000, () =>
  console.log(`API http://localhost:${process.env.PORT || 4000} · ${db.mode}`),
);
