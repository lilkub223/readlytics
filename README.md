# Book Platform

Portfolio project for a production-style social book-tracking application.

## Planned Stack
- React frontend
- Node.js user service
- Python reading service
- Python analytics service
- PostgreSQL
- RabbitMQ
- Docker Compose
- Jenkins

## Initial Structure
- `frontend/`
- `services/user-service/`
- `services/reading-service/`
- `services/analytics-service/`
- `infra/docker/`
- `infra/jenkins/`
- `docs/`

## Service Ports
- Frontend: `3000`
- User service: `4001`
- Reading service: `4002`
- Analytics service: `4003`

## Design Docs
- `docs/project-scope.md`
- `docs/service-boundaries.md`
- `docs/database-schema.md`
- `docs/api-contracts.md`

## Local Notes
- The user service now expects PostgreSQL credentials through `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, and `PGDATABASE`.
- The reading service uses the same PostgreSQL variables and shared `JWT_SECRET` for protected routes.
- `docker-compose.yml` sets those values automatically for containerized runs.
- If you run the user service directly after pulling recent changes, run `npm install` inside `services/user-service/` to install the `pg` dependency.
- If you run the reading service directly after pulling recent changes, activate its virtualenv and run `pip install -r requirements.txt` inside `services/reading-service/`.
