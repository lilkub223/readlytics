# Running and verifying Readlytics

Use Node 20.20+ and Python 3.11 (the tested local Python runtime was 3.10). Install dependencies from the committed lockfiles. No production accounts or databases are needed for local QA.

## Normal development with PostgreSQL

From this repository root, with Docker Desktop running:

```sh
docker compose up --build
```

Open http://localhost:3000. Backend health endpoints are on ports 4001, 4002, and 4003 at `/health`.

Backend Docker builds now use the repository root as their build context, including the shared schema at `infra/docker/init.sql`. The database uses a named volume. Do not use `docker compose down -v` unless you intend to delete that local database. The schema initialization is additive (`CREATE ... IF NOT EXISTS`); this change does not reset users, password hashes, shelves, follows, reviews, or sessions.

For separate local processes, install dependencies:

```sh
npm --prefix frontend ci
npm --prefix services/user-service ci
python3 -m venv .venv
.venv/bin/pip install -r services/reading-service/requirements.txt -r services/requirements-dev.txt
```

The analytics service currently uses the same pinned Python dependencies as reading. All services must use the same `JWT_SECRET` and database settings. Start the services from their own directories, as described in the README. Frontend defaults to localhost ports in development. Start Vite with:

```sh
npm --prefix frontend run dev -- --host 127.0.0.1 --port 3000
```

## Disposable QA without Docker

The `qa/` package supplies an in-memory PGlite PostgreSQL engine through a localhost socket. Production services still use PostgreSQL through pg/psycopg; PGlite is a test tool only. It is not a replacement for validating Docker/PostgreSQL 16 before release. Its single-engine connection multiplexing also does not prove real multi-connection concurrency behavior.

Install the Node/Python dependencies above, plus:

```sh
npm --prefix qa ci
```

Start each of these in a separate terminal from the repository root:

```sh
npm --prefix qa run db
.venv/bin/python qa/start-services.py
npm --prefix frontend run dev -- --host 127.0.0.1 --port 3000
```

After all three APIs have started, seed the isolated catalog:

```sh
.venv/bin/python qa/seed.py
```

The QA database is fixed to port 55432. `qa/start-services.py` removes any inherited `DATABASE_URL`, overwrites the database configuration, and uses a test-only JWT secret. Test accounts and fixture books are created only in this disposable database. Stopping the database process discards the QA data.

## Automated checks

```sh
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix services/user-service test
PYTHONPATH=services/reading-service .venv/bin/python -m pytest services/reading-service/tests -q
PYTHONPATH=services/analytics-service .venv/bin/python -m pytest services/analytics-service/tests -q
```

With the isolated QA stack running:

```sh
.venv/bin/python -m pytest qa/test_full_stack.py -q
cd frontend
npx playwright install chromium
npm run test:e2e
```

If Chromium is already installed elsewhere, set `PLAYWRIGHT_CHROMIUM_PATH` to its executable. Browser test results go to `output/playwright-results.json`; full-page screenshots go to `output/`. Failed browser tests retain a Playwright trace. Do not share traces from real account sessions: traces can contain authentication headers and form data. Repository ignores the generated QA artifacts.

The Jenkins pipeline runs the frontend tests/build, Node authentication tests, and both Python unit suites. Browser/API integration tests require the isolated running stack and are run separately.
