/**
 * llmService.js
 *
 * Responsible for generating a natural-language answer given:
 *   - a user question
 *   - an array of relevant context chunks retrieved from the vector store
 *
 * Modes:
 *   MOCK    — rule-based template engine, zero API cost (default).
 *   OpenAI  — GPT-4o-mini completion (enabled via USE_OPENAI=true).
 */

/* ------------------------------------------------------------------ *
 *  Helpers                                                             *
 * ------------------------------------------------------------------ */

/**
 * Build a concise prompt from context chunks and the user's question.
 * @param {string}   question
 * @param {string[]} contextChunks
 * @returns {string}
 */
const buildPrompt = (question, contextChunks) => {
  const context = contextChunks
    .map((c, i) => `[Chunk ${i + 1}]\n${c}`)
    .join("\n\n");

  return `You are DocuMind AI, an intelligent document assistant.
Use ONLY the context below to answer the question.
If the answer cannot be found in the context, say "I couldn't find relevant information in the uploaded documents."

---CONTEXT---
${context}
---END CONTEXT---

Question: ${question}

Answer:`;
};

/* ------------------------------------------------------------------ *
 *  Mock LLM (rule-based, offline)                                      *
 * ------------------------------------------------------------------ */

/**
 * Simple keyword-driven response builder — no API key required.
 * @param {string}   question
 * @param {string[]} contextChunks
 * @returns {string}
 */
const mockLLMResponse = (question, contextChunks) => {
  if (contextChunks.length === 0) {
    return "I couldn't find relevant information in the uploaded documents. Please upload a PDF first, then ask your question.";
  }

  const q = question.toLowerCase();
  const combined = contextChunks.join(" ").toLowerCase();

  // Summarise request
  if (q.includes("summar") || q.includes("overview") || q.includes("about")) {
    return (
      `📄 Based on the document, here is a summary:\n\n` +
      contextChunks
        .slice(0, 3)
        .map((c, i) => `• ${c.substring(0, 200).trim()}…`)
        .join("\n\n")
    );
  }

  // Definition request
  if (q.includes("what is") || q.includes("define") || q.includes("explain")) {
    const best = contextChunks[0];
    return `📖 According to the document:\n\n"${best.substring(0, 400).trim()}…"`;
  }

  // How/why
  if (q.includes("how") || q.includes("why") || q.includes("process")) {
    return (
      `⚙️ Here is what the document says about that:\n\n` +
      contextChunks
        .slice(0, 2)
        .map((c) => `• ${c.substring(0, 250).trim()}…`)
        .join("\n\n")
    );
  }

  // Generic answer — surface top chunk
  return (
    `🔍 Based on the most relevant section of your document:\n\n` +
    `"${contextChunks[0].substring(0, 500).trim()}…"\n\n` +
    `(${contextChunks.length} related sections were found)`
  );
};

/* ------------------------------------------------------------------ *
 *  OpenAI LLM                                                          *
 * ------------------------------------------------------------------ */

/**
 * @param {string}   question
 * @param {string[]} contextChunks
 * @returns {Promise<string>}
 */
const openAIResponse = async (question, contextChunks) => {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = buildPrompt(question, contextChunks);

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 800,
    temperature: 0.3,
  });

  return completion.choices[0].message.content.trim();
};

/* ------------------------------------------------------------------ *
 *  Public API                                                          *
 * ------------------------------------------------------------------ */

/**
 * generateAnswer — main entry point for the LLM layer.
 *
 * @param {string}   question
 * @param {string[]} contextChunks  — top-K chunks from vector search
 * @returns {Promise<string>}
 */
export const generateAnswer = async (question, contextChunks) => {
  const useOpenAI =
    process.env.USE_OPENAI === "true" && process.env.OPENAI_API_KEY;

  if (useOpenAI) {
    console.log("💬 Generating answer via OpenAI GPT-4o-mini");
    return openAIResponse(question, contextChunks);
  }

  console.log("💬 Generating answer via mock LLM");
  return mockLLMResponse(question, contextChunks);
};
