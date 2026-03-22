import os


class Settings:
    port = int(os.getenv("PORT", "4003"))
    jwt_secret = os.getenv("JWT_SECRET", "dev-secret-change-me")
    database_url = os.getenv("DATABASE_URL")
    cors_origins = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGIN", "http://localhost:3000").split(",")
        if origin.strip()
    ]
    db_host = os.getenv("PGHOST", "localhost")
    db_port = int(os.getenv("PGPORT", "5432"))
    db_user = os.getenv("PGUSER", "postgres")
    db_password = os.getenv("PGPASSWORD", "postgres")
    db_name = os.getenv("PGDATABASE", "book_platform")


settings = Settings()
