import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ingestPaper } from "@/lib/rag-client";

const ingestSchema = z.object({
  source: z.enum(["arxiv", "pubmed", "core"]),
  externalId: z.string().min(1),
  title: z.string().min(1),
  authors: z.array(z.string()).default([]),
  year: z.number().optional(),
  abstract: z.string().optional(),
  pdfUrl: z.string().optional(),
  doi: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await ingestPaper(parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ingest failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
