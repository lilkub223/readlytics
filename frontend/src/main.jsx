import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";

import {
  getAnalyticsSummary,
  getCurrentUser,
  getRecommendations,
  getShelves,
  loginUser,
  registerUser,
  saveReview,
  saveShelfEntry,
  searchBooks,
} from "./api";
import "./styles.css";

const SHELF_OPTIONS = [
  { value: "want_to_read", label: "Want to Read" },
  { value: "currently_reading", label: "Currently Reading" },
  { value: "finished", label: "Finished" },
  { value: "did_not_finish", label: "Did Not Finish" },
];

const DEFAULT_AUTH_FORM = {
  email: "",
  username: "",
  password: "",
  displayName: "",
};

const DEFAULT_REVIEW_DRAFTS = {};

function formatShelfName(name) {
  return name
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function App() {
  const [token, setToken] = useState(() => window.localStorage.getItem("book-platform-token") ?? "");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("register");
  const [authForm, setAuthForm] = useState(DEFAULT_AUTH_FORM);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("dune");
  const [searchResults, setSearchResults] = useState([]);
  const [searchState, setSearchState] = useState({ loading: false, error: "" });
  const [shelves, setShelves] = useState({
    want_to_read: [],
    currently_reading: [],
    finished: [],
    did_not_finish: [],
  });
  const [shelfMessage, setShelfMessage] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState(DEFAULT_REVIEW_DRAFTS);
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const [summary, recommendationPayload] = await Promise.all([
          getAnalyticsSummary(),
          getRecommendations(),
        ]);

        if (!cancelled) {
          setAnalytics(summary);
          setRecommendations(recommendationPayload.recommendations ?? []);
        }
      } catch (_error) {
        if (!cancelled) {
          setAnalytics(null);
          setRecommendations([]);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setShelves({
        want_to_read: [],
        currently_reading: [],
        finished: [],
        did_not_finish: [],
      });
      window.localStorage.removeItem("book-platform-token");
      return;
    }

    window.localStorage.setItem("book-platform-token", token);

    let cancelled = false;

    async function loadAuthenticatedState() {
      try {
        const [{ user: currentUser }, shelfData] = await Promise.all([
          getCurrentUser(token),
          getShelves(token),
        ]);

        if (!cancelled) {
          setUser(currentUser);
          setShelves(shelfData);
        }
      } catch (error) {
        if (!cancelled) {
          setAuthError(error.message);
          setToken("");
        }
      }
    }

    loadAuthenticatedState();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const payload =
        authMode === "register"
          ? await registerUser(authForm)
          : await loginUser({
              email: authForm.email,
              password: authForm.password,
            });

      setToken(payload.token);
      setAuthForm(DEFAULT_AUTH_FORM);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSearch(event) {
    event?.preventDefault();
    setSearchState({ loading: true, error: "" });

    try {
      const payload = await searchBooks(searchQuery);
      setSearchResults(payload.results ?? []);
    } catch (error) {
      setSearchResults([]);
      setSearchState({ loading: false, error: error.message });
      return;
    }

    setSearchState({ loading: false, error: "" });
  }

  async function refreshShelves() {
    if (!token) {
      return;
    }

    const shelfData = await getShelves(token);
    setShelves(shelfData);
  }

  async function handleShelfSave(bookId, status) {
    if (!token) {
      setAuthError("Sign in to save books to your shelves.");
      return;
    }

    try {
      await saveShelfEntry(token, { bookId, status, currentPage: status === "currently_reading" ? 42 : 0 });
      await refreshShelves();
      setShelfMessage(`Saved to ${formatShelfName(status)}.`);
    } catch (error) {
      setShelfMessage(error.message);
    }
  }

  async function handleReviewSave(bookId) {
    if (!token) {
      setAuthError("Sign in to leave reviews.");
      return;
    }

    const draft = reviewDrafts[bookId];

    if (!draft?.rating) {
      setShelfMessage("Choose a rating before saving a review.");
      return;
    }

    try {
      await saveReview(token, {
        bookId,
        rating: Number(draft.rating),
        reviewText: draft.reviewText ?? "",
      });
      setShelfMessage("Review saved.");
    } catch (error) {
      setShelfMessage(error.message);
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Portfolio Project</p>
          <h1>Book Platform</h1>
        </div>
        <p className="intro">
          A working social book-tracking demo with React, a Node auth service, Python reading APIs,
          PostgreSQL persistence, and cross-service JWT auth.
        </p>
      </section>

      <section className="layout-grid">
        <article className="panel auth-panel">
          <div className="panel-header">
            <h2>{user ? "Signed In" : "Authentication"}</h2>
            {!user ? (
              <button
                className="ghost-button"
                type="button"
                onClick={() => setAuthMode((current) => (current === "register" ? "login" : "register"))}
              >
                Switch to {authMode === "register" ? "Login" : "Register"}
              </button>
            ) : null}
          </div>

          {user ? (
            <div className="user-card">
              <p className="profile-name">{user.displayName}</p>
              <p>@{user.username}</p>
              <p>{user.email}</p>
              <button
                className="ghost-button"
                type="button"
                onClick={() => {
                  setToken("");
                  setShelfMessage("");
                }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <form className="stack" onSubmit={handleAuthSubmit}>
              {authMode === "register" ? (
                <>
                  <label>
                    Display Name
                    <input
                      value={authForm.displayName}
                      onChange={(event) =>
                        setAuthForm((current) => ({ ...current, displayName: event.target.value }))
                      }
                      placeholder="Reader One"
                    />
                  </label>
                  <label>
                    Username
                    <input
                      value={authForm.username}
                      onChange={(event) =>
                        setAuthForm((current) => ({ ...current, username: event.target.value }))
                      }
                      placeholder="reader01"
                    />
                  </label>
                </>
              ) : null}

              <label>
                Email
                <input
                  value={authForm.email}
                  onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                  placeholder="reader@example.com"
                  type="email"
                />
              </label>

              <label>
                Password
                <input
                  value={authForm.password}
                  onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="password123"
                  type="password"
                />
              </label>

              <button className="primary-button" disabled={authLoading} type="submit">
                {authLoading ? "Saving..." : authMode === "register" ? "Create Account" : "Log In"}
              </button>
              {authError ? <p className="error-text">{authError}</p> : null}
            </form>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Reading Snapshot</h2>
            <span className="pill">Analytics Service</span>
          </div>
          {analytics ? (
            <div className="stats-grid">
              <div className="stat-card">
                <strong>{analytics.booksFinished}</strong>
                <span>Books Finished</span>
              </div>
              <div className="stat-card">
                <strong>{analytics.pagesReadTotal}</strong>
                <span>Pages Read</span>
              </div>
              <div className="stat-card">
                <strong>{analytics.averageRating}</strong>
                <span>Average Rating</span>
              </div>
              <div className="stat-card">
                <strong>{analytics.currentStreakDays}</strong>
                <span>Day Streak</span>
              </div>
            </div>
          ) : (
            <p className="muted-text">Analytics service not loaded.</p>
          )}
        </article>

        <article className="panel search-panel wide-panel">
          <div className="panel-header">
            <h2>Search Books</h2>
            <span className="pill">Reading Service</span>
          </div>

          <form className="search-row" onSubmit={handleSearch}>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search books"
            />
            <button className="primary-button" disabled={searchState.loading} type="submit">
              {searchState.loading ? "Searching..." : "Search"}
            </button>
          </form>
          {searchState.error ? <p className="error-text">{searchState.error}</p> : null}
          {shelfMessage ? <p className="success-text">{shelfMessage}</p> : null}

          <div className="results-grid">
            {searchResults.map((book) => {
              const reviewDraft = reviewDrafts[book.id] ?? { rating: "", reviewText: "" };

              return (
                <article key={book.id} className="book-card">
                  <div className="book-copy">
                    <p className="book-title">{book.title}</p>
                    <p className="muted-text">{(book.authors ?? []).join(", ") || "Unknown author"}</p>
                    <p className="muted-text small-text">
                      {book.publishedYear ? `First published ${book.publishedYear}` : "Publication year unavailable"}
                    </p>
                  </div>

                  <div className="action-cluster">
                    <div className="button-row">
                      {SHELF_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          className="secondary-button"
                          type="button"
                          onClick={() => handleShelfSave(book.id, option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <div className="review-row">
                      <select
                        value={reviewDraft.rating}
                        onChange={(event) =>
                          setReviewDrafts((current) => ({
                            ...current,
                            [book.id]: {
                              ...reviewDraft,
                              rating: event.target.value,
                            },
                          }))
                        }
                      >
                        <option value="">Rating</option>
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <option key={rating} value={rating}>
                            {rating} / 5
                          </option>
                        ))}
                      </select>
                      <input
                        value={reviewDraft.reviewText}
                        onChange={(event) =>
                          setReviewDrafts((current) => ({
                            ...current,
                            [book.id]: {
                              ...reviewDraft,
                              reviewText: event.target.value,
                            },
                          }))
                        }
                        placeholder="Quick review"
                      />
                      <button className="ghost-button" type="button" onClick={() => handleReviewSave(book.id)}>
                        Save Review
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        <article className="panel wide-panel">
          <div className="panel-header">
            <h2>Your Shelves</h2>
            <button className="ghost-button" type="button" onClick={() => refreshShelves()} disabled={!token}>
              Refresh
            </button>
          </div>

          <div className="shelf-grid">
            {Object.entries(shelves).map(([shelfName, entries]) => (
              <section key={shelfName} className="shelf-column">
                <h3>{formatShelfName(shelfName)}</h3>
                {entries.length ? (
                  entries.map((entry) => (
                    <article key={entry.entryId} className="shelf-entry">
                      <strong>{entry.title}</strong>
                      <span>{(entry.authors ?? []).join(", ")}</span>
                      <span>Current page: {entry.currentPage}</span>
                    </article>
                  ))
                ) : (
                  <p className="muted-text">No books yet.</p>
                )}
              </section>
            ))}
          </div>
        </article>

        <article className="panel wide-panel">
          <div className="panel-header">
            <h2>Recommendations</h2>
            <span className="pill">Analytics Service</span>
          </div>
          <div className="recommendation-grid">
            {recommendations.map((recommendation) => (
              <article key={recommendation.bookId} className="recommendation-card">
                <strong>{recommendation.title}</strong>
                <span>{recommendation.reason}</span>
                <span className="score-chip">{recommendation.score}</span>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
