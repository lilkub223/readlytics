const USER_SERVICE_URL = "http://localhost:4001";
const READING_SERVICE_URL = "http://localhost:4002";
const ANALYTICS_SERVICE_URL = "http://localhost:4003";

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error ?? data?.detail ?? `Request failed with status ${response.status}`);
  }

  return data;
}

export function registerUser(payload) {
  return request(`${USER_SERVICE_URL}/api/auth/register`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(payload) {
  return request(`${USER_SERVICE_URL}/api/auth/login`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCurrentUser(token) {
  return request(`${USER_SERVICE_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function searchBooks(query) {
  const params = new URLSearchParams({ q: query });
  return request(`${READING_SERVICE_URL}/api/books/search?${params.toString()}`);
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

export function saveReview(token, payload) {
  return request(`${READING_SERVICE_URL}/api/reviews`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
}

export function getAnalyticsSummary() {
  return request(`${ANALYTICS_SERVICE_URL}/api/analytics/me/summary`);
}

export function getRecommendations() {
  return request(`${ANALYTICS_SERVICE_URL}/api/recommendations/me`);
}
