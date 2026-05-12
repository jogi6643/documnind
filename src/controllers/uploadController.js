/**
 * uploadController.js
 *
 * Handles PDF upload requests:
 *   POST /api/upload
 *
 * Pipeline:
 *   Multer (file saved to disk)
 *     → pdf-parse  (extract raw text)
 *     → chunkText  (split into semantic paragraphs)
 *     → createEmbeddings (generate vectors)
 *     → storeVectors (persist to MongoDB / memory)
 */

import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import pdfParse from "pdf-parse";

import { chunkText } from "../utils/chunkText.js";
import { createEmbeddings } from "../services/embeddingService.js";
import { storeVectors } from "../services/vectorService.js";

/**
 * uploadPDF — controller for POST /api/upload
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export const uploadPDF = async (req, res) => {
  try {
    // ── 1. Validate uploaded file ──────────────────────────────────
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please attach a PDF as form-data with key 'file'.",
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname;
    console.log(`📂 Received file: ${fileName}`);

    // ── 2. Extract text from PDF ───────────────────────────────────
    const fileBuffer = fs.readFileSync(filePath);
    const parsedPDF = await pdfParse(fileBuffer);
    const rawText = parsedPDF.text;

    if (!rawText || rawText.trim().length === 0) {
      fs.unlinkSync(filePath); // clean up
      return res.status(422).json({
        success: false,
        message: "Could not extract any text from the PDF. The file may be image-based or corrupted.",
      });
    }

    console.log(`📄 Extracted ${rawText.length} characters from ${fileName}`);

    // ── 3. Chunk the text ──────────────────────────────────────────
    const chunks = chunkText(rawText);

    if (chunks.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(422).json({
        success: false,
        message: "The document text was too short or poorly formatted to produce meaningful chunks.",
      });
    }

    console.log(`✂️  Created ${chunks.length} chunks`);

    // ── 4. Generate embeddings ─────────────────────────────────────
    const embeddings = await createEmbeddings(chunks);
    console.log(`🔢 Generated ${embeddings.length} embeddings`);

    // ── 5. Store vectors ───────────────────────────────────────────
    const documentId = uuidv4();
    await storeVectors(chunks, embeddings, documentId, fileName);

    // ── 6. Cleanup uploaded file (optional — remove if you want to keep originals) ──
    fs.unlinkSync(filePath);

    // ── 7. Respond ─────────────────────────────────────────────────
    return res.status(201).json({
      success: true,
      message: "PDF uploaded and processed successfully.",
      data: {
        documentId,
        fileName,
        totalPages: parsedPDF.numpages,
        totalChars: rawText.length,
        totalChunks: chunks.length,
        embeddingDimension: embeddings[0]?.length ?? 0,
      },
    });
  } catch (error) {
    console.error("❌ Upload error:", error);

    // Clean up file if it exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({
      success: false,
      message: "Internal server error during PDF processing.",
      error: error.message,
    });
  }
};
