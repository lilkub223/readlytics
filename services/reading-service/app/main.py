from fastapi import FastAPI

app = FastAPI(title="reading-service")


@app.get("/health")
def health():
    return {"service": "reading-service", "status": "ok"}


@app.get("/api/books")
def books():
    return {
        "message": "Reading service scaffold is running.",
        "next_step": "Add book search, shelves, progress, and review endpoints.",
    }

