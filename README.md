# Research Assistant

A zero-cost, personal RAG research assistant. Search arXiv, PubMed, and CORE; curate a paper library; chat with citations over your indexed collection.

## Stack

- **Frontend / API:** Next.js 14 (App Router, TypeScript, Tailwind, shadcn/ui)
- **RAG engine:** Python FastAPI (Dockerized)
- **LLM:** GroqCloud free tier (called from Next.js API routes)
- **Vector DB:** ChromaDB (persistent Docker volume)
- **Embeddings:** `sentence-transformers/all-MiniLM-L6-v2` (local, CPU)
- **PDF parsing:** PyMuPDF
- **Orchestration:** Docker Compose

## Prerequisites

- Docker and Docker Compose
- Free API keys (you configure these yourself):
  - [Groq API key](https://console.groq.com/keys)
  - [CORE API key](https://core.ac.uk/services/api)
  - [NCBI API key](https://www.ncbi.nlm.nih.gov/account/settings/) (recommended)
  - NCBI email (required by NCBI policy)

## Quick Start

1. Copy environment template:

```bash
cp .env.example .env
```

2. Fill in `.env` with your API keys and NCBI email.

3. Build and run:

```bash
docker compose up --build
```

For hot reload during development:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

4. Open [http://localhost:3000](http://localhost:3000)

## Workflow

1. **Search** — Query arXiv, PubMed, or CORE
2. **Library** — Add selected papers; Python ingests PDFs/abstracts, chunks, embeds, and stores in ChromaDB
3. **Chat** — Ask questions; Next.js retrieves relevant chunks from Python and streams answers from Groq with citations

## Services

| Service | URL | Description |
|---------|-----|-------------|
| web | http://localhost:3000 | Next.js UI and API routes |
| rag | http://localhost:8000 | FastAPI RAG microservice |
| chroma | internal | ChromaDB vector store |

## Local Development (without Docker)

### RAG service

```bash
cd rag
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Run Chroma separately (or via `docker compose up chroma`).

### Web app

```bash
cd web
npm install
npm run dev
```

Set `RAG_SERVICE_URL=http://localhost:8000` in `web/.env.local`.

## Environment Variables

See [`.env.example`](.env.example) for the full list.

## Notes

- PubMed papers without open-access PMC full text are ingested as **abstract only**
- First ingest downloads the embedding model (~80MB) into the `hf_cache` Docker volume
- Groq free tier is rate-limited; default model is `llama-3.1-8b-instant` for higher daily request limits
