from fastapi import APIRouter

from app.services.chroma import ping_chroma

router = APIRouter()


@router.get("/health")
async def health() -> dict:
    chroma_ok = ping_chroma()
    return {
        "status": "ok" if chroma_ok else "degraded",
        "chroma": chroma_ok,
    }
