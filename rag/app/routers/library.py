from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models import LibraryPaper, LibraryResponse
from app.services.chroma import get_collection

router = APIRouter()


@router.get("/library", response_model=LibraryResponse)
async def list_library() -> LibraryResponse:
    collection = get_collection()
    data = collection.get(include=["metadatas"])

    papers_map: dict[str, LibraryPaper] = {}

    for metadata in data.get("metadatas", []):
        if not metadata:
            continue
        paper_id = str(metadata.get("paper_id", ""))
        if not paper_id:
            continue

        year_val = metadata.get("year")
        year = int(year_val) if year_val else None
        if year == 0:
            year = None

        status = metadata.get("status", "ready")
        if paper_id not in papers_map:
            papers_map[paper_id] = LibraryPaper(
                paper_id=paper_id,
                source=str(metadata.get("source", "")),
                external_id=str(metadata.get("external_id", "")),
                title=str(metadata.get("title", "")),
                authors=str(metadata.get("authors", "")),
                year=year,
                doi=str(metadata.get("doi", "")) or None,
                status=status if status in ("ready", "abstract_only") else "ready",
                chunk_count=1,
            )
        else:
            papers_map[paper_id].chunk_count += 1

    papers = sorted(papers_map.values(), key=lambda p: p.title.lower())
    return LibraryResponse(papers=papers)


@router.delete("/library/{paper_id:path}")
async def delete_paper(paper_id: str) -> dict[str, str]:
    collection = get_collection()
    existing = collection.get(where={"paper_id": paper_id})
    ids = existing.get("ids", [])
    if not ids:
        raise HTTPException(status_code=404, detail="Paper not found")
    collection.delete(ids=ids)
    return {"status": "deleted", "paper_id": paper_id}
