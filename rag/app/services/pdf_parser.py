from __future__ import annotations

from typing import List

import fitz

from app.services.chunking import TextChunk, chunk_text


def extract_text_from_pdf(pdf_bytes: bytes) -> tuple[str, List[TextChunk]]:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page_texts: List[str] = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        page_texts.append(page.get_text("text"))

    doc.close()
    full_text = "\n\n".join(page_texts).strip()

    chunks: List[TextChunk] = []
    for page_num, page_text in enumerate(page_texts):
        page_chunks = chunk_text(page_text)
        for chunk in page_chunks:
            chunks.append(
                TextChunk(
                    text=chunk.text,
                    chunk_index=len(chunks),
                    page=page_num + 1,
                )
            )

    if not chunks and full_text:
        chunks = chunk_text(full_text)

    return full_text, chunks
