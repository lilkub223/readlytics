from typing import Literal

from fastapi import FastAPI, Query
from pydantic import BaseModel


class ShelfEntryPayload(BaseModel):
    bookId: str
    status: Literal["want_to_read", "currently_reading", "finished", "did_not_finish"]
    currentPage: int = 0


class ProgressPayload(BaseModel):
    currentPage: int
    minutesRead: int | None = None
    sessionDate: str | None = None


class ReviewPayload(BaseModel):
    bookId: str
    rating: int
    reviewText: str | None = None

app = FastAPI(title="reading-service")


@app.get("/health")
def health():
    return {"service": "reading-service", "status": "ok"}


@app.get("/api/books/search")
def search_books(q: str = Query(..., min_length=1)):
    return {
        "query": q,
        "results": [
            {
                "id": "book-1",
                "title": "The Left Hand of Darkness",
                "authors": ["Ursula K. Le Guin"],
                "source": "open-library",
            }
        ],
    }


@app.get("/api/books/{book_id}")
def get_book(book_id: str):
    return {
        "id": book_id,
        "title": "Demo Book",
        "authors": ["Demo Author"],
        "description": "Book detail endpoint scaffolded.",
    }


@app.get("/api/shelves/me")
def get_my_shelves():
    return {
        "want_to_read": [{"bookId": "book-1", "title": "Demo Book"}],
        "currently_reading": [],
        "finished": [],
        "did_not_finish": [],
    }


@app.post("/api/shelves")
def upsert_shelf_entry(payload: ShelfEntryPayload):
    return {
        "message": "Shelf entry endpoint scaffolded.",
        "entry": payload.model_dump(),
    }


@app.patch("/api/shelves/{entry_id}/progress")
def update_progress(entry_id: str, payload: ProgressPayload):
    return {
        "message": "Progress endpoint scaffolded.",
        "entryId": entry_id,
        "progress": payload.model_dump(),
    }


@app.post("/api/reviews")
def create_review(payload: ReviewPayload):
    return {
        "message": "Review endpoint scaffolded.",
        "review": payload.model_dump(),
    }


@app.get("/api/reviews/book/{book_id}")
def list_reviews(book_id: str):
    return {
        "bookId": book_id,
        "reviews": [
            {
                "userId": "demo-user-1",
                "rating": 5,
                "reviewText": "Thoughtful and atmospheric.",
            }
        ],
    }
