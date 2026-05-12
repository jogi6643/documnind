/**
 * queryController.js
 *
 * Handles question-answering requests:
 *   POST /api/query
 *
 * Pipeline:
 *   Question
 *     → Redis cache check
 *     → createQueryEmbedding  (embed the question)
 *     → searchSimilar         (retrieve top-K chunks)
 *     → generateAnswer        (LLM / mock response)
 *     → Redis cache set
 *     → JSON response
 */

import { createQueryEmbedding } from "../services/embeddingService.js";
import { searchSimilar } from "../services/vectorService.js";
import { generateAnswer } from "../services/llmService.js";

// Lazy Redis client — only initialised when USE_REDIS=true
let redisClient = null;

const getRedisClient = async () => {
  if (!process.env.REDIS_URL || process.env.USE_REDIS !== "true") return null;

  if (redisClient) return redisClient;

  try {
    const { createClient } = await import("redis");
    redisClient = createClient({ url: process.env.REDIS_URL });
    redisClient.on("error", (err) => console.warn("Redis error:", err.message));
    await redisClient.connect();
    console.log("⚡ Redis connected");
    return redisClient;
  } catch (err) {
    console.warn("⚠️  Redis unavailable, skipping cache:", err.message);
    return null;
  }
};

/* ------------------------------------------------------------------ */

/**
 * queryDocument — controller for POST /api/query
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 */
export const queryDocument = async (req, res) => {
  try {
    const { question, topK = 5 } = req.body;

    // ── 1. Validate input ──────────────────────────────────────────
    if (!question || typeof question !== "string" || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a non-empty 'question' field in the request body.",
      });
    }

    const cleanQuestion = question.trim();
    console.log(`❓ Query: "${cleanQuestion}"`);

    // ── 2. Redis cache check ───────────────────────────────────────
    const redis = await getRedisClient();
    const cacheKey = `query:${cleanQuestion.toLowerCase().replace(/\s+/g, "_")}`;

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log("⚡ Cache hit — returning cached answer");
        return res.json({
          success: true,
          cached: true,
          question: cleanQuestion,
          answer: cached,
        });
      }
    }

    // ── 3. Embed the question ──────────────────────────────────────
    const queryEmbedding = await createQueryEmbedding(cleanQuestion);

    // ── 4. Retrieve top-K similar chunks ───────────────────────────
    const results = await searchSimilar(queryEmbedding, Number(topK));
    console.log(`🔍 Found ${results.length} relevant chunks`);

    // ── 5. Generate answer ─────────────────────────────────────────
    const contextChunks = results.map((r) => r.text);
    const answer = await generateAnswer(cleanQuestion, contextChunks);

    // ── 6. Cache the answer (TTL: 1 hour) ─────────────────────────
    if (redis) {
      await redis.setEx(cacheKey, 3600, answer);
    }

    // ── 7. Respond ─────────────────────────────────────────────────
    return res.json({
      success: true,
      cached: false,
      question: cleanQuestion,
      answer,
      sources: results.map(({ text, documentId, fileName, score }) => ({
        documentId,
        fileName,
        score: parseFloat(score.toFixed(4)),
        preview: text.substring(0, 150) + "…",
      })),
    });
  } catch (error) {
    console.error("❌ Query error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while processing your question.",
      error: error.message,
    });
  }
};
