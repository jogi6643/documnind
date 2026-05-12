/**
 * app.js — DocuMind AI Entry Point
 *
 * Boots Express, connects to MongoDB, and starts the HTTP server.
 */

import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import connectDB from "./config/db.js";
import apiRoutes from "./routes/routes.js";

/* ------------------------------------------------------------------ *
 *  Bootstrap                                                           *
 * ------------------------------------------------------------------ */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

/* ------------------------------------------------------------------ *
 *  Express App                                                         *
 * ------------------------------------------------------------------ */

const app = express();

// ── Middleware ──────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// CORS headers (open for dev — lock down in production)
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── API Routes ──────────────────────────────────────────────────────
app.use("/api", apiRoutes);

// ── Root Welcome ────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    name: "DocuMind AI",
    version: "1.0.0",
    description: "RAG-based document intelligence backend",
    author: "Jugendra Pal Singh",
    endpoints: {
      health:    "GET  /api/health",
      upload:    "POST /api/upload        (form-data: file)",
      query:     "POST /api/query         (JSON: { question })",
      documents: "GET  /api/documents",
      delete:    "DELETE /api/documents/:id",
    },
  });
});

// ── 404 Handler ─────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// ── Global Error Handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("💥 Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "An unexpected error occurred.",
    error: err.message,
  });
});

/* ------------------------------------------------------------------ *
 *  Start Server                                                        *
 * ------------------------------------------------------------------ */

const PORT = process.env.PORT || 6000;

const start = async () => {
  // Connect to MongoDB (non-blocking — falls back to memory on failure)
  await connectDB();

  app.listen(PORT, () => {
    console.log("");
    console.log("╔══════════════════════════════════════════╗");
    console.log("║         🧠  DocuMind AI  🧠              ║");
    console.log("╠══════════════════════════════════════════╣");
    console.log(`║  Server  : http://localhost:${PORT}          ║`);
    console.log(`║  Mode LLM: ${(process.env.USE_OPENAI === "true" ? "OpenAI GPT-4o-mini  " : "Mock (offline)      ")}          ║`);
    console.log(`║  Cache   : ${(process.env.USE_REDIS === "true" ? "Redis               " : "Disabled            ")}          ║`);
    console.log("╚══════════════════════════════════════════╝");
    console.log("");
  });
};

start();
