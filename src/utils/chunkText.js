/**
 * chunkText — splits extracted PDF text into meaningful chunks.
 *
 * Strategy:
 *  1. Split on double-newlines (paragraph boundaries).
 *  2. Filter out chunks that are too short to be meaningful.
 *  3. If a paragraph is very long, split it further into sentences.
 *
 * @param {string} text         - Raw text extracted from a PDF.
 * @param {number} minLength    - Minimum character length for a valid chunk.
 * @param {number} maxLength    - Max characters before a paragraph is sub-split.
 * @returns {string[]}          - Array of cleaned text chunks.
 */
export const chunkText = (text, minLength = 100, maxLength = 1000) => {
  if (!text || typeof text !== "string") return [];

  // Normalise line endings and collapse excessive blank lines
  const normalised = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const paragraphs = normalised.split("\n\n");

  const chunks = [];

  for (const para of paragraphs) {
    const cleaned = para.replace(/\s+/g, " ").trim();

    if (cleaned.length < minLength) continue;

    if (cleaned.length <= maxLength) {
      chunks.push(cleaned);
    } else {
      // Sub-split long paragraphs by sentence boundary
      const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
      let buffer = "";

      for (const sentence of sentences) {
        if ((buffer + sentence).length > maxLength && buffer.length > 0) {
          chunks.push(buffer.trim());
          buffer = sentence;
        } else {
          buffer += " " + sentence;
        }
      }

      if (buffer.trim().length >= minLength) {
        chunks.push(buffer.trim());
      }
    }
  }

  return chunks;
};
