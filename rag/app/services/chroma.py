from __future__ import annotations

import chromadb
from chromadb.api.models.Collection import Collection

from app.config import settings

_client: chromadb.HttpClient | None = None
_collection: Collection | None = None


def get_chroma_client() -> chromadb.HttpClient:
    global _client
    if _client is None:
        _client = chromadb.HttpClient(
            host=settings.chroma_host,
            port=settings.chroma_port,
        )
    return _client


def get_collection() -> Collection:
    global _collection
    if _collection is None:
        client = get_chroma_client()
        _collection = client.get_or_create_collection(
            name=settings.collection_name,
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def ping_chroma() -> bool:
    try:
        client = get_chroma_client()
        client.heartbeat()
        return True
    except Exception:
        return False
