import mongoose from "mongoose";

/**
 * VectorModel — stores text chunks with their embeddings and document metadata.
 *
 * Fields:
 *  - text       : raw text chunk
 *  - embedding  : numeric vector representing the chunk
 *  - documentId : UUID of the parent PDF document
 *  - fileName   : original filename of the PDF
 *  - chunkIndex : position of the chunk within the document
 */
const vectorSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number],
      required: true,
    },
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      default: "unknown",
    },
    chunkIndex: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const VectorModel = mongoose.model("Vector", vectorSchema);

export default VectorModel;
