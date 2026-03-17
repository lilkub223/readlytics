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

## Next Step
Install dependencies in each app, then run the services locally or with Docker Compose.

## Design Docs
- `docs/project-scope.md`
- `docs/service-boundaries.md`
- `docs/database-schema.md`
- `docs/api-contracts.md`
