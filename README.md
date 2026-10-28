# Readlytics

Readlytics is a full-stack social book-tracking app. It combines a React frontend with Node.js and Python microservices so readers can organize shelves, track progress, review books, follow other readers, and get personalized recommendations.

## Live App

- Live site: [https://readlytics-web.onrender.com](https://readlytics-web.onrender.com)
- Repository: [https://github.com/lilkub223/readlytics](https://github.com/lilkub223/readlytics)

## Highlights

- Frontend development with React, JavaScript, HTML, and CSS
- API design and integration across multiple backend services
- Microservice boundaries using Node.js and Python
- PostgreSQL data modeling and authenticated service behavior
- Jenkins-based CI validation for frontend and service checks
- Docker-based local orchestration
- Cloud deployment with Render
- Git-based workflow in a Linux/Unix-style development environment

## Current Features

- User registration and login with JWT-based authentication
- Multi-page product UI with dedicated About, Features, Dashboard, Discover, Community, Login, and Register views
- Book search powered by the Open Library API
- Shelves for `Want to Read`, `Currently Reading`, `Finished`, and `Did Not Finish`
- Shelf management from the dashboard, including moving books between shelves and removing entries
- Reading progress updates for `Currently Reading`
- Ratings and quick reviews with recent-review management
- Personalized reading dashboard with summary analytics
- Personalized recommendations
- Follow/unfollow community flow with profile lookups and reader activity feed

## Architecture

Readlytics is split into focused services:

| Service | Tech | Responsibility | Port |
| --- | --- | --- | --- |
| Frontend | React + Vite | Product UI and client-side navigation | `3000` |
| User Service | Node.js + Express | Authentication, profiles, and user relationships | `4001` |
| Reading Service | Python + FastAPI | Book search, shelves, reading progress, ratings, and reviews | `4002` |
| Analytics Service | Python + FastAPI | Reading analytics, recommendations, and activity feed endpoints | `4003` |
| PostgreSQL | Postgres 16 | Primary application database | `5432` |
| RabbitMQ | RabbitMQ | Included in local infrastructure for planned event-driven extensions | `5672`, `15672` |

## Tech Stack

### Frontend

- React
- JavaScript
- Vite
- CSS

### Backend

- Node.js
- Express
- Python
- FastAPI

### Data and Infrastructure

- PostgreSQL
- RabbitMQ
- Docker Compose
- Jenkins
- Git

## Getting Started

### Option 1: Run Everything with Docker

From the project root:

```bash
docker compose up --build
```

Then open:

- Frontend: [http://localhost:3000](http://localhost:3000)
- User service health: [http://localhost:4001/health](http://localhost:4001/health)
- Reading service health: [http://localhost:4002/health](http://localhost:4002/health)
- Analytics service health: [http://localhost:4003/health](http://localhost:4003/health)

To stop the stack:

```bash
docker compose down
```

### Option 2: Run the App in Local Dev Mode

Start infrastructure first:

```bash
docker compose up -d postgres rabbitmq
```

Start the frontend:

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```

Start the user service:

```bash
cd services/user-service
npm install
npm run dev
```

Start the reading service:

```bash
cd services/reading-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 4002
```

Start the analytics service:

```bash
cd services/analytics-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 4003
```

## Deployment

Readlytics is deployed on [Render](https://render.com/) with the Blueprint file at [`render.yaml`](render.yaml).

### Render Deployment Flow

1. Push the latest `main` branch to GitHub.
2. In Render, choose `New` -> `Blueprint`.
3. Connect the `lilkub223/readlytics` repository.
4. Render will detect [`render.yaml`](render.yaml) and propose:
   - one static frontend
   - three free web services
   - one free Postgres database
5. Review the service names and deploy.

The frontend receives live backend URLs through Render environment variables, and each backend service initializes the shared Postgres schema on startup.

### Frontend Environment Variables

The frontend uses these variables at build time:

- `VITE_USER_SERVICE_URL`
- `VITE_READING_SERVICE_URL`
- `VITE_ANALYTICS_SERVICE_URL`

For local development, the app falls back to localhost ports automatically. In Render, these are populated from the Blueprint.

### Backend Environment Variables

Each backend service supports:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`

In Render, the Blueprint sets these for you. For local development, the services can still run with the Postgres `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE` variables.

### Render Notes

- The Blueprint uses free plans by default.
- Free Render Postgres expires after 30 days unless upgraded.
- Free web services spin down after inactivity, so the first request after idle time can be slow.
- RabbitMQ is still part of the local architecture, but the current deployed version does not require it because live event-driven features are not wired yet.

## CI/CD

The repository includes a root [`Jenkinsfile`](Jenkinsfile) for CI validation. The pipeline:

- installs frontend dependencies, runs behavior/request regression tests, and builds the production bundle
- installs user-service dependencies, runs authentication regression tests, and checks Node syntax
- creates isolated Python virtual environments for the reading and analytics services
- installs Python/test dependencies, runs both FastAPI regression suites, and checks Python syntax

Jenkins handles build and validation steps, and Render handles deployment from the main branch.

## Project Structure

```text
frontend/
services/
  user-service/
  reading-service/
  analytics-service/
infra/
  docker/
  jenkins/
docs/
```

## Documentation

- `docs/project-scope.md`
- `docs/service-boundaries.md`
- `docs/database-schema.md`
- `docs/api-contracts.md`

## Current Capabilities

The deployed app currently supports:

- account creation and login
- authenticated user session handling
- book search and shelf management
- reading progress updates
- reviews and review deletion
- analytics summary
- recommendations
- community profiles, follow/unfollow, and activity feed
- routed frontend pages
- live hosting on Render with Jenkins CI configuration in the repository


## Redesign and reliability update (October 2026)

The updated frontend includes a compact editorial homepage/auth flow, a dashboard, dedicated `/library` and `/insights` routes, `/books/:id` details, shelf filtering/sorting, progress indicators and editable reader profiles. All production actions use the existing real services. Marketing preview content is explicitly illustrative.

Requests terminate after 20 seconds with a meaningful error. Login/restore no longer depends on reading or analytics availability. Expired/invalid account sessions prompt sign-in; account outages offer a retry without erasing the token. Forward page updates now persist reading sessions even if no minutes are supplied; analytics measure those logged sessions.

For exact behavior, validation evidence, infrastructure limits and handoff:

- [Redesign report](docs/REDESIGN-REPORT.md)
- [Local development and isolated QA](docs/LOCAL-DEVELOPMENT.md)
- [Feature inventory and checklist](docs/IMPLEMENTATION.md)
- [Updated API contracts](docs/api-contracts.md)

No production deployment or data mutation was performed. Public frontend availability was verified, but the three backend health endpoints exceeded 50-second read-only checks. Database expiry has **not** been established; inspect the Render account/logs and active database before release.

### Release configuration

- Keep the existing persistent JWT_SECRET on the user service; reading and analytics must use that exact value. Do not rotate it as part of this change. Production user-service startup requires at least 32 characters.
- Verify DATABASE_URL points to the intended active database. Preserve existing data; restore a real backup if infrastructure recovery requires it.
- Frontend VITE_* service URLs are build-time values. Render Blueprint references remain in place; production fallbacks match the existing public service domains.
- CORS_ORIGIN is now the explicit `https://readlytics-web.onrender.com` origin. If using a custom domain, update all three services with the allowed comma-separated origins.
- No schema migration is required. Backend Docker contexts and native Render rootDir must use the repository root so the shared SQL schema is available. The Blueprint uses service-specific build/start commands and build filters to retain service boundaries.
- The frontend build uses Vite 6 and the lockfile. Use Node 20.20+ for local/CI parity. Python dependencies are pinned in each service requirements file. Render's Python configuration is retained.
- Review and deploy deliberately after verifying infrastructure; nothing was pushed or automatically deployed.


### Verified checks

The final local run passed **65 automated tests**: 19 frontend, 9 user-service, 11 reading-service, 9 analytics-service, 2 real API/SQL integration, and 15 browser/accessibility/layout tests. The production frontend build also passed. The integration database was disposable PGlite PostgreSQL, not production. Docker/stock PostgreSQL 16 and live production authentication remain unverified; see the report for full limitations.
