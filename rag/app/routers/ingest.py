from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from app.models import IngestRequest, IngestResponse
from app.services.chunking import TextChunk, chunk_text
from app.services.chroma import get_collection
from app.services.embeddings import embed_texts
from app.services.fetchers import fetch_content
from app.services.pdf_parser import extract_text_from_pdf

logger = logging.getLogger(__name__)
router = APIRouter()


def make_paper_id(source: str, external_id: str) -> str:
    return f"{source}:{external_id}"


@router.post("/ingest", response_model=IngestResponse)
async def ingest_paper(payload: IngestRequest) -> IngestResponse:
    paper_id = make_paper_id(payload.source, payload.external_id)
    authors_str = ", ".join(payload.authors)

    text_content, pdf_bytes, full_text = await fetch_content(
        source=payload.source,
        external_id=payload.external_id,
        pdf_url=payload.pdf_url,
        text=payload.text or payload.abstract,
    )

    chunks: list[TextChunk] = []

    if pdf_bytes:
        try:
            _, chunks = extract_text_from_pdf(pdf_bytes)
            full_text = True
        except Exception as exc:
            logger.exception("PDF parse failed for %s", paper_id)
            if not text_content:
                raise HTTPException(status_code=422, detail=f"PDF parse failed: {exc}") from exc

    if not chunks and text_content:
        chunks = chunk_text(text_content)
        full_text = False

    if not chunks:
        return IngestResponse(
            paper_id=paper_id,
            status="error",
            chunk_count=0,
            message="No text content available to ingest.",
        )

    collection = get_collection()

    existing = collection.get(where={"paper_id": paper_id})
    if existing["ids"]:
        collection.delete(ids=existing["ids"])

    texts = [chunk.text for chunk in chunks]
    embeddings = embed_texts(texts)

    ids = [f"{paper_id}:{chunk.chunk_index}" for chunk in chunks]
    metadatas = [
        {
            "paper_id": paper_id,
            "source": payload.source,
            "external_id": payload.external_id,
            "title": payload.title,
            "authors": authors_str,
            "year": payload.year or 0,
            "doi": payload.doi or "",
            "chunk_index": chunk.chunk_index,
            "page": chunk.page or 0,
            "status": "ready" if full_text else "abstract_only",
        }
        for chunk in chunks
    ]

    collection.add(
        ids=ids,
        documents=texts,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    status = "ready" if full_text else "abstract_only"
    return IngestResponse(
        paper_id=paper_id,
        status=status,
        chunk_count=len(chunks),
        message=None if full_text else "Only abstract text was available for this paper.",
    )
