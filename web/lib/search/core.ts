import { getOptionalEnv } from "@/lib/env";
import { withRetry } from "@/lib/rate-limit";
import type { SearchResponse, SearchResult } from "@/lib/search/types";

type CoreWork = {
  id: number;
  title?: string;
  authors?: Array<{ name?: string }>;
  yearPublished?: number;
  abstract?: string;
  downloadUrl?: string;
  doi?: string;
};

type CoreSearchResponse = {
  totalHits: number;
  results?: CoreWork[];
};

export async function searchCore(query: string, offset = 0): Promise<SearchResponse> {
  const apiKey = getOptionalEnv("CORE_API_KEY");
  if (!apiKey) {
    throw new Error("CORE_API_KEY is required for CORE search");
  }

  const url = new URL("https://api.core.ac.uk/v3/search/works");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "10");
  url.searchParams.set("offset", String(offset));

  const data = await withRetry(async () => {
    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after");
      throw new Error(`CORE rate limit exceeded. Retry after ${retryAfter ?? "a few"} seconds.`);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `CORE search failed: ${response.status}`);
    }

    return response.json() as Promise<CoreSearchResponse>;
  });

  const results: SearchResult[] = (data.results ?? []).map((work) => ({
    source: "core",
    externalId: String(work.id),
    title: work.title ?? "Untitled",
    authors: (work.authors ?? []).map((author) => author.name ?? "").filter(Boolean),
    year: work.yearPublished,
    abstract: work.abstract,
    pdfUrl: work.downloadUrl,
    doi: work.doi,
  }));

  return { results, total: data.totalHits, start: offset };
}
