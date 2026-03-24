from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.auth import CurrentUserId
from app.config import settings
from app.db import ensure_database_schema, get_database_health
from app.external_books import search_open_library
from app.repository import (
    get_book,
    get_shelves_for_user,
    list_reviews,
    list_reviews_for_user,
    search_cached_books,
    upsert_book,
    upsert_review,
    upsert_shelf_entry,
    update_progress,
)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_database_schema()
    yield


class ShelfEntryPayload(BaseModel):
    bookId: str
    status: Literal["want_to_read", "currently_reading", "finished", "did_not_finish"]
    currentPage: int = Field(default=0, ge=0)


class ProgressPayload(BaseModel):
    currentPage: int = Field(ge=0)
    minutesRead: int | None = Field(default=None, gt=0)
    sessionDate: str | None = None


class ReviewPayload(BaseModel):
    bookId: str
    rating: int = Field(ge=1, le=5)
    reviewText: str | None = None


app = FastAPI(title="reading-service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    database = get_database_health()
    overall = "ok" if database["status"] == "ok" else "degraded"
    return {"service": "reading-service", "status": overall, "database": database}


@app.get("/api/books/search")
def search_books(q: str = Query(..., min_length=1)):
    cached_results = search_cached_books(q)
    external_results = search_open_library(q)

    seen_pairs = {(book["source"], book["externalId"]) for book in cached_results}
    results = list(cached_results)

    for external_book in external_results:
        if (external_book["external_source"], external_book["external_id"]) in seen_pairs:
            continue
        persisted = upsert_book(external_book)
        results.append(persisted)

    return {"query": q, "results": results[:10]}


@app.get("/api/books/{book_id}")
def get_book_details(book_id: str):
    book = get_book(book_id)

    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found.")

    return book


@app.get("/api/shelves/me")
def get_my_shelves(current_user_id: CurrentUserId):
    return get_shelves_for_user(current_user_id)


@app.post("/api/shelves")
def create_or_update_shelf_entry(payload: ShelfEntryPayload, current_user_id: CurrentUserId):
    book = get_book(payload.bookId)

    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found.")

    return {
        "message": "Shelf entry saved.",
        "entry": upsert_shelf_entry(current_user_id, payload.bookId, payload.status, payload.currentPage),
    }


@app.patch("/api/shelves/{entry_id}/progress")
def patch_progress(entry_id: str, payload: ProgressPayload, current_user_id: CurrentUserId):
    entry = update_progress(
        current_user_id,
        entry_id,
        payload.currentPage,
        payload.minutesRead,
        payload.sessionDate,
    )

    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelf entry not found.")

    return {"message": "Progress updated.", "entry": entry}


@app.post("/api/reviews")
def create_or_update_review(payload: ReviewPayload, current_user_id: CurrentUserId):
    book = get_book(payload.bookId)

    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found.")

    return {
        "message": "Review saved.",
        "review": upsert_review(current_user_id, payload.bookId, payload.rating, payload.reviewText),
    }


@app.get("/api/reviews/book/{book_id}")
def get_book_reviews(book_id: str):
    return {"bookId": book_id, "reviews": list_reviews(book_id)}


@app.get("/api/reviews/me")
def get_my_reviews(current_user_id: CurrentUserId):
    return {"userId": current_user_id, "reviews": list_reviews_for_user(current_user_id)}


@app.get("/api/reviews/users/{user_id}")
def get_reviews_for_user(user_id: str):
    return {"userId": user_id, "reviews": list_reviews_for_user(user_id)}
