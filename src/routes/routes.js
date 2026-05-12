/**
 * routes.js
 *
 * Registers all API routes for DocuMind AI.
 *
 * Routes:
 *   GET  /api/health          — health check + system status
 *   POST /api/upload          — upload & process a PDF
 *   POST /api/query           — ask a question about uploaded docs
 *   GET  /api/documents       — list all indexed documents
 *   DELETE /api/documents/:id — remove a document from the vector store
 */

import express from "express";
import multer from "multer";
import path from "path";
import { uploadPDF } from "../controllers/uploadController.js";
import { queryDocument } from "../controllers/queryController.js";
import { getAllDocuments, deleteDocument } from "../services/vectorService.js";

const router = express.Router();

/* ------------------------------------------------------------------ *
 *  Multer configuration                                                *
 * ------------------------------------------------------------------ */

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads/"),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e5)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are accepted."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

/* ------------------------------------------------------------------ *
 *  Routes                                                              *
 * ------------------------------------------------------------------ */

// Health check
router.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "DocuMind AI",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    mode: {
      llm: process.env.USE_OPENAI === "true" ? "openai" : "mock",
      cache: process.env.USE_REDIS === "true" ? "redis" : "none",
    },
  });
});

// Upload PDF
router.post("/upload", upload.single("file"), uploadPDF);

// Query documents
router.post("/query", queryDocument);

// List all indexed documents
router.get("/documents", async (_req, res) => {
  try {
    const docs = await getAllDocuments();
    res.json({ success: true, count: docs.length, documents: docs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete a specific document by ID
router.delete("/documents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteDocument(id);
    res.json({
      success: true,
      message: `Deleted ${deleted} chunks for document ${id}`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Multer error handler (file type / size errors)
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError || err.message) {
    return res.status(400).json({ success: false, message: err.message });
  }
  _next(err);
});

export default router;
