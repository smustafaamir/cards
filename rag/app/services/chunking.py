from __future__ import annotations

from dataclasses import dataclass
from typing import List

from app.config import settings


@dataclass
class TextChunk:
    text: str
    chunk_index: int
    page: int | None = None


def chunk_text(text: str) -> List[TextChunk]:
    size = settings.chunk_size
    overlap = settings.chunk_overlap
    if not text.strip():
        return []

    chunks: List[TextChunk] = []
    start = 0
    index = 0

    while start < len(text):
        end = start + size
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(TextChunk(text=chunk, chunk_index=index))
            index += 1
        if end >= len(text):
            break
        start = max(end - overlap, start + 1)

    return chunks
