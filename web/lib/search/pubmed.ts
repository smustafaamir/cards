import { getOptionalEnv } from "@/lib/env";
import type { SearchResponse } from "@/lib/search/types";

function ncbiParams(): Record<string, string> {
  const params: Record<string, string> = {
    tool: "research-assistant",
    email: getOptionalEnv("NCBI_EMAIL", "user@example.com"),
  };
  const apiKey = getOptionalEnv("NCBI_API_KEY");
  if (apiKey) params.api_key = apiKey;
  return params;
}

type ESummaryResult = {
  uid: string;
  title?: string;
  authors?: Array<{ name: string }>;
  pubdate?: string;
  articleids?: Array<{ idtype: string; value: string }>;
};

export async function searchPubMed(query: string, retstart = 0): Promise<SearchResponse> {
  const searchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  searchUrl.searchParams.set("db", "pubmed");
  searchUrl.searchParams.set("term", query);
  searchUrl.searchParams.set("retmode", "json");
  searchUrl.searchParams.set("retstart", String(retstart));
  searchUrl.searchParams.set("retmax", "10");
  for (const [key, value] of Object.entries(ncbiParams())) {
    searchUrl.searchParams.set(key, value);
  }

  const searchResponse = await fetch(searchUrl.toString(), { cache: "no-store" });
  if (!searchResponse.ok) {
    throw new Error(`PubMed esearch failed: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  const ids: string[] = searchData.esearchresult?.idlist ?? [];
  const total = Number(searchData.esearchresult?.count ?? ids.length);

  if (ids.length === 0) {
    return { results: [], total, start: retstart };
  }

  const summaryUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
  summaryUrl.searchParams.set("db", "pubmed");
  summaryUrl.searchParams.set("id", ids.join(","));
  summaryUrl.searchParams.set("retmode", "json");
  for (const [key, value] of Object.entries(ncbiParams())) {
    summaryUrl.searchParams.set(key, value);
  }

  const summaryResponse = await fetch(summaryUrl.toString(), { cache: "no-store" });
  if (!summaryResponse.ok) {
    throw new Error(`PubMed esummary failed: ${summaryResponse.status}`);
  }

  const summaryData = await summaryResponse.json();
  const resultMap = summaryData.result ?? {};

  const results = ids
    .map((id) => {
      const item = resultMap[id] as ESummaryResult | undefined;
      if (!item) return null;

      const authors = (item.authors ?? []).map((author) => author.name).filter(Boolean);
      const year = item.pubdate ? Number(item.pubdate.slice(0, 4)) : undefined;
      const doi = item.articleids?.find((aid) => aid.idtype === "doi")?.value;

      return {
        source: "pubmed" as const,
        externalId: id,
        title: item.title ?? "Untitled",
        authors,
        year,
        doi,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return { results, total, start: retstart };
}
