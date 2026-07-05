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
import type { LibraryPaper } from "@/lib/search/types";

const sourceLabels: Record<LibraryPaper["source"], string> = {
  arxiv: "arXiv",
  pubmed: "PubMed",
  core: "CORE",
};

type LibraryPaperCardProps = {
  paper: LibraryPaper;
  onRemove: (paperId: string) => void;
  removing?: boolean;
};

export function LibraryPaperCard({ paper, onRemove, removing }: LibraryPaperCardProps) {
  const metadata = [
    paper.authors || "Unknown authors",
    paper.year ? String(paper.year) : null,
    paper.doi ? `DOI ${paper.doi}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const indexingNote =
    paper.status === "abstract_only"
      ? `Abstract only · ${paper.chunkCount} chunk${paper.chunkCount === 1 ? "" : "s"} indexed`
      : `${paper.chunkCount} chunk${paper.chunkCount === 1 ? "" : "s"} indexed`;

  return (
    <Card
      className={cn(
        "gap-4 rounded-lg border border-[#e4e4e7] bg-white p-6 shadow-none ring-0",
        "has-data-[slot=card-footer]:!pb-6"
      )}
    >
      <CardHeader className="gap-2.5 p-0">
        <CardTitle className="pr-3 text-base font-semibold leading-snug tracking-[-0.02em] text-black">
          {paper.title}
        </CardTitle>
        <CardAction>
          <Badge
            variant="outline"
            className="rounded-full border-[#e4e4e7] bg-[#fafafa] px-2.5 py-0.5 text-xs font-medium text-black"
          >
            {sourceLabels[paper.source]}
          </Badge>
        </CardAction>
        <CardDescription className="text-sm leading-relaxed text-[#71717a]">
          {metadata}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        <p className="text-sm leading-relaxed text-[#71717a]">{indexingNote}</p>
      </CardContent>

      <CardFooter className="border-0 bg-transparent p-0">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRemove(paper.paperId)}
          disabled={removing}
          className="h-8 rounded-full border border-[#e4e4e7] bg-white px-4 text-sm font-medium text-black hover:bg-[#fafafa]"
        >
          {removing ? "Removing..." : "Remove"}
        </Button>
      </CardFooter>
    </Card>
  );
}
