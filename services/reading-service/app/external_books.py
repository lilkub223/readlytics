import json
from urllib.error import URLError
from urllib.parse import quote
from urllib.request import urlopen


def _build_cover_url(cover_id: int | None) -> str | None:
    if not cover_id:
        return None
    return f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"


def search_open_library(query: str) -> list[dict]:
    url = f"https://openlibrary.org/search.json?q={quote(query)}&limit=10"

    try:
        with urlopen(url, timeout=5) as response:
            payload = json.load(response)
    except (TimeoutError, URLError, json.JSONDecodeError):
        return []

    results = []

    for doc in payload.get("docs", []):
        external_id = doc.get("key")

        if not external_id or not doc.get("title"):
            continue

        results.append(
            {
                "external_source": "open-library",
                "external_id": external_id,
                "title": doc.get("title"),
                "authors": doc.get("author_name") or [],
                "description": None,
                "published_year": doc.get("first_publish_year"),
                "page_count": doc.get("number_of_pages_median"),
                "cover_image_url": _build_cover_url(doc.get("cover_i")),
                "genres": doc.get("subject", [])[:5],
            }
        )

    return results
