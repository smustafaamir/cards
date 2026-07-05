from __future__ import annotations

import logging
import re
from urllib.parse import quote

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


def _ncbi_params() -> dict[str, str]:
    params: dict[str, str] = {
        "tool": settings.ncbi_tool,
        "email": settings.ncbi_email,
    }
    if settings.ncbi_api_key:
        params["api_key"] = settings.ncbi_api_key
    return params


async def fetch_arxiv_pdf(external_id: str) -> bytes:
    url = f"https://arxiv.org/pdf/{quote(external_id)}.pdf"
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        response = await client.get(url)
        response.raise_for_status()
        return response.content


async def fetch_url_pdf(pdf_url: str) -> bytes:
    async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
        response = await client.get(pdf_url)
        response.raise_for_status()
        return response.content


async def fetch_pubmed_pmc_pdf(pmid: str) -> bytes | None:
    params = {"dbfrom": "pubmed", "db": "pmc", "id": pmid, **_ncbi_params()}
    async with httpx.AsyncClient(timeout=30.0) as client:
        link_response = await client.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/elink.fcgi",
            params={**params, "retmode": "json"},
        )
        link_response.raise_for_status()
        link_data = link_response.json()

        linksets = link_data.get("linksets", [])
        pmc_ids: list[str] = []
        for linkset in linksets:
            for linksetdb in linkset.get("linksetdbs", []):
                if linksetdb.get("dbto") == "pmc":
                    for link in linksetdb.get("links", []):
                        pmc_ids.append(str(link))

        if not pmc_ids:
            return None

        pmc_id = pmc_ids[0]
        pdf_url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC{pmc_id}/pdf/"
        pdf_response = await client.get(pdf_url, follow_redirects=True)
        if pdf_response.status_code != 200:
            return None
        content_type = pdf_response.headers.get("content-type", "")
        if "pdf" not in content_type.lower():
            return None
        return pdf_response.content


async def fetch_pubmed_abstract(pmid: str) -> str | None:
    params = {"db": "pubmed", "id": pmid, "retmode": "xml", **_ncbi_params()}
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi",
            params=params,
        )
        response.raise_for_status()
        xml = response.text
        match = re.search(r"<AbstractText[^>]*>([\s\S]*?)</AbstractText>", xml)
        if not match:
            return None
        text = re.sub(r"<[^>]+>", " ", match.group(1))
        return " ".join(text.split()).strip() or None


async def fetch_content(
    source: str,
    external_id: str,
    pdf_url: str | None = None,
    text: str | None = None,
) -> tuple[str | None, bytes | None, bool]:
    """Returns (text_content, pdf_bytes, full_text_available)."""
    if text and text.strip():
        return text.strip(), None, False

    try:
        if source == "arxiv":
            return None, await fetch_arxiv_pdf(external_id), True
        if source == "core" and pdf_url:
            return None, await fetch_url_pdf(pdf_url), True
        if source == "pubmed":
            pdf_bytes = await fetch_pubmed_pmc_pdf(external_id)
            if pdf_bytes:
                return None, pdf_bytes, True
            abstract = text or await fetch_pubmed_abstract(external_id)
            return abstract, None, False
        if pdf_url:
            return None, await fetch_url_pdf(pdf_url), True
    except Exception as exc:
        logger.warning("Failed to fetch content for %s:%s - %s", source, external_id, exc)

    return text, None, False
