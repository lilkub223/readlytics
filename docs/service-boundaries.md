# Service Boundaries

## User Service
- Handles registration and login
- Issues and validates JWT-backed sessions
- Returns the signed-in user through `/api/users/me`
- Serves public profile data
- Owns follow and unfollow relationships

## Reading Service
- Searches external book data and stores cached book records
- Owns shelf entries and reading status
- Updates reading progress for current reads
- Creates, lists, and deletes reviews

## Analytics Service
- Returns dashboard summary metrics
- Builds recommendation responses
- Builds the community feed from follow relationships, reviews, and finished books

## Shared Data Model
- The services share one Postgres instance.
- Ownership is separated by schema rather than by separate databases.
- The analytics service reads from user and reading data to build its responses.
