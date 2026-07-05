export type SourceType = "arxiv" | "pubmed" | "core";

export type SearchResult = {
  source: SourceType;
  externalId: string;
  title: string;
  authors: string[];
  year?: number;
  abstract?: string;
  pdfUrl?: string;
  doi?: string;
};

export type SearchResponse = {
  results: SearchResult[];
  total?: number;
  start: number;
};

export type IngestStatus = "pending" | "processing" | "ready" | "abstract_only" | "error";

export type LibraryPaper = {
  paperId: string;
  source: SourceType;
  externalId: string;
  title: string;
  authors: string;
  year?: number;
  doi?: string;
  status: "ready" | "abstract_only";
  chunkCount: number;
};

export type RetrievedChunk = {
  id: string;
  text: string;
  score: number;
  paperId: string;
  source: string;
  title: string;
  authors: string;
  chunkIndex: number;
  page?: number;
};

export type Citation = {
  index: number;
  paperId: string;
  title: string;
  source: string;
  page?: number;
};
