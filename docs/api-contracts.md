# API Contracts

## Notes
- Routes under `/api/users/me`, `/api/shelves/me`, `/api/analytics/me/*`, and `/api/feed/me` require a Bearer token.
- Health checks are exposed at `/health` on each service.

## User Service

### `POST /api/auth/register`
Create a new user account and return a token.

Request body:
- `email`
- `username`
- `password`
- `displayName`

Response:
- `user`
- `token`

### `POST /api/auth/login`
Authenticate a user and return a JWT.

Request body:
- `email`
- `password`

Response:
- `user`
- `token`

### `GET /api/users/me`
Return the authenticated user.

### `GET /api/users/:username`
Return a public user profile and follow counts.

### `POST /api/users/:userId/follow`
Follow a user.

### `DELETE /api/users/:userId/follow`
Unfollow a user.

### `GET /api/users/:userId/following`
List accounts followed by the user.

## Reading Service

### `GET /api/books/search?q=...`
Search for books from the external provider and locally cached titles.

### `GET /api/books/:bookId`
Return details for a single book.

### `GET /api/shelves/me`
Return the current user's shelf entries grouped by status.

### `POST /api/shelves`
Create or update a shelf entry.

Request body:
- `bookId`
- `status`
- `currentPage`

### `PATCH /api/shelves/:entryId/progress`
Update the current page for a shelf entry.

Request body:
- `currentPage`
- `minutesRead`
- `sessionDate`

### `POST /api/reviews`
Create or update a review for a book.

Request body:
- `bookId`
- `rating`
- `reviewText`

### `DELETE /api/shelves/:entryId`
Remove a shelf entry from the user's library.

### `GET /api/reviews/book/:bookId`
List reviews for a book.

### `GET /api/reviews/me`
List recent reviews for the authenticated user.

### `GET /api/reviews/users/:userId`
List recent reviews for a public user profile.

### `DELETE /api/reviews/:reviewId`
Delete one of the authenticated user's reviews.

## Analytics Service

### `GET /api/analytics/me/summary`
Return dashboard metrics for the current user.

Response fields:
- `booksFinished`
- `pagesReadTotal`
- `averageRating`
- `currentStreakDays`
- `favoriteGenres`

### `GET /api/recommendations/me`
Return recommendation cards for the current user.

### `GET /api/feed/me`
Return a social activity feed for the current user.

## Reliability and redesign additions

- `PATCH /api/users/me` (Bearer token): update `displayName`, `bio` (max 1000 characters), and `favoriteGenres` (up to 10 strings). Only the authenticated user's row changes. Returns `{ user }`. Public profile/following responses still exclude email and password hashes.
- `GET /api/books/search?q=...&page=1`: query length 1–200, pages 1–100. Returns `{ query, page, results, hasMore, warning }`. Results retain cached UUID identities. Cache is included on page 1; duplicate source/ID pairs are removed. `hasMore` indicates a full upstream page, so a final follow-up page can be empty. Upstream outages use cached results with a warning, or return 503 if no cache is available.
- Book detail responses optionally enrich/cache Open Library descriptions through a bounded request. Failed metadata enrichment leaves cached details usable.
- Reading progress now records a session for a positive page delta even if `minutesRead` is omitted. Equal/backward page changes record no new session; they do not erase historical session records. A backward change followed by forward reading can therefore represent rereading and count additional logged pages. `sessionDate` must be an ISO date that is not in the future. Current page cannot exceed a known positive page count. Shelf responses include `pageCount` where available.
- Moving out of Finished clears its completion timestamp; resaving Finished preserves the existing completion timestamp. Shelf entry IDs and review IDs remain stable on upsert.
- Python `/health` now returns 503 when the database is unavailable, matching the Node service.
- Invalid/missing/expired JWT: 401. Database unavailability: 503, with a generic public error. Validation errors: 400 (user service) or 422 (FastAPI). Ownership violations for an entry/review return 404 and do not mutate another user's data.
- The frontend's 20-second request deadline covers both headers and response body. Requests support cancellation; mutations are never retried automatically. A user can explicitly retry failed reads. A timeout on a mutation can mean the server committed it before the response was lost; refresh before repeating a progress update.
- Pages logged is the sum of persisted reading sessions, not estimated pages implied by marking a book Finished. Existing historical progress without a session is not backfilled with invented reading history.
