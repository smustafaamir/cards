import { getOptionalEnv } from "@/lib/env";
import type { IngestStatus, LibraryPaper, RetrievedChunk, SearchResult } from "@/lib/search/types";

const RAG_SERVICE_URL = getOptionalEnv("RAG_SERVICE_URL", "http://localhost:8000");

async function ragFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${RAG_SERVICE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    try {
      const json = JSON.parse(text) as { detail?: string | unknown };
      if (typeof json.detail === "string") {
        throw new Error(json.detail);
      }
    } catch (error) {
      if (error instanceof Error && error.message !== text) {
        throw error;
      }
    }
    throw new Error(text || `RAG service error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function ingestPaper(paper: SearchResult): Promise<{
  paperId: string;
  status: IngestStatus;
  chunkCount: number;
  message?: string;
}> {
  const result = await ragFetch<{
    paper_id: string;
    status: "ready" | "abstract_only" | "error";
    chunk_count: number;
    message?: string;
  }>("/ingest", {
    method: "POST",
    body: JSON.stringify({
      source: paper.source,
      external_id: paper.externalId,
      title: paper.title,
      authors: paper.authors,
      year: paper.year,
      abstract: paper.abstract,
      pdf_url: paper.pdfUrl,
      doi: paper.doi,
    }),
  });

  return {
    paperId: result.paper_id,
    status: result.status,
    chunkCount: result.chunk_count,
    message: result.message,
  };
}

export async function listLibrary(): Promise<LibraryPaper[]> {
  const result = await ragFetch<{ papers: Array<Record<string, unknown>> }>("/library");
  return result.papers.map((paper) => ({
    paperId: String(paper.paper_id),
    source: paper.source as LibraryPaper["source"],
    externalId: String(paper.external_id),
    title: String(paper.title),
    authors: String(paper.authors),
    year: paper.year ? Number(paper.year) : undefined,
    doi: paper.doi ? String(paper.doi) : undefined,
    status: paper.status as LibraryPaper["status"],
    chunkCount: Number(paper.chunk_count),
  }));
}

export async function deletePaper(paperId: string): Promise<void> {
  await ragFetch(`/library/${encodeURIComponent(paperId)}`, { method: "DELETE" });
}

export async function retrieveChunks(
  query: string,
  topK = 5,
  paperIds?: string[]
): Promise<RetrievedChunk[]> {
  const result = await ragFetch<{ chunks: Array<Record<string, unknown>> }>("/retrieve", {
    method: "POST",
    body: JSON.stringify({ query, top_k: topK, paper_ids: paperIds }),
  });

  return result.chunks.map((chunk) => ({
    id: String(chunk.id),
    text: String(chunk.text),
    score: Number(chunk.score),
    paperId: String(chunk.paper_id),
    source: String(chunk.source),
    title: String(chunk.title),
    authors: String(chunk.authors),
    chunkIndex: Number(chunk.chunk_index),
    page: chunk.page ? Number(chunk.page) : undefined,
  }));
}
