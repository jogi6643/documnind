# 🧠 DocuMind AI

> **RAG-based Document Intelligence Backend** — Upload PDFs, ask questions, get AI-powered answers.

Built by **Jugendra Pal Singh** · Senior Backend Engineer | AI Backend Developer

---

## 🏗️ Architecture

```
Client → Upload API → PDF Extraction → Chunking → Embedding Generation
                                                         ↓
                                                  Vector Storage
                                                         ↓
Client → Query API  → Query Embedding → Cosine Similarity Search
                                                         ↓
                                              Context Retrieval → LLM → Answer
```

---

## 📂 Project Structure

```
documind-ai/
├── src/
│   ├── app.js                     # Express entry point
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/
│   │   ├── uploadController.js    # PDF upload pipeline
│   │   └── queryController.js     # Q&A pipeline
│   ├── services/
│   │   ├── embeddingService.js    # Mock + OpenAI embeddings
│   │   ├── vectorService.js       # In-memory + MongoDB vector store
│   │   └── llmService.js          # Mock + OpenAI answer generation
│   ├── routes/
│   │   └── routes.js              # All API routes
│   ├── utils/
│   │   └── chunkText.js           # Smart text chunking
│   └── models/
│       └── vectorModel.js         # Mongoose schema
├── uploads/                       # Temporary PDF storage
├── .env                           # Environment config
└── package.json
```

---

## ⚡ Quick Start

### 1. Install dependencies
```bash
cd documind-ai
npm install
```

### 2. Configure environment
```bash
# .env — edit as needed
PORT=6000
MONGO_URI=mongodb://127.0.0.1:27017/documind
REDIS_URL=redis://127.0.0.1:6379

# Optional — set to true to use real AI
USE_OPENAI=false
OPENAI_API_KEY=your_key_here
USE_REDIS=false
```

### 3. Run the server
```bash
npm run dev      # with nodemon (auto-restart)
# or
npm start        # plain node
```

Expected output:
```
✅ MongoDB Connected: 127.0.0.1
╔══════════════════════════════════════════╗
║         🧠  DocuMind AI  🧠              ║
╠══════════════════════════════════════════╣
║  Server  : http://localhost:6000         ║
║  Mode LLM: Mock (offline)               ║
║  Cache   : Disabled                     ║
╚══════════════════════════════════════════╝
```

> **Note:** MongoDB and Redis are optional. The server falls back to in-memory storage automatically.

---

## 📡 API Reference

### `GET /api/health`
System status check.

**Response:**
```json
{
  "success": true,
  "service": "DocuMind AI",
  "version": "1.0.0",
  "mode": { "llm": "mock", "cache": "none" }
}
```

---

### `POST /api/upload`
Upload a PDF document. Extracts text, chunks it, generates embeddings, and stores vectors.

**Body:** `multipart/form-data`

| Key  | Type | Description       |
|------|------|-------------------|
| file | File | PDF file (max 25 MB) |

**Response:**
```json
{
  "success": true,
  "message": "PDF uploaded and processed successfully.",
  "data": {
    "documentId": "uuid-v4",
    "fileName": "my-doc.pdf",
    "totalPages": 10,
    "totalChars": 24500,
    "totalChunks": 32,
    "embeddingDimension": 128
  }
}
```

---

### `POST /api/query`
Ask a question against all uploaded documents.

**Body:** `application/json`
```json
{
  "question": "What is the main topic of this document?",
  "topK": 5
}
```

**Response:**
```json
{
  "success": true,
  "cached": false,
  "question": "What is the main topic of this document?",
  "answer": "Based on the document ...",
  "sources": [
    {
      "documentId": "uuid-v4",
      "fileName": "my-doc.pdf",
      "score": 0.9231,
      "preview": "First 150 chars of the matching chunk..."
    }
  ]
}
```

---

### `GET /api/documents`
List all indexed documents.

**Response:**
```json
{
  "success": true,
  "count": 2,
  "documents": [
    { "documentId": "...", "fileName": "report.pdf", "chunkCount": 45 }
  ]
}
```

---

### `DELETE /api/documents/:id`
Remove all vectors for a specific document.

**Response:**
```json
{ "success": true, "message": "Deleted 45 chunks for document <id>" }
```

---

## 🔧 Feature Flags (`.env`)

| Variable        | Default | Description                              |
|-----------------|---------|------------------------------------------|
| `USE_OPENAI`    | `false` | Use OpenAI embeddings + GPT-4o-mini      |
| `USE_REDIS`     | `false` | Enable Redis query caching               |
| `OPENAI_API_KEY`| —       | Required when `USE_OPENAI=true`          |
| `PORT`          | `6000`  | HTTP server port                         |
| `MONGO_URI`     | —       | https://cloud.mongodb.com/v2/69fc116df325e8bc120dd28d7d#/explorer/69fc6e113ca003f5a95f8ef6/test/vectors/find               |
| `REDIS_URL`     | —       | Redis connection string                  |

---

## 🧠 AI Concepts

| Concept | Implementation |
|---------|---------------|
| **RAG** | Upload → embed → store → retrieve → answer |
| **Embeddings** | 128-dim pseudo-semantic vectors (mock) or OpenAI `text-embedding-3-small` |
| **Cosine Similarity** | `dot(A,B) / (‖A‖·‖B‖)` — ranks chunks by relevance |
| **Semantic Chunking** | Paragraph splitting with sentence-boundary sub-splitting |
| **Vector Store** | In-memory (dev) / MongoDB (prod) |
| **Caching** | Redis TTL cache for repeated queries |

---

## 🚀 Production Roadmap

- [ ] JWT Authentication
- [ ] OpenAI / Ollama real LLM integration
- [ ] Pinecone / FAISS vector store
- [ ] Streaming AI responses
- [ ] Docker + docker-compose
- [ ] Queue-based background processing
- [ ] LangChain integration
- [ ] Hybrid BM25 + vector search

---

## 📜 License

MIT © Jugendra Pal Singh
