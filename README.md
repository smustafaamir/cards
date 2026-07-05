# Cards: My Personal Research Assistant

**Version:** v0.1 (Core Functionality Implemented)

A personal RAG-based research assistant. Allows me to: search arXiv, PubMed, and CORE; curate a paper library; chat with citations over indexed collection. Feel free to use this as a template to develop your own personal research tool :)

## Status (v0.1)

Core end-to-end workflow is implemented and working:


| Area          | What's included                                                                         |
| ------------- | --------------------------------------------------------------------------------------- |
| **Search**    | Tabbed search across arXiv, PubMed, and CORE with paginated results                     |
| **Library**   | Add papers from search, view ingest status (full text vs abstract-only), remove papers  |
| **Ingestion** | PDF download and parsing (PyMuPDF), text chunking, local embeddings, ChromaDB storage   |
| **Chat**      | Retrieval-augmented Q&A over your library with streaming responses and inline citations |
| **UI**        | Next.js app with Search, Library, and Chat pages; monochrome Geist + shadcn/ui styling  |
| **Ops**       | Docker Compose for web, RAG service, and ChromaDB; optional dev override for hot reload |


Not in v0.1: user accounts, cloud deployment, multi-library support, or advanced search filters.

## Stack

- **Frontend / API:** Next.js 14 (App Router, TypeScript, Tailwind, shadcn/ui)
- **RAG engine:** Python FastAPI (Dockerized)
- **LLM:** GroqCloud (called from Next.js API routes)
- **Vector DB:** ChromaDB (persistent Docker volume)
- **Embeddings:** `sentence-transformers/all-MiniLM-L6-v2` (local, CPU)
- **PDF parsing:** PyMuPDF
- **Orchestration:** Docker Compose

## Prerequisites

- Docker and Docker Compose
- API keys (you configure these yourself):
  - [Groq API key](https://console.groq.com/keys)
  - [CORE API key](https://core.ac.uk/services/api)
  - [NCBI API key](https://www.ncbi.nlm.nih.gov/account/settings/) (recommended)
  - NCBI email (required by NCBI policy)

## Quick Start

1. Copy the environment template:

```bash
cp .env.example .env
```

1. Fill in `.env` with your API keys and NCBI email.
  For local web development without Docker, also copy keys into `web/.env.local` and set `RAG_SERVICE_URL=http://localhost:8000`.
2. Build and run:

```bash
docker compose up --build
```

For hot reload during development:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

1. Open [http://localhost:3000](http://localhost:3000)

## Workflow

1. **Search** — Query arXiv, PubMed, or CORE and browse paginated results
2. **Library** — Add selected papers; the RAG service ingests PDFs or abstracts, chunks, embeds, and stores them in ChromaDB
3. **Chat** — Ask questions; the app retrieves relevant chunks from your library and streams answers from Groq with citations

## Services


| Service | URL                                            | Description               |
| ------- | ---------------------------------------------- | ------------------------- |
| web     | [http://localhost:3000](http://localhost:3000) | Next.js UI and API routes |
| rag     | [http://localhost:8000](http://localhost:8000) | FastAPI RAG microservice  |
| chroma  | internal                                       | ChromaDB vector store     |


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

See `[.env.example](.env.example)` for the full list.

## Notes

- PubMed papers without open-access PMC full text are ingested as **abstract only**
- First ingest downloads the embedding model (~80MB) into the `hf_cache` Docker volume
- Groq free tier is rate-limited; default model is `llama-3.1-8b-instant` for higher daily request limits
- Never commit `.env` or `web/.env.local` — use `.env.example` as the template

