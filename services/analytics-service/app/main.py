from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="analytics-service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"service": "analytics-service", "status": "ok"}


@app.get("/api/analytics/me/summary")
def analytics_summary():
    return {
        "booksFinished": 12,
        "pagesReadTotal": 4380,
        "averageRating": 4.25,
        "currentStreakDays": 6,
        "favoriteGenres": ["science fiction", "literary fiction"],
    }


@app.get("/api/recommendations/me")
def recommendations():
    return {
        "recommendations": [
            {
                "bookId": "book-42",
                "title": "Kindred",
                "reason": "Popular with readers who liked speculative historical fiction.",
                "score": 92.4,
            }
        ],
    }


@app.get("/api/feed/me")
def feed():
    return {
        "items": [
            {
                "type": "review_created",
                "actorUsername": "genrehunter",
                "message": "genrehunter reviewed Kindred",
            }
        ],
    }
