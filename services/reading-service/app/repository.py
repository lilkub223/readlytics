from datetime import date

from app.db import get_connection


def map_book(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "title": row["title"],
        "authors": row["authors"],
        "description": row["description"],
        "publishedYear": row["published_year"],
        "pageCount": row["page_count"],
        "coverImageUrl": row["cover_image_url"],
        "genres": row["genres"],
        "source": row["external_source"],
        "externalId": row["external_id"],
    }


def upsert_book(book: dict) -> dict:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO reading_service.books (
                    external_source,
                    external_id,
                    title,
                    authors,
                    description,
                    published_year,
                    page_count,
                    cover_image_url,
                    genres
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (external_source, external_id)
                DO UPDATE SET
                    title = EXCLUDED.title,
                    authors = EXCLUDED.authors,
                    description = COALESCE(EXCLUDED.description, reading_service.books.description),
                    published_year = COALESCE(EXCLUDED.published_year, reading_service.books.published_year),
                    page_count = COALESCE(EXCLUDED.page_count, reading_service.books.page_count),
                    cover_image_url = COALESCE(EXCLUDED.cover_image_url, reading_service.books.cover_image_url),
                    genres = CASE
                        WHEN EXCLUDED.genres = '{}'::text[] THEN reading_service.books.genres
                        ELSE EXCLUDED.genres
                    END
                RETURNING *
                """,
                (
                    book["external_source"],
                    book["external_id"],
                    book["title"],
                    book["authors"],
                    book.get("description"),
                    book.get("published_year"),
                    book.get("page_count"),
                    book.get("cover_image_url"),
                    book.get("genres", []),
                ),
            )
            row = cur.fetchone()
        conn.commit()
    return map_book(row)


def search_cached_books(query: str) -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM reading_service.books
                WHERE title ILIKE %s
                ORDER BY title
                LIMIT 10
                """,
                (f"%{query}%",),
            )
            rows = cur.fetchall()
    return [map_book(row) for row in rows]


def get_book(book_id: str) -> dict | None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM reading_service.books WHERE id = %s", (book_id,))
            row = cur.fetchone()
    return map_book(row) if row else None


def get_shelves_for_user(user_id: str) -> dict:
    grouped = {
        "want_to_read": [],
        "currently_reading": [],
        "finished": [],
        "did_not_finish": [],
    }

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    se.id,
                    se.status,
                    se.current_page,
                    se.started_at,
                    se.finished_at,
                    b.id AS book_id,
                    b.title,
                    b.authors,
                    b.cover_image_url
                FROM reading_service.shelf_entries se
                JOIN reading_service.books b ON b.id = se.book_id
                WHERE se.user_id = %s
                ORDER BY se.updated_at DESC
                """,
                (user_id,),
            )
            rows = cur.fetchall()

    for row in rows:
        grouped[row["status"]].append(
            {
                "entryId": str(row["id"]),
                "bookId": str(row["book_id"]),
                "title": row["title"],
                "authors": row["authors"],
                "coverImageUrl": row["cover_image_url"],
                "currentPage": row["current_page"],
                "startedAt": row["started_at"],
                "finishedAt": row["finished_at"],
            }
        )

    return grouped


def upsert_shelf_entry(user_id: str, book_id: str, status: str, current_page: int) -> dict:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO reading_service.shelf_entries (
                    user_id,
                    book_id,
                    status,
                    current_page,
                    started_at,
                    finished_at
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    CASE WHEN %s = 'currently_reading' THEN NOW() ELSE NULL END,
                    CASE WHEN %s = 'finished' THEN NOW() ELSE NULL END
                )
                ON CONFLICT (user_id, book_id)
                DO UPDATE SET
                    status = EXCLUDED.status,
                    current_page = EXCLUDED.current_page,
                    started_at = CASE
                        WHEN reading_service.shelf_entries.started_at IS NOT NULL THEN reading_service.shelf_entries.started_at
                        WHEN EXCLUDED.status = 'currently_reading' THEN NOW()
                        ELSE reading_service.shelf_entries.started_at
                    END,
                    finished_at = CASE
                        WHEN EXCLUDED.status = 'finished' THEN NOW()
                        ELSE reading_service.shelf_entries.finished_at
                    END,
                    updated_at = NOW()
                RETURNING *
                """,
                (user_id, book_id, status, current_page, status, status),
            )
            row = cur.fetchone()
        conn.commit()
    return {
        "entryId": str(row["id"]),
        "userId": row["user_id"],
        "bookId": str(row["book_id"]),
        "status": row["status"],
        "currentPage": row["current_page"],
        "startedAt": row["started_at"],
        "finishedAt": row["finished_at"],
    }


def update_progress(user_id: str, entry_id: str, current_page: int, minutes_read: int | None, session_date: str | None) -> dict | None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, book_id, status, current_page
                FROM reading_service.shelf_entries
                WHERE id = %s AND user_id = %s
                """,
                (entry_id, user_id),
            )
            existing_row = cur.fetchone()

            if not existing_row:
                conn.rollback()
                return None

            cur.execute(
                """
                UPDATE reading_service.shelf_entries
                SET
                    current_page = %s,
                    updated_at = NOW()
                WHERE id = %s AND user_id = %s
                RETURNING *
                """,
                (current_page, entry_id, user_id),
            )
            shelf_row = cur.fetchone()

            if minutes_read:
                cur.execute(
                    """
                    INSERT INTO reading_service.reading_sessions (
                        user_id,
                        book_id,
                        pages_read,
                        minutes_read,
                        session_date
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        user_id,
                        shelf_row["book_id"],
                        max(current_page - existing_row["current_page"], 1),
                        minutes_read,
                        session_date or date.today().isoformat(),
                    ),
                )

        conn.commit()

    return {
        "entryId": str(shelf_row["id"]),
        "bookId": str(shelf_row["book_id"]),
        "status": shelf_row["status"],
        "currentPage": shelf_row["current_page"],
    }


def upsert_review(user_id: str, book_id: str, rating: int, review_text: str | None) -> dict:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO reading_service.reviews (user_id, book_id, rating, review_text)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (user_id, book_id)
                DO UPDATE SET
                    rating = EXCLUDED.rating,
                    review_text = EXCLUDED.review_text,
                    updated_at = NOW()
                RETURNING *
                """,
                (user_id, book_id, rating, review_text),
            )
            row = cur.fetchone()
        conn.commit()
    return {
        "id": str(row["id"]),
        "userId": row["user_id"],
        "bookId": str(row["book_id"]),
        "rating": row["rating"],
        "reviewText": row["review_text"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def list_reviews(book_id: str) -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT user_id, rating, review_text, created_at, updated_at
                FROM reading_service.reviews
                WHERE book_id = %s
                ORDER BY updated_at DESC
                """,
                (book_id,),
            )
            rows = cur.fetchall()

    return [
        {
            "userId": row["user_id"],
            "rating": row["rating"],
            "reviewText": row["review_text"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        }
        for row in rows
    ]


def list_reviews_for_user(user_id: str, limit: int = 6) -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    r.id,
                    r.user_id,
                    r.book_id,
                    r.rating,
                    r.review_text,
                    r.created_at,
                    r.updated_at,
                    b.title,
                    b.authors,
                    b.cover_image_url
                FROM reading_service.reviews r
                JOIN reading_service.books b ON b.id = r.book_id
                WHERE r.user_id = %s
                ORDER BY r.updated_at DESC
                LIMIT %s
                """,
                (user_id, limit),
            )
            rows = cur.fetchall()

    return [
        {
            "id": str(row["id"]),
            "userId": row["user_id"],
            "bookId": str(row["book_id"]),
            "title": row["title"],
            "authors": row["authors"],
            "coverImageUrl": row["cover_image_url"],
            "rating": row["rating"],
            "reviewText": row["review_text"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"],
        }
        for row in rows
    ]
