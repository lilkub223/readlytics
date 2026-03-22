from pathlib import Path

from psycopg import connect
from psycopg.rows import dict_row

from app.config import settings

SCHEMA_PATH = Path(__file__).resolve().parents[3] / "infra" / "docker" / "init.sql"
_schema_initialized = False


def get_connection():
    if settings.database_url:
        return connect(settings.database_url, row_factory=dict_row)

    return connect(
        host=settings.db_host,
        port=settings.db_port,
        user=settings.db_user,
        password=settings.db_password,
        dbname=settings.db_name,
        row_factory=dict_row,
    )


def ensure_database_schema():
    global _schema_initialized

    if _schema_initialized:
        return

    schema_sql = SCHEMA_PATH.read_text()

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(schema_sql)

    _schema_initialized = True


def get_database_health():
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return {"status": "ok"}
    except Exception as error:
        return {"status": "error", "message": str(error)}
