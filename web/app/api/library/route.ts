import { NextResponse } from "next/server";

import { deletePaper, listLibrary } from "@/lib/rag-client";

export async function GET() {
  try {
    const papers = await listLibrary();
    return NextResponse.json({ papers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load library";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const paperId = searchParams.get("paperId");

  if (!paperId) {
    return NextResponse.json({ error: "paperId is required" }, { status: 400 });
  }

  try {
    await deletePaper(paperId);
    return NextResponse.json({ status: "deleted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete paper";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
