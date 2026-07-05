"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SearchResult } from "@/lib/search/types";

const sourceLabels: Record<SearchResult["source"], string> = {
  arxiv: "arXiv",
  pubmed: "PubMed",
  core: "CORE",
};

type SearchResultCardProps = {
  result: SearchResult;
  onAdd: (result: SearchResult) => void;
  adding?: boolean;
  inLibrary?: boolean;
};

export function SearchResultCard({
  result,
  onAdd,
  adding,
  inLibrary,
}: SearchResultCardProps) {
  const metadata = [
    result.authors.join(", ") || "Unknown authors",
    result.year ? String(result.year) : null,
    result.doi ? `DOI ${result.doi}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card
      className={cn(
        "gap-4 rounded-lg border border-[#e4e4e7] bg-white p-6 shadow-none ring-0",
        "has-data-[slot=card-footer]:!pb-6"
      )}
    >
      <CardHeader className="gap-2.5 p-0">
        <CardTitle className="pr-3 text-base font-semibold leading-snug tracking-[-0.02em] text-black">
          {result.title}
        </CardTitle>
        <CardAction>
          <Badge
            variant="outline"
            className="rounded-full border-[#e4e4e7] bg-[#fafafa] px-2.5 py-0.5 text-xs font-medium text-black"
          >
            {sourceLabels[result.source]}
          </Badge>
        </CardAction>
        <CardDescription className="text-sm leading-relaxed text-[#71717a]">
          {metadata}
        </CardDescription>
      </CardHeader>

      {result.abstract ? (
        <CardContent className="p-0">
          <p className="line-clamp-4 text-sm leading-relaxed text-[#71717a]">
            {result.abstract}
          </p>
        </CardContent>
      ) : null}

      <CardFooter className="border-0 bg-transparent p-0">
        <Button
          size="sm"
          onClick={() => onAdd(result)}
          disabled={adding || inLibrary}
          className={cn(
            "h-8 rounded-full px-4 text-sm font-medium",
            inLibrary
              ? "border border-[#e4e4e7] bg-[#fafafa] text-[#71717a] hover:bg-[#fafafa]"
              : "bg-black text-white hover:bg-black/90"
          )}
        >
          {inLibrary ? "In Library" : adding ? "Adding..." : "Add to Library"}
        </Button>
      </CardFooter>
    </Card>
  );
}
