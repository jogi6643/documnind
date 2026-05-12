/**
 * embeddingService.js
 *
 * Responsible for generating vector embeddings for text chunks.
 *
 * Current mode : MOCK  — produces random 128-dim vectors so the whole
 *                        RAG pipeline works without any paid API keys.
 *
 * Production   : Swap `createEmbeddings` to call OpenAI, HuggingFace,
 *                Ollama, or any local embedding model.
 */

/* ------------------------------------------------------------------ *
 *  MOCK EMBEDDING (always available, no API key needed)               *
 * ------------------------------------------------------------------ */

const VECTOR_DIM = 128; // higher dimension → better semantic coverage

/**
 * Generate a deterministic-ish pseudo-embedding from raw text.
 * Characters are hashed into a fixed-size float vector so that
 * similar strings produce loosely similar vectors.
 *
 * @param {string} text
 * @returns {number[]}
 */
const mockEmbedFromText = (text) => {
  const vec = new Array(VECTOR_DIM).fill(0);

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const idx = (charCode * (i + 1)) % VECTOR_DIM;
    vec[idx] += charCode / 255;
  }

  // L2-normalise so cosine similarity is meaningful
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
};

/* ------------------------------------------------------------------ *
 *  OPENAI EMBEDDING (activate by setting USE_OPENAI=true in .env)     *
 * ------------------------------------------------------------------ */

/**
 * @param {string[]} chunks
 * @returns {Promise<number[][]>}
 */
const openAIEmbeddings = async (chunks) => {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks,
  });

  return response.data.map((item) => item.embedding);
};

/* ------------------------------------------------------------------ *
 *  Public API                                                          *
 * ------------------------------------------------------------------ */

/**
 * createEmbeddings — turns an array of text chunks into an array of
 * numeric embedding vectors.
 *
 * @param {string[]} chunks
 * @returns {Promise<number[][]>}
 */
export const createEmbeddings = async (chunks) => {
  if (!Array.isArray(chunks) || chunks.length === 0) return [];

  const useOpenAI =
    process.env.USE_OPENAI === "true" && process.env.OPENAI_API_KEY;

  if (useOpenAI) {
    console.log("🤖 Using OpenAI text-embedding-3-small");
    return openAIEmbeddings(chunks);
  }

  console.log(`🔢 Generating mock embeddings (dim=${VECTOR_DIM}) for ${chunks.length} chunks`);
  return chunks.map((chunk) => mockEmbedFromText(chunk));
};

/**
 * createQueryEmbedding — single embedding for a user question.
 *
 * @param {string} question
 * @returns {Promise<number[]>}
 */
export const createQueryEmbedding = async (question) => {
  const [embedding] = await createEmbeddings([question]);
  return embedding;
};
