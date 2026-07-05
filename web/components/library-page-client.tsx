"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { LibraryPaperCard } from "@/components/library-paper-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { LibraryPaper } from "@/lib/search/types";

export function LibraryPageClient() {
  const [papers, setPapers] = useState<LibraryPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/library");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load library");
      }
      setPapers(data.papers ?? []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load library";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibrary();
    const interval = setInterval(loadLibrary, 10000);
    return () => clearInterval(interval);
  }, [loadLibrary]);

  const removePaper = async (paperId: string) => {
    setRemovingId(paperId);
    try {
      const response = await fetch(`/api/library?paperId=${encodeURIComponent(paperId)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to remove paper");
      }
      setPapers((prev) => prev.filter((paper) => paper.paperId !== paperId));
      toast.success("Paper removed");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove paper";
      toast.error(message);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="text-[32px] font-semibold tracking-[-0.04em] text-black">Library</h1>
        <p className="text-sm text-[#71717a]">
          Papers indexed in your local ChromaDB vector store.
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full rounded-lg" />
          ))}
        </div>
      ) : papers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#e4e4e7] bg-white p-8 text-center">
          <p className="text-sm text-[#71717a]">
            Your library is empty. Search and add papers first.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {papers.map((paper) => (
            <LibraryPaperCard
              key={paper.paperId}
              paper={paper}
              onRemove={removePaper}
              removing={removingId === paper.paperId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
