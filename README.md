# Readlytics

Readlytics is a full-stack social book-tracking platform built as a production-style portfolio project. It combines a React frontend with Node.js and Python microservices so users can organize shelves, review books, track reading habits, and explore personalized recommendations.

## What It Demonstrates

- Frontend development with React, JavaScript, HTML, and CSS
- API design and integration across multiple backend services
- Microservice boundaries using Node.js and Python
- PostgreSQL data modeling and authenticated service behavior
- Docker-based local orchestration
- Git-based workflow in a Linux/Unix-style development environment

## Current Features

- User registration and login with JWT-based authentication
- Multi-page product UI with dedicated About, Features, Dashboard, Discover, Community, Login, and Register views
- Book search powered by the Open Library API
- Shelves for `Want to Read`, `Currently Reading`, `Finished`, and `Did Not Finish`
- Ratings and quick reviews
- Personalized reading dashboard with summary analytics
- Recommendation and activity-feed foundations

## Architecture

Readlytics is split into focused services:

| Service | Tech | Responsibility | Port |
| --- | --- | --- | --- |
| Frontend | React + Vite | Product UI and client-side navigation | `3000` |
| User Service | Node.js + Express | Authentication, profiles, and user relationships | `4001` |
| Reading Service | Python + FastAPI | Book search, shelves, reading progress, ratings, and reviews | `4002` |
| Analytics Service | Python + FastAPI | Reading analytics, recommendations, and activity feed endpoints | `4003` |
| PostgreSQL | Postgres 16 | Primary application database | `5432` |
| RabbitMQ | RabbitMQ | Included for planned event-driven extensions | `5672`, `15672` |

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

## Current Status

The core full-stack flow is working today:

- account creation and login
- authenticated user session handling
- book search and shelf saves
- reviews
- analytics summary
- recommendations
- routed frontend pages

Some parts of the original long-term vision are still planned rather than fully implemented, especially deeper community features, more advanced event-driven workflows, CI/CD polish, and production observability.

## Next Steps

- Expand the community layer with richer profiles and follow/unfollow flows
- Improve the feed with more realistic social activity
- Add automated tests for key frontend and backend flows
- Add CI/CD polish and deployment-oriented documentation
