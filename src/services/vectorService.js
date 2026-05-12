/**
 * vectorService.js
 *
 * Dual-backend vector store:
 *   1. In-Memory  — always works, data lost on restart (great for dev/demo).
 *   2. MongoDB    — persists across restarts (enabled automatically when
 *                   mongoose is connected).
 *
 * Public API:
 *   storeVectors(chunks, embeddings, documentId, fileName)
 *   searchSimilar(queryEmbedding, topK?)
 *   getAllDocuments()
 *   deleteDocument(documentId)
 */

import mongoose from "mongoose";
import VectorModel from "../models/vectorModel.js";

/* ------------------------------------------------------------------ *
 *  In-Memory fallback store                                            *
 * ------------------------------------------------------------------ */

/** @type {Array<{text:string, embedding:number[], documentId:string, fileName:string, chunkIndex:number}>} */
const memoryStore = [];

const isMongoConnected = () =>
  mongoose.connection.readyState === 1; // 1 = connected

/* ------------------------------------------------------------------ *
 *  Cosine Similarity                                                   *
 * ------------------------------------------------------------------ */

/**
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}  value in [-1, 1]; higher = more similar
 */
const cosineSimilarity = (a, b) => {
  if (!a || !b || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
};

/* ------------------------------------------------------------------ *
 *  Store                                                               *
 * ------------------------------------------------------------------ */

/**
 * Persist chunks + embeddings to MongoDB (if connected) or memory.
 *
 * @param {string[]}   chunks
 * @param {number[][]} embeddings
 * @param {string}     documentId
 * @param {string}     fileName
 */
export const storeVectors = async (chunks, embeddings, documentId, fileName) => {
  const records = chunks.map((text, i) => ({
    text,
    embedding: embeddings[i],
    documentId,
    fileName,
    chunkIndex: i,
  }));

  if (isMongoConnected()) {
    await VectorModel.insertMany(records);
    console.log(`💾 Stored ${records.length} vectors in MongoDB`);
  } else {
    memoryStore.push(...records);
    console.log(`💾 Stored ${records.length} vectors in memory (total: ${memoryStore.length})`);
  }
};

/* ------------------------------------------------------------------ *
 *  Search                                                              *
 * ------------------------------------------------------------------ */

/**
 * Return the top-K most similar chunks to a query embedding.
 *
 * @param {number[]} queryEmbedding
 * @param {number}   topK
 * @returns {Promise<Array<{text:string, documentId:string, fileName:string, score:number}>>}
 */
export const searchSimilar = async (queryEmbedding, topK = 5) => {
  let candidates = [];

  if (isMongoConnected()) {
    candidates = await VectorModel.find({}).lean();
  } else {
    candidates = memoryStore;
  }

  if (candidates.length === 0) return [];

  const scored = candidates.map((doc) => ({
    text: doc.text,
    documentId: doc.documentId,
    fileName: doc.fileName,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
};

/* ------------------------------------------------------------------ *
 *  Utility helpers                                                     *
 * ------------------------------------------------------------------ */

/**
 * List all unique documents currently stored.
 * @returns {Promise<Array<{documentId:string, fileName:string, chunkCount:number}>>}
 */
export const getAllDocuments = async () => {
  if (isMongoConnected()) {
    const docs = await VectorModel.aggregate([
      {
        $group: {
          _id: "$documentId",
          fileName: { $first: "$fileName" },
          chunkCount: { $sum: 1 },
        },
      },
      { $project: { _id: 0, documentId: "$_id", fileName: 1, chunkCount: 1 } },
    ]);
    return docs;
  }

  const map = new Map();
  for (const r of memoryStore) {
    if (!map.has(r.documentId)) {
      map.set(r.documentId, { documentId: r.documentId, fileName: r.fileName, chunkCount: 0 });
    }
    map.get(r.documentId).chunkCount++;
  }
  return [...map.values()];
};

/**
 * Delete all vectors for a given documentId.
 * @param {string} documentId
 * @returns {Promise<number>} count of deleted records
 */
export const deleteDocument = async (documentId) => {
  if (isMongoConnected()) {
    const result = await VectorModel.deleteMany({ documentId });
    return result.deletedCount;
  }

  const before = memoryStore.length;
  const remaining = memoryStore.filter((r) => r.documentId !== documentId);
  memoryStore.length = 0;
  memoryStore.push(...remaining);
  return before - memoryStore.length;
};
