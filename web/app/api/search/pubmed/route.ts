import { NextRequest, NextResponse } from "next/server";

import { getOptionalEnv } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { searchPubMed } from "@/lib/search/pubmed";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const retstart = Number(request.nextUrl.searchParams.get("retstart") ?? "0");

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  if (!getOptionalEnv("NCBI_EMAIL")) {
    return NextResponse.json(
      { error: "NCBI_EMAIL environment variable is required for PubMed search" },
      { status: 500 }
    );
  }

  const hasKey = Boolean(getOptionalEnv("NCBI_API_KEY"));
  const rate = checkRateLimit("pubmed", hasKey ? 10 : 3, 1000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "PubMed rate limit exceeded", retryAfterMs: rate.retryAfterMs },
      { status: 429 }
    );
  }

  try {
    const data = await searchPubMed(query, retstart);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "PubMed search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
