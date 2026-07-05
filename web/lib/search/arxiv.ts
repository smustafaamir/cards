import type { SearchResponse, SearchResult } from "@/lib/search/types";

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1].trim()) : "";
}

function parseArxivEntry(entryXml: string): SearchResult | null {
  const idUrl = extractTag(entryXml, "id");
  const arxivId = idUrl.split("/abs/")[1]?.replace(/v\d+$/, "") ?? "";
  const title = extractTag(entryXml, "title").replace(/\s+/g, " ");
  if (!arxivId || !title) return null;

  const authors = Array.from(entryXml.matchAll(/<name>([\s\S]*?)<\/name>/g)).map((m) =>
    decodeXml(m[1].trim())
  );
  const summary = extractTag(entryXml, "summary").replace(/\s+/g, " ");
  const published = extractTag(entryXml, "published");
  const year = published ? Number(published.slice(0, 4)) : undefined;

  return {
    source: "arxiv",
    externalId: arxivId,
    title,
    authors,
    year,
    abstract: summary,
    pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
  };
}

export async function searchArxiv(query: string, start = 0): Promise<SearchResponse> {
  const url = new URL("http://export.arxiv.org/api/query");
  url.searchParams.set("search_query", `all:${query}`);
  url.searchParams.set("start", String(start));
  url.searchParams.set("max_results", "10");
  url.searchParams.set("sortBy", "relevance");
  url.searchParams.set("sortOrder", "descending");

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`arXiv search failed: ${response.status}`);
  }

  const xml = await response.text();
  const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g));
  const results = entries
    .map((match) => parseArxivEntry(match[1]))
    .filter((entry): entry is SearchResult => entry !== null);

  const totalMatch = xml.match(/<opensearch:totalResults>(\d+)<\/opensearch:totalResults>/);
  const total = totalMatch ? Number(totalMatch[1]) : results.length;

  return { results, total, start };
}
