from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import CurrentUserId
from app.config import settings
from app.db import ensure_database_schema, get_database_health
from app.repository import get_feed, get_recommendations, get_summary


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_database_schema()
    yield


app = FastAPI(title="analytics-service", lifespan=lifespan)

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
    return {"service": "analytics-service", "status": overall, "database": database}


@app.get("/api/analytics/me/summary")
def analytics_summary(current_user_id: CurrentUserId):
    return get_summary(current_user_id)


@app.get("/api/recommendations/me")
def recommendations(current_user_id: CurrentUserId):
    return {"recommendations": get_recommendations(current_user_id)}


@app.get("/api/feed/me")
def feed(current_user_id: CurrentUserId):
    return {"items": get_feed(current_user_id)}
