from contextlib import asynccontextmanager
from typing import Literal
from datetime import date
from uuid import UUID

from fastapi.responses import JSONResponse
from psycopg import OperationalError, InterfaceError
from psycopg.errors import QueryCanceled

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

from app.auth import CurrentUserId
from app.config import settings
from app.db import ensure_database_schema, get_database_health
from app.external_books import search_open_library, UpstreamUnavailable, get_work_description
from app.repository import (
    cache_description,
    delete_review,
    delete_shelf_entry,
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
    bookId: UUID
    status: Literal["want_to_read", "currently_reading", "finished", "did_not_finish"]
    currentPage: int = Field(default=0, ge=0)


class ProgressPayload(BaseModel):
    currentPage: int = Field(ge=0)
    minutesRead: int | None = Field(default=None, gt=0)
    sessionDate: date | None = None

    @field_validator("sessionDate")
    @classmethod
    def not_future(cls, value):
        if value and value > date.today():
            raise ValueError("Session date cannot be in the future.")
        return value


class ReviewPayload(BaseModel):
    bookId: UUID
    rating: int = Field(ge=1, le=5)
    reviewText: str | None = Field(default=None, max_length=10000)


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
    return JSONResponse(status_code=200 if overall == "ok" else 503, content={"service": "reading-service", "status": overall, "database": database})


@app.get("/api/books/search")
def search_books(q: str = Query(..., min_length=1, max_length=200), page: int = Query(1, ge=1, le=100)):
    q = q.strip()
    if not q:
        raise HTTPException(status_code=422, detail="Enter a title or author.")
    cached_results = search_cached_books(q) if page == 1 else []
    warning = None
    try:
        external_results = search_open_library(q, page)
    except UpstreamUnavailable:
        if not cached_results:
            raise HTTPException(status_code=503, detail="Open Library is temporarily unavailable. Please try again.")
        external_results = []
        warning = "Open Library is unavailable. Showing cached matches."

    seen_pairs = {(book["source"], book["externalId"]) for book in cached_results}
    results = list(cached_results)

    for external_book in external_results:
        if (external_book["external_source"], external_book["external_id"]) in seen_pairs:
            continue
        persisted = upsert_book(external_book)
        results.append(persisted)
        seen_pairs.add((persisted["source"], persisted["externalId"]))

    return {"query": q, "page": page, "results": results, "hasMore": len(external_results) == 10, "warning": warning}


@app.get("/api/books/{book_id}")
def get_book_details(book_id: UUID):
    book = get_book(book_id)

    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found.")

    if not book.get("description") and book.get("source") == "open-library":
        description = get_work_description(book.get("externalId", ""))
        if description:
            cache_description(book_id, description)
            book["description"] = description
    return book


@app.get("/api/shelves/me")
def get_my_shelves(current_user_id: CurrentUserId):
    return get_shelves_for_user(current_user_id)


@app.post("/api/shelves")
def create_or_update_shelf_entry(payload: ShelfEntryPayload, current_user_id: CurrentUserId):
    book = get_book(payload.bookId)

    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found.")

    if (book.get("pageCount") or 0) > 0 and payload.currentPage > book["pageCount"]:
        raise HTTPException(status_code=422, detail="Current page cannot exceed the total page count.")

    return {
        "message": "Shelf entry saved.",
        "entry": upsert_shelf_entry(current_user_id, payload.bookId, payload.status, payload.currentPage),
    }


@app.patch("/api/shelves/{entry_id}/progress")
def patch_progress(entry_id: UUID, payload: ProgressPayload, current_user_id: CurrentUserId):
    entry = update_progress(
        current_user_id,
        entry_id,
        payload.currentPage,
        payload.minutesRead,
        payload.sessionDate.isoformat() if payload.sessionDate else None,
    )

    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelf entry not found.")

    return {"message": "Progress updated.", "entry": entry}


@app.delete("/api/shelves/{entry_id}")
def remove_shelf_entry(entry_id: UUID, current_user_id: CurrentUserId):
    deleted = delete_shelf_entry(current_user_id, entry_id)

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shelf entry not found.")

    return {"message": "Shelf entry removed."}


@app.post("/api/reviews")
def create_or_update_review(payload: ReviewPayload, current_user_id: CurrentUserId):
    book = get_book(payload.bookId)

    if not book:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Book not found.")

    return {
        "message": "Review saved.",
        "review": upsert_review(current_user_id, payload.bookId, payload.rating, payload.reviewText),
    }


@app.delete("/api/reviews/{review_id}")
def remove_review(review_id: UUID, current_user_id: CurrentUserId):
    deleted = delete_review(current_user_id, review_id)

    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found.")

    return {"message": "Review removed."}


@app.get("/api/reviews/book/{book_id}")
def get_book_reviews(book_id: UUID):
    return {"bookId": book_id, "reviews": list_reviews(book_id)}


@app.get("/api/reviews/me")
def get_my_reviews(current_user_id: CurrentUserId):
    return {"userId": current_user_id, "reviews": list_reviews_for_user(current_user_id)}


@app.get("/api/reviews/users/{user_id}")
def get_reviews_for_user(user_id: UUID):
    return {"userId": user_id, "reviews": list_reviews_for_user(user_id)}


@app.exception_handler(QueryCanceled)
@app.exception_handler(OperationalError)
@app.exception_handler(InterfaceError)
async def database_unavailable(_request, _error):
    return JSONResponse(status_code=503, content={"detail": "Database temporarily unavailable. Please try again."})


@app.exception_handler(ValueError)
async def invalid_progress(_request, error):
    return JSONResponse(status_code=422, content={"detail": str(error)})
