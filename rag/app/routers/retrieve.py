from __future__ import annotations

from fastapi import APIRouter

from app.models import RetrieveRequest, RetrieveResponse, RetrievedChunk
from app.services.chroma import get_collection
from app.services.embeddings import embed_query

router = APIRouter()


@router.post("/retrieve", response_model=RetrieveResponse)
async def retrieve_chunks(payload: RetrieveRequest) -> RetrieveResponse:
    collection = get_collection()
    query_embedding = embed_query(payload.query)

    where_filter = None
    if payload.paper_ids:
        if len(payload.paper_ids) == 1:
            where_filter = {"paper_id": payload.paper_ids[0]}
        else:
            where_filter = {"paper_id": {"$in": payload.paper_ids}}

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=payload.top_k,
        where=where_filter,
        include=["documents", "metadatas", "distances"],
    )

    chunks: list[RetrievedChunk] = []
    ids = results.get("ids", [[]])[0]
    documents = results.get("documents", [[]])[0]
    metadatas = results.get("metadatas", [[]])[0]
    distances = results.get("distances", [[]])[0]

    for chunk_id, document, metadata, distance in zip(ids, documents, metadatas, distances):
        if not metadata:
            continue
        score = 1 - float(distance) if distance is not None else 0.0
        page = metadata.get("page")
        chunks.append(
            RetrievedChunk(
                id=chunk_id,
                text=document or "",
                score=score,
                paper_id=str(metadata.get("paper_id", "")),
                source=str(metadata.get("source", "")),
                title=str(metadata.get("title", "")),
                authors=str(metadata.get("authors", "")),
                chunk_index=int(metadata.get("chunk_index", 0)),
                page=int(page) if page else None,
            )
        )

    return RetrieveResponse(chunks=chunks)
