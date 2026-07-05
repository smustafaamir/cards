from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


SourceType = Literal["arxiv", "pubmed", "core"]


class IngestRequest(BaseModel):
    source: SourceType
    external_id: str
    title: str
    authors: list[str] = Field(default_factory=list)
    year: int | None = None
    abstract: str | None = None
    pdf_url: str | None = None
    doi: str | None = None
    text: str | None = None


class IngestResponse(BaseModel):
    paper_id: str
    status: Literal["ready", "abstract_only", "error"]
    chunk_count: int = 0
    message: str | None = None


class RetrieveRequest(BaseModel):
    query: str
    top_k: int = 5
    paper_ids: list[str] | None = None


class RetrievedChunk(BaseModel):
    id: str
    text: str
    score: float
    paper_id: str
    source: str
    title: str
    authors: str
    chunk_index: int
    page: int | None = None


class RetrieveResponse(BaseModel):
    chunks: list[RetrievedChunk]


class LibraryPaper(BaseModel):
    paper_id: str
    source: str
    external_id: str
    title: str
    authors: str
    year: int | None = None
    doi: str | None = None
    status: Literal["ready", "abstract_only"]
    chunk_count: int


class LibraryResponse(BaseModel):
    papers: list[LibraryPaper]
