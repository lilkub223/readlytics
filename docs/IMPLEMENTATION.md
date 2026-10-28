# Redesign implementation checklist

Changes were implemented and tested in a separate workspace copy, then synchronized into the original clean book-platform checkout (base commit 1b3c163). Changes are uncommitted; production data is untouched.

## Capability inventory before implementation
| Capability | Existing frontend | API | Source of truth |
|---|---|---|---|
| Registration/login, restore/logout | AuthPanel, App token effect | /api/auth/register, /login, /api/users/me | user_service.users; existing PBKDF2 hashes |
| Profiles/social graph | CommunityPanel, ReviewCollection | /api/users/:username, /:id/follow, /:id/following | users, follows |
| Search/book metadata | DiscoverPanel (no detail UI) | /api/books/search, /:id | Open Library + reading_service.books |
| Four shelves/move/remove | LibraryPanel | /api/shelves/me, /api/shelves, /:id | shelf_entries |
| Progress/sessions | LibraryPanel | PATCH /api/shelves/:id/progress | shelf_entries, reading_sessions |
| Rate/review/delete | DiscoverPanel, RecentReviewsPanel | /api/reviews, /me, /book/:id, /users/:id, DELETE /:id | reviews |
| Metrics/recommendations/feed | InsightsPanel, RecommendationsPanel, CommunityPanel | /api/analytics/me/summary, /api/recommendations/me, /api/feed/me | computed from reading + user schemas |
| Public navigation | App history routing | static SPA rewrite | frontend |

## Confirmed code defects
- Fetch has no finite deadline (including response body). Login can remain pending indefinitely.
- Session restore wraps reading data loading in the authentication catch: a reading outage deletes a valid token.
- Analytics Promise.all discards healthy sections when one fails; errors are swallowed.
- Progress only writes a session if minutesRead is supplied, but the UI never supplies it. Pages/streaks stay zero.
- Progress forces at least one page even on a backward correction; concurrent updates do not lock the row.
- Docker backend build contexts omit the shared infra/docker/init.sql required at startup.
- User auth middleware maps database outages to 401, leaking raw exception messages.
- JWT verifier does not require expiration or subject and timingSafeEqual can throw on unequal lengths.
- Python health endpoints return HTTP 200 even if database is down.
- External search silently converts upstream failures to empty search results.

## Checklist
- [x] Read source, API contracts, schema and deployment configs; inventory above.
- [x] Stabilize authentication and add regression coverage.
- [x] Introduce editorial design system and redesign pages.
- [x] Preserve and integrate shelf/review/community workflows; add book details.
- [x] Harden APIs, progress/session integrity and deployment configuration.
- [x] Run automated tests and inspect desktop/mobile views.
- [x] Document actual results, remaining blockers and local run instructions.

## Infrastructure observations
Initial network probes failed DNS under the sandbox. A read-only elevated probe was requested.
Docker CLI is installed, but its daemon is not running. No production credentials or Render account connection are available. Database expiry and live environment values cannot be inferred from repository configuration.

## Final verification
- Frontend: 19 tests passed; production build passed (about 208 kB JS / 63.4 kB gzip, plus a separate 4.3 kB book-details chunk).
- User service: 9 tests passed.
- Reading service: 11 tests passed.
- Analytics service: 9 tests passed.
- Real API/SQL integration: 2 tests passed using disposable QA data.
- Playwright: 15 tests passed, including public/authenticated responsive layouts at five widths and axe accessibility scans of ten pages.
- Frontend, Node and Python production dependency audits: no known advisories in the audited dependency sets at verification time.
- Docker Compose configuration reviewed; daemon unavailable, so containers/stock PostgreSQL 16 were not executed.
- Public frontend responded; all three deployed service health checks exceeded 50 seconds. Production auth/database remain an external blocker, not an established database-expiry diagnosis.
- No commit, push, deployment, secret rotation, password reset, production mutation, or destructive migration was performed.

See REDESIGN-REPORT.md and LOCAL-DEVELOPMENT.md for behavior, reproduction steps, deployment requirements, and limits.
