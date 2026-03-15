from fastapi import FastAPI

app = FastAPI(title="analytics-service")


@app.get("/health")
def health():
    return {"service": "analytics-service", "status": "ok"}


@app.get("/api/analytics")
def analytics():
    return {
        "message": "Analytics service scaffold is running.",
        "next_step": "Add dashboard summaries, recommendations, and event consumers.",
    }

