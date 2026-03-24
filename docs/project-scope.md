# Readlytics Overview

## Product
Readlytics is a social book-tracking app. Users can search books, save them to shelves, track progress, write reviews, follow other readers, and see basic analytics and recommendations.

## Current Stack
- Frontend: React, JavaScript, HTML, CSS, Vite
- User service: Node.js, Express
- Reading service: Python, FastAPI
- Analytics service: Python, FastAPI
- Database: PostgreSQL
- Local infrastructure: Docker Compose, RabbitMQ
- CI: Jenkinsfile
- Deployment: Render

## Current Feature Set
- User registration and login
- Public reader profiles
- Follow and unfollow
- Book search through the Open Library API
- Shelf management for `Want to Read`, `Currently Reading`, `Finished`, and `Did Not Finish`
- Reading progress updates for current reads
- Reviews, recent reviews, and review deletion
- Dashboard analytics
- Personalized recommendations
- Community feed based on follows

## Scope Notes
- The app uses three backend services and one shared Postgres instance.
- RabbitMQ is still part of the local stack, but the live app does not depend on it yet.
- The current deployment is a portfolio-scale production sample, not a large multi-environment platform.
