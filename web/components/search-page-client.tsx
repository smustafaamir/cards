"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { SearchResultCard } from "@/components/search-result-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { SearchResponse, SearchResult, SourceType } from "@/lib/search/types";

const sources: SourceType[] = ["arxiv", "pubmed", "core"];

const sourceLabels: Record<SourceType, string> = {
  arxiv: "arXiv",
  pubmed: "PubMed",
  core: "CORE",
};

const tabTriggerClassName = cn(
  "h-8 flex-none rounded-full border border-[#e4e4e7] bg-white px-3 py-1 text-sm font-medium text-black shadow-none transition-colors",
  "hover:bg-[#fafafa] hover:text-black",
  "data-active:hover:!bg-black data-active:hover:!text-white",
  "data-active:!border-black data-active:!bg-black data-active:!text-white",
  "aria-selected:!border-black aria-selected:!bg-black aria-selected:!text-white",
  "group-data-[variant=line]/tabs-list:data-active:!border-black group-data-[variant=line]/tabs-list:data-active:!bg-black group-data-[variant=line]/tabs-list:data-active:!text-white",
  "after:hidden"
);

export function SearchPageClient() {
  const [query, setQuery] = useState("");
  const [activeSource, setActiveSource] = useState<SourceType>("arxiv");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState<number | undefined>();
  const [addingId, setAddingId] = useState<string | null>(null);
  const [libraryIds, setLibraryIds] = useState<Set<string>>(new Set());

  const loadLibraryIds = useCallback(async () => {
    try {
      const response = await fetch("/api/library");
      if (!response.ok) return;
      const data = await response.json();
      const ids = new Set<string>(
        (data.papers ?? []).map((paper: { paperId: string }) => paper.paperId)
      );
      setLibraryIds(ids);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadLibraryIds();
  }, [loadLibraryIds]);

  const paperId = useCallback(
    (result: SearchResult) => `${result.source}:${result.externalId}`,
    []
  );

  const search = useCallback(
    async (nextOffset = 0) => {
      if (!query.trim()) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query.trim() });
        if (activeSource === "arxiv") params.set("start", String(nextOffset));
        if (activeSource === "pubmed") params.set("retstart", String(nextOffset));
        if (activeSource === "core") params.set("offset", String(nextOffset));

        const response = await fetch(`/api/search/${activeSource}?${params.toString()}`);
        const data = (await response.json()) as SearchResponse & {
          error?: string;
          retryAfterMs?: number;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Search failed");
        }

        setResults(data.results);
        setOffset(nextOffset);
        setTotal(data.total);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Search failed";
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [activeSource, query]
  );

  const addToLibrary = async (result: SearchResult) => {
    const id = paperId(result);
    setAddingId(id);
    try {
      const response = await fetch("/api/library/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to add paper");
      }

      setLibraryIds((prev) => new Set(prev).add(data.paperId ?? id));
      if (data.status === "abstract_only") {
        toast.success("Added with abstract only (no full text available)");
      } else if (data.status === "error") {
        toast.error(data.message ?? "Ingest failed");
      } else {
        toast.success("Paper added to library");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add paper";
      toast.error(message);
    } finally {
      setAddingId(null);
    }
  };

  const canGoNext = useMemo(() => {
    if (total === undefined) return results.length === 10;
    return offset + results.length < total;
  }, [offset, results.length, total]);

  const handleSourceChange = (value: string) => {
    setActiveSource(value as SourceType);
    setResults([]);
    setOffset(0);
    setTotal(undefined);
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="text-[32px] font-semibold tracking-[-0.04em] text-black">
          Search Literature
        </h1>
        <p className="text-sm text-[#71717a]">
          Search arXiv, PubMed, and CORE, then add papers to your library for RAG chat.
        </p>
      </header>

      <Tabs
        value={activeSource}
        onValueChange={handleSourceChange}
        className="flex w-full flex-col gap-4"
      >
        <TabsList
          variant="line"
          className="h-auto w-full justify-center gap-2 bg-transparent p-0"
        >
          {sources.map((source) => (
            <TabsTrigger key={source} value={source} className={tabTriggerClassName}>
              {sourceLabels[source]}
            </TabsTrigger>
          ))}
        </TabsList>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            search(0);
          }}
        >
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${sourceLabels[activeSource]}...`}
            className="h-12 flex-1 rounded-xl border-[#e4e4e7] bg-white text-base shadow-none focus-visible:ring-black/10"
          />
          <Button
            type="submit"
            disabled={loading || !query.trim()}
            className="h-12 rounded-full bg-black px-5 text-white hover:bg-black/90"
          >
            {loading ? "Searching..." : "Search"}
          </Button>
        </form>
      </Tabs>

      <section className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-36 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {results.length === 0 ? (
              <p className="text-center text-sm text-[#71717a]">No results yet.</p>
            ) : (
              results.map((result) => {
                const id = paperId(result);
                return (
                  <SearchResultCard
                    key={id}
                    result={result}
                    onAdd={addToLibrary}
                    adding={addingId === id}
                    inLibrary={libraryIds.has(id)}
                  />
                );
              })
            )}
          </div>
        )}

        {results.length > 0 ? (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              disabled={offset === 0 || loading}
              onClick={() => search(Math.max(offset - 10, 0))}
              className="rounded-full border-[#e4e4e7]"
            >
              Previous
            </Button>
            <span className="text-sm text-[#71717a]">
              Showing {offset + 1}-{offset + results.length}
              {total !== undefined ? ` of ${total}` : ""}
            </span>
            <Button
              variant="outline"
              disabled={!canGoNext || loading}
              onClick={() => search(offset + 10)}
              className="rounded-full border-[#e4e4e7]"
            >
              Next
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
