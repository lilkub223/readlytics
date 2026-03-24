# Database Schema

## Approach
Readlytics uses one PostgreSQL instance with schema-level ownership split by service.

- `user_service` schema: authentication, profiles, social graph
- `reading_service` schema: books, shelves, progress, reviews
- `analytics` schema: reserved tables for derived read models and future expansion

This keeps the deployment simple while still making service ownership clear.

## user_service.users
- `id` UUID primary key
- `email` text unique not null
- `username` text unique not null
- `password_hash` text not null
- `display_name` text not null
- `bio` text nullable
- `favorite_genres` text array default empty
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

## user_service.follows
- `follower_id` UUID not null
- `followed_id` UUID not null
- `created_at` timestamptz not null
- primary key: (`follower_id`, `followed_id`)

Rules:
- `follower_id` references `user_service.users(id)`
- `followed_id` references `user_service.users(id)`
- users cannot follow themselves

## reading_service.books
- `id` UUID primary key
- `external_source` text not null
- `external_id` text not null
- `title` text not null
- `authors` text array default empty
- `description` text nullable
- `published_year` integer nullable
- `page_count` integer nullable
- `cover_image_url` text nullable
- `genres` text array default empty
- `created_at` timestamptz not null
- unique: (`external_source`, `external_id`)

## reading_service.shelf_entries
- `id` UUID primary key
- `user_id` UUID not null
- `book_id` UUID not null
- `status` text not null
- `current_page` integer default 0
- `started_at` timestamptz nullable
- `finished_at` timestamptz nullable
- `created_at` timestamptz not null
- `updated_at` timestamptz not null
- unique: (`user_id`, `book_id`)

Status values:
- `want_to_read`
- `currently_reading`
- `finished`
- `did_not_finish`

Notes:
- each user can have one shelf entry per book
- shelf entries are the source of truth for library status
- `current_page` is actively updated for current reads

## reading_service.reviews
- `id` UUID primary key
- `user_id` UUID not null
- `book_id` UUID not null
- `rating` integer not null
- `review_text` text nullable
- `created_at` timestamptz not null
- `updated_at` timestamptz not null

Rules:
- `rating` between 1 and 5
- unique: (`user_id`, `book_id`)

## reading_service.reading_sessions
- `id` UUID primary key
- `user_id` UUID not null
- `book_id` UUID not null
- `pages_read` integer not null
- `minutes_read` integer nullable
- `session_date` date not null
- `created_at` timestamptz not null

## analytics.feed_items
- `id` UUID primary key
- `user_id` UUID not null
- `actor_user_id` UUID not null
- `event_type` text not null
- `entity_id` UUID nullable
- `payload` jsonb not null
- `created_at` timestamptz not null

## analytics.user_metrics
- `user_id` UUID primary key
- `books_finished` integer not null
- `pages_read_total` integer not null
- `average_rating` numeric(3,2) nullable
- `current_streak_days` integer not null
- `favorite_genres` text array default empty
- `updated_at` timestamptz not null

## analytics.recommendations
- `id` UUID primary key
- `user_id` UUID not null
- `book_id` UUID not null
- `score` numeric(5,2) not null
- `reason` text not null
- `created_at` timestamptz not null

## Notes
- The user service is the source of truth for users and follows.
- The reading service is the source of truth for books, shelf state, reviews, and sessions.
- The live analytics endpoints currently compute their responses from `user_service` and `reading_service` data.
- The `analytics` tables exist for future precomputed or event-driven versions of those responses.
