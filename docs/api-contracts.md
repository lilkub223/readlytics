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
