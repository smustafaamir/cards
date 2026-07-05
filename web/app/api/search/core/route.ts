import { NextRequest, NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";
import { searchCore } from "@/lib/search/core";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  const rate = checkRateLimit("core", 10, 60000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "CORE rate limit exceeded", retryAfterMs: rate.retryAfterMs },
      { status: 429 }
    );
  }

  try {
    const data = await searchCore(query, offset);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "CORE search failed";
    const status = message.includes("rate limit") ? 429 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
