import { request, validateAuth } from "./http";
function normalizeBaseUrl(url, fallback) {
  return (url?.trim() || fallback).replace(/\/+$/, "");
}

const USER_SERVICE_URL = normalizeBaseUrl(
  import.meta.env?.VITE_USER_SERVICE_URL,
  import.meta.env?.PROD
    ? "https://readlytics-user-service.onrender.com"
    : "http://localhost:4001",
);
const READING_SERVICE_URL = normalizeBaseUrl(
  import.meta.env?.VITE_READING_SERVICE_URL,
  import.meta.env?.PROD
    ? "https://readlytics-reading-service.onrender.com"
    : "http://localhost:4002",
);
const ANALYTICS_SERVICE_URL = normalizeBaseUrl(
  import.meta.env?.VITE_ANALYTICS_SERVICE_URL,
  import.meta.env?.PROD
    ? "https://readlytics-analytics-service.onrender.com"
    : "http://localhost:4003",
);

export async function registerUser(payload) {
  return validateAuth(
    await request(`${USER_SERVICE_URL}/api/auth/register`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
}

export async function loginUser(payload) {
  return validateAuth(
    await request(`${USER_SERVICE_URL}/api/auth/login`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  );
}

export function getCurrentUser(token, signal) {
  return request(`${USER_SERVICE_URL}/api/users/me`, {
    signal,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getUserProfile(username) {
  return request(
    `${USER_SERVICE_URL}/api/users/${encodeURIComponent(username)}`,
  );
}

export function getFollowing(userId) {
  return request(`${USER_SERVICE_URL}/api/users/${userId}/following`);
}

export function followUser(token, userId) {
  return request(`${USER_SERVICE_URL}/api/users/${userId}/follow`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function unfollowUser(token, userId) {
  return request(`${USER_SERVICE_URL}/api/users/${userId}/follow`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function searchBooks(query, page = 1, signal) {
  const params = new URLSearchParams({ q: query, page: String(page) });
  return request(
    `${READING_SERVICE_URL}/api/books/search?${params.toString()}`,
    { signal },
  );
}

export function getShelves(token) {
  return request(`${READING_SERVICE_URL}/api/shelves/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function saveShelfEntry(token, payload) {
  return request(`${READING_SERVICE_URL}/api/shelves`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function deleteShelfEntry(token, entryId) {
  return request(
    `${READING_SERVICE_URL}/api/shelves/${encodeURIComponent(entryId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export function updateShelfProgress(token, entryId, payload) {
  return request(
    `${READING_SERVICE_URL}/api/shelves/${encodeURIComponent(entryId)}/progress`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    },
  );
}

export function saveReview(token, payload) {
  return request(`${READING_SERVICE_URL}/api/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function deleteReview(token, reviewId) {
  return request(
    `${READING_SERVICE_URL}/api/reviews/${encodeURIComponent(reviewId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
}

export function getMyReviews(token) {
  return request(`${READING_SERVICE_URL}/api/reviews/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getUserReviews(userId) {
  return request(
    `${READING_SERVICE_URL}/api/reviews/users/${encodeURIComponent(userId)}`,
  );
}

export function getAnalyticsSummary(token) {
  return request(`${ANALYTICS_SERVICE_URL}/api/analytics/me/summary`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getRecommendations(token) {
  return request(`${ANALYTICS_SERVICE_URL}/api/recommendations/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getFeed(token) {
  return request(`${ANALYTICS_SERVICE_URL}/api/feed/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function getBook(bookId, signal) {
  return request(
    `${READING_SERVICE_URL}/api/books/${encodeURIComponent(bookId)}`,
    { signal },
  );
}
export function getBookReviews(bookId, signal) {
  return request(
    `${READING_SERVICE_URL}/api/reviews/book/${encodeURIComponent(bookId)}`,
    { signal },
  );
}
export function updateProfile(token, payload) {
  return request(`${USER_SERVICE_URL}/api/users/me`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
}
