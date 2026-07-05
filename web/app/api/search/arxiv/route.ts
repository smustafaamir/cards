import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";
import { searchArxiv } from "@/lib/search/arxiv";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const start = Number(request.nextUrl.searchParams.get("start") ?? "0");

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  const rate = checkRateLimit("arxiv", 1, 3000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "arXiv rate limit exceeded", retryAfterMs: rate.retryAfterMs },
      { status: 429 }
    );
  }

  try {
    const data = await searchArxiv(query, start);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "arXiv search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
