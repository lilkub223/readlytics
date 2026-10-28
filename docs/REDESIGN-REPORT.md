# Readlytics redesign and reliability handoff

Date: October 27, 2026 (America/Chicago).

## Authentication diagnosis and fix

The original frontend `request()` awaited `fetch()` and `response.text()` without a deadline. A service that never completed its response could leave the login button in its loading state indefinitely. The original token-restoration effect also awaited reading data inside its authentication try/catch: a shelf/review failure cleared an otherwise valid JWT. Analytics used an all-or-nothing Promise.all and swallowed its errors.

The implementation adds a 20-second request deadline covering response headers/body, cancellation, structured HTTP/network/timeout errors, response validation, duplicate-submit protection, and explicit restoring/authenticated/unauthenticated/error session state. Account-service 401 responses clear an expired/invalid session. Account outages retain the token and offer retry. Reading and analytics requests load independently, retain healthy section data, and expose errors/retry rather than invalidating the session. Per-section generations reject stale responses after a newer refresh or logout. Logout clears token, account data, review drafts, and shelf state.

A real browser test additionally found a redirect race: a native popstate event could navigate to the dashboard before React committed the new token. Redirect now runs after the authenticated state is committed. The registration → dashboard and login → dashboard browser workflows pass.

### Production evidence and limits

Read-only checks found the public frontend returns HTTP 200. Its deployed bundle contains the same three public API URLs as `render.yaml`. All three backend `/health` requests exceeded both the initial 15-second and subsequent 50-second deadlines. This establishes that those checks did not receive timely service responses; it does not establish a database expiry, secret mismatch, or the exact Render outage cause. No Render account connection, private environment values, production logs, database backup, or real user credentials were available. Production accounts were not modified and no production login was attempted.

Check Render service logs/status, database availability/expiry, DATABASE_URL, and the existing shared JWT_SECRET before release. If a database expired, reconnect an active database and restore a real backup if available. Do not drop/recreate tables or claim data recovery without evidence. Do not regenerate the JWT secret simply to diagnose the outage.

## Redesigned product

- Home: original editorial identity, warm paper/sage/terracotta palette, meaningful book showcase, clearly labeled illustrative product preview, concise feature cards and call to action.
- Login/registration: compact forms, required fields, password visibility, native validation, useful loading/error copy. Removed unrelated payment marketing.
- Dashboard: real metrics, continue-reading cards, live shelf-count visualization, reviews, recommendations and reading-circle activity. Dedicated library keeps the overview compact.
- My Library: all four shelves, cover fallbacks, title/author filtering, title/recent sorting, shelf switching, move/remove controls, page updates and progress bars when page counts exist.
- Discover: cancellable searches, stable cached UUIDs, progressive pages, deduplication, upstream-failure warnings/cache fallback, shelf/review actions and links to book details.
- Book details: lazy-loaded route, cover/title/author/available metadata/description, shelf actions, reviews and rating editor. Missing metadata is omitted. Open Library descriptions are optionally fetched and cached with a bounded request.
- Reading Insights: persisted session metrics, genres and actual shelf-count chart. No invented history, unsupported goals, synthetic analytics series, or percentage recommendation scores.
- Community/profile: reader lookup, public profiles, follow/unfollow, following lists, reviews/activity, and ownership-protected editing of display name, bio and favorite genres.
- Shared system: responsive navigation, active state, reusable book covers/cards, keyboard focus, skip link, reduced motion, compact empty/error states and current-year footer. Slow/unavailable remote covers immediately have original typographic fallbacks.

## Backend, API, integrity and deployment

Preserved the three-service architecture, PostgreSQL schemas, endpoint paths, existing users and PBKDF2 password hashes. No destructive migration or data reset was introduced.

- pg connection timeout: 5 seconds; query/statement deadline: 8 seconds. Python connections also have a 5-second connect and 8-second statement timeout.
- Account database failures return 503 rather than misleading 401s; raw database/verification exceptions are not exposed.
- JWT verification requires HS256, a UUID subject and a finite future expiry. Signature comparison handles unequal lengths safely.
- Registration/profile/body/UUID/rating/page/date inputs are validated. Public profiles/following lists omit private account fields. Password work has a small process-local per-account/address rate limit; it is not a distributed limiter.
- Progress locks the owned shelf row and writes sessions for positive page deltas even without minutes. Backward/equal changes do not fabricate pages. No historical session backfill was invented.
- Shelf completion timestamps are cleared when moving out of Finished and preserved on repeat Finished saves. Existing entry/review IDs remain stable.
- Favorite-genre queries avoid counting the same book again merely because it has both a shelf entry and review. Recommendation copy accurately describes catalog/preference inputs.
- Python health checks return HTTP 503 on database failure.
- Backend Docker contexts now include the shared schema required at startup. Added persistent local PostgreSQL volume and build exclusions.
- Render retains SPA rewrites and shared JWT configuration. CORS is restricted to the existing frontend origin; local defaults support localhost/127.0.0.1. Build commands use npm ci. Added basic static response security headers.
- Updated vulnerable frontend/Node/Python dependency versions and lockfiles. Production dependency audits returned no known advisories at verification time. This is not a security certification. A separate scan of the entire QA virtualenv still reported a filelock advisory in audit tooling; filelock is not in either production requirements file.
- Jenkins now runs frontend, Node and both Python regression suites, in addition to production build/syntax checks.

## Verification

Final test counts and commands are recorded in the README. Browser tests exercise real services against a disposable PGlite PostgreSQL engine over the pg/psycopg wire interfaces, with fixture books and unique test accounts. Production code does not substitute test responses. A separate outage test deliberately intercepts one analytics response to verify recovery.

Preserved/verified workflows include registration/login, invalid credentials, restored sessions, logout, protected navigation, searching cached catalog plus upstream fallback, book details, four shelves, moving/removing, progress and persisted sessions, refresh persistence, review upserts/deletion, metrics, recommendations, public reader profiles, following/unfollowing/lists, public activity, profile editing, and cross-user ownership rejection. Unit tests additionally cover missing/malformed/expired tokens, response errors, request/body timeouts, duplicate submits, outages and streak edge cases.

Browser layout checks cover public pages plus dashboard/library/insights/book details at 1440, 1024, 768, 390 and 320 pixels. Screenshots were inspected for desktop/mobile home/login/dashboard/library/detail layouts. Automated axe scans cover six public pages and four authenticated reading pages with no detected WCAG A/AA violations in that scan scope. This does not replace a full manual screen-reader or accessibility audit.

### Remaining limitations

- Production backend health, database contents and live authentication remain unverified; no deployment or push was performed.
- Docker Desktop's daemon was unavailable. Compose configuration was reviewed, but the Docker images/stock PostgreSQL 16 stack were not executed. PGlite's connection multiplexer does not verify PostgreSQL multi-connection concurrency or production load behavior.
- External Open Library availability is outside the app's control. Cached search/failure behavior is tested; the complete live provider catalog, image CDN and description coverage cannot be guaranteed. Metadata can be absent.
- Historical progress saved without sessions remains without invented pages/streaks. Pages Logged measures actual persisted sessions; marking a book Finished does not imply its entire page count was logged.
- Sessions retain the existing localStorage JWT architecture, without refresh tokens or server-side token revocation. No authentication architecture migration was attempted.
- Recent user/profile reviews retain the existing six-review API limit; book-specific reviews can be viewed separately. No speculative private messaging, clubs, payments or recovery controls were added.
- Python unit tests emit a Starlette TestClient/httpx deprecation warning; the tests pass.

## Significant files

Frontend: `src/app.jsx`, `src/api.js`, new `src/http.js`, new `src/components/product.jsx`, `book-details.jsx`, `profile-editor.jsx`, `styles.css`, frontend lockfile/test configs/tests.

User service: new testable `src/app.js`, startup `index.js`, auth middleware/security/config/database/repository modules, dependency lockfile and authentication tests.

Reading/analytics: main/auth/config/db/repository modules, reading external-books adapter, pinned requirements and Python tests.

Infrastructure/docs: backend Dockerfiles, `.dockerignore`, Compose, `render.yaml`, Jenkinsfile, API contracts, development guide, implementation inventory, README, and isolated QA scripts.

See [LOCAL-DEVELOPMENT.md](LOCAL-DEVELOPMENT.md) for exact startup/test instructions and [IMPLEMENTATION.md](IMPLEMENTATION.md) for the original feature inventory/checklist.


## Deployment follow-up

During the authorized GitHub/Render rollout, Render's monorepo documentation confirmed that files outside rootDir are unavailable at build/runtime. The inherited backend rootDir settings therefore excluded the shared SQL schema. Backend rootDir is now explicitly the repository root, with service-specific build/start commands and build filters including the shared schema. This fixes the schema path for native Render services as well as the Docker fix above. Database configuration and the shared JWT secret references are unchanged. The exact cause of the earlier live timeouts remains unconfirmed without production logs.

Reference: https://render.com/docs/monorepo-support
