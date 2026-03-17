from collections import Counter
from datetime import date, timedelta

from app.db import get_connection


def _calculate_streak(session_dates: list[date]) -> int:
    if not session_dates:
        return 0

    sorted_dates = sorted(set(session_dates), reverse=True)
    today = date.today()

    if sorted_dates[0] not in {today, today - timedelta(days=1)}:
        return 0

    streak = 0
    expected = sorted_dates[0]

    for session_day in sorted_dates:
        if session_day == expected:
            streak += 1
            expected = expected - timedelta(days=1)
        elif session_day < expected:
            break

    return streak


def get_summary(user_id: str) -> dict:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    COALESCE((
                        SELECT COUNT(*)
                        FROM reading_service.shelf_entries
                        WHERE user_id = %s AND status = 'finished'
                    ), 0) AS books_finished,
                    COALESCE((
                        SELECT SUM(pages_read)
                        FROM reading_service.reading_sessions
                        WHERE user_id = %s
                    ), 0) AS pages_read_total,
                    (
                        SELECT ROUND(AVG(rating)::numeric, 2)
                        FROM reading_service.reviews
                        WHERE user_id = %s
                    ) AS average_rating
                """,
                (user_id, user_id, user_id),
            )
            metric_row = cur.fetchone()

            cur.execute(
                """
                SELECT DISTINCT session_date
                FROM reading_service.reading_sessions
                WHERE user_id = %s
                ORDER BY session_date DESC
                """,
                (user_id,),
            )
            session_rows = cur.fetchall()

            cur.execute(
                """
                SELECT genre
                FROM (
                    SELECT unnest(b.genres) AS genre
                    FROM reading_service.shelf_entries se
                    JOIN reading_service.books b ON b.id = se.book_id
                    WHERE se.user_id = %s

                    UNION ALL

                    SELECT unnest(b.genres) AS genre
                    FROM reading_service.reviews r
                    JOIN reading_service.books b ON b.id = r.book_id
                    WHERE r.user_id = %s
                ) genre_rows
                WHERE genre IS NOT NULL AND genre <> ''
                GROUP BY genre
                ORDER BY COUNT(*) DESC, genre
                LIMIT 3
                """,
                (user_id, user_id),
            )
            genre_rows = cur.fetchall()

    session_dates = [row["session_date"] for row in session_rows]
    average_rating = metric_row["average_rating"]

    return {
        "booksFinished": metric_row["books_finished"],
        "pagesReadTotal": metric_row["pages_read_total"],
        "averageRating": float(average_rating) if average_rating is not None else None,
        "currentStreakDays": _calculate_streak(session_dates),
        "favoriteGenres": [row["genre"] for row in genre_rows],
    }


def get_recommendations(user_id: str) -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    b.id,
                    b.title,
                    b.authors,
                    b.genres,
                    b.cover_image_url,
                    b.created_at,
                    r.rating,
                    se.status
                FROM reading_service.books b
                LEFT JOIN reading_service.reviews r
                    ON r.book_id = b.id AND r.user_id = %s
                LEFT JOIN reading_service.shelf_entries se
                    ON se.book_id = b.id AND se.user_id = %s
                WHERE r.user_id IS NOT NULL OR se.user_id IS NOT NULL
                """,
                (user_id, user_id),
            )
            preference_rows = cur.fetchall()

            cur.execute(
                """
                SELECT *
                FROM reading_service.books b
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM reading_service.shelf_entries se
                    WHERE se.user_id = %s AND se.book_id = b.id
                )
                ORDER BY b.created_at DESC
                LIMIT 50
                """,
                (user_id,),
            )
            candidate_rows = cur.fetchall()

    author_weights = Counter()
    genre_weights = Counter()

    for row in preference_rows:
        weight = 1

        if row["status"] == "finished":
            weight += 4
        elif row["status"] == "currently_reading":
            weight += 3
        elif row["status"] == "want_to_read":
            weight += 1

        if row["rating"] and row["rating"] >= 4:
            weight += int(row["rating"])

        for author in row["authors"] or []:
            author_weights[author] += weight

        for genre in row["genres"] or []:
            genre_weights[genre] += weight

    recommendations = []

    for row in candidate_rows:
        shared_authors = [author for author in row["authors"] or [] if author in author_weights]
        shared_genres = [genre for genre in row["genres"] or [] if genre in genre_weights]
        score = sum(author_weights[author] for author in shared_authors) * 2 + sum(
            genre_weights[genre] for genre in shared_genres
        )

        if shared_authors:
            reason = f"Because you recently read books by {shared_authors[0]}."
        elif shared_genres:
            reason = f"Because you often read {shared_genres[0]}."
        elif not preference_rows:
            score = 40
            reason = "Fresh pick from books you recently searched."
        else:
            continue

        recommendations.append(
            {
                "bookId": str(row["id"]),
                "title": row["title"],
                "reason": reason,
                "score": round(min(99.0, float(score)), 1),
                "coverImageUrl": row["cover_image_url"],
            }
        )

    recommendations.sort(key=lambda item: (-item["score"], item["title"]))
    return recommendations[:5]


def get_feed(user_id: str) -> list[dict]:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT *
                FROM (
                    SELECT
                        'review_created' AS event_type,
                        u.username AS actor_username,
                        b.title AS book_title,
                        r.updated_at AS created_at
                    FROM user_service.follows f
                    JOIN user_service.users u ON u.id = f.followed_id
                    JOIN reading_service.reviews r ON r.user_id = f.followed_id
                    JOIN reading_service.books b ON b.id = r.book_id
                    WHERE f.follower_id = %s

                    UNION ALL

                    SELECT
                        'book_finished' AS event_type,
                        u.username AS actor_username,
                        b.title AS book_title,
                        se.finished_at AS created_at
                    FROM user_service.follows f
                    JOIN user_service.users u ON u.id = f.followed_id
                    JOIN reading_service.shelf_entries se ON se.user_id = f.followed_id
                    JOIN reading_service.books b ON b.id = se.book_id
                    WHERE f.follower_id = %s
                      AND se.status = 'finished'
                      AND se.finished_at IS NOT NULL
                ) feed_rows
                ORDER BY created_at DESC
                LIMIT 20
                """,
                (user_id, user_id),
            )
            rows = cur.fetchall()

    items = []

    for row in rows:
        if row["event_type"] == "review_created":
            message = f'{row["actor_username"]} reviewed {row["book_title"]}'
        else:
            message = f'{row["actor_username"]} finished {row["book_title"]}'

        items.append(
            {
                "type": row["event_type"],
                "actorUsername": row["actor_username"],
                "message": message,
                "createdAt": row["created_at"],
            }
        )

    return items
