import ProfileEditor from "./components/profile-editor";
import { Landing, Cover, BookMosaic, ShelfChart } from "./components/product";
import React, { useEffect, useState, useRef, lazy, Suspense } from "react";

import {
  deleteReview,
  deleteShelfEntry,
  followUser,
  getAnalyticsSummary,
  getCurrentUser,
  getFeed,
  getMyReviews,
  getFollowing,
  getRecommendations,
  getShelves,
  getUserProfile,
  getUserReviews,
  loginUser,
  registerUser,
  saveReview,
  saveShelfEntry,
  searchBooks,
  unfollowUser,
  updateShelfProgress,
} from "./api";

const BookDetails = lazy(() => import("./components/book-details"));

const ROUTES = {
  about: "/",
  features: "/features",
  dashboard: "/dashboard",
  library: "/library",
  insights: "/insights",
  discover: "/discover",
  community: "/community",
  login: "/login",
  register: "/register",
};

const NAV_ITEMS = [
  { label: "My Library", path: ROUTES.library },
  { label: "Dashboard", path: ROUTES.dashboard },
  { label: "Discover", path: ROUTES.discover },
  { label: "Community", path: ROUTES.community },
];

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
const SEARCH_SUGGESTIONS = [
  "Dune",
  "Octavia Butler",
  "Fantasy",
  "Japanese literature",
  "Historical fiction",
];
const RECENT_SEARCH_STORAGE_KEY = "readlytics-recent-searches";

const FEATURE_PREVIEW_ITEMS = [
  {
    title: "Reading Insights",
    description:
      "See your pace, favorite genres, rating trends, and reading streaks in one calm, focused view.",
  },
  {
    title: "Personalized Recommendations",
    description:
      "Get book suggestions shaped by your shelves, recent reviews, and the authors you keep coming back to.",
  },
  {
    title: "Social Reading",
    description:
      "Follow readers you trust, compare taste, and keep an eye on the books lighting up your community.",
  },
];

const SHELF_INTROS = {
  want_to_read: "Build your next-up list with books you want to keep in sight.",
  currently_reading: "Track what is open on your nightstand right now.",
  finished: "Celebrate the titles you have already completed.",
  did_not_finish: "Keep a record of the books that did not quite land.",
};

const DEFAULT_COMMUNITY_STATE = {
  loading: false,
  error: "",
  actionLoading: false,
};

function normalizePath(pathname) {
  const trimmed = pathname?.replace(/\/+$/, "") || ROUTES.about;
  const normalized = trimmed === "" ? ROUTES.about : trimmed;

  return Object.values(ROUTES).includes(normalized) ||
    /^\/books\/[a-zA-Z0-9-]+$/.test(normalized)
    ? normalized
    : ROUTES.about;
}

function navigate(path) {
  if (typeof window === "undefined") {
    return;
  }

  const nextPath = normalizePath(path);

  if (window.location.pathname !== nextPath) {
    window.history.pushState({}, "", nextPath);
  }

  window.dispatchEvent(new PopStateEvent("popstate"));
}

function getStoredToken() {
  try {
    return window.localStorage.getItem("book-platform-token") ?? "";
  } catch {
    return "";
  }
}

function getInitialRecentSearches() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string").slice(0, 5)
      : [];
  } catch (_error) {
    return [];
  }
}

function formatShelfName(name) {
  return name
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function getInitials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatRatingStars(rating) {
  return `${"★".repeat(rating)}${"☆".repeat(Math.max(0, 5 - rating))}`;
}

function getShelfProgressLabel(entry) {
  if (entry.status === "currently_reading") {
    return entry.currentPage > 0
      ? `On page ${entry.currentPage}`
      : "Just getting started";
  }

  if (entry.status === "finished") {
    return "Finished";
  }

  if (entry.status === "did_not_finish") {
    return entry.currentPage > 0
      ? `Stopped at page ${entry.currentPage}`
      : "Did not finish";
  }

  return "Ready to start";
}

function SiteHeader({
  pathname,
  user,
  onLogin,
  onRegister,
  onSignOut,
  onProfile,
}) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <button
          className="site-logo"
          type="button"
          onClick={() => navigate(ROUTES.about)}
        >
          <span className="site-logo-mark">R</span>
          <span className="site-logo-wordmark">Readlytics</span>
        </button>

        <nav className="site-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.path}
              className={`site-nav-link ${pathname === item.path ? "is-active" : ""}`}
              type="button"
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="site-header-actions">
          {user ? (
            <>
              <button
                className="nav-user-chip"
                aria-label="Your reader profile"
                type="button"
                onClick={onProfile}
              >
                <span className="nav-avatar">
                  {getInitials(user.displayName)}
                </span>
                <span className="nav-user-copy">
                  <strong>{user.displayName}</strong>
                  <span>@{user.username}</span>
                </span>
              </button>
              <button
                className="ghost-button nav-auth-button"
                type="button"
                onClick={onSignOut}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <button
                className="ghost-button nav-auth-button"
                type="button"
                onClick={onLogin}
              >
                Log In
              </button>
              <button
                className="primary-button nav-auth-button"
                type="button"
                onClick={onRegister}
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div className="footer-brand-block">
          <div className="site-logo footer-logo">
            <span className="site-logo-mark">R</span>
            <span className="site-logo-wordmark">Readlytics</span>
          </div>
          <p className="footer-description">
            Readlytics helps readers organize their shelves, understand their
            habits, and find the books that fit next.
          </p>
          <p className="footer-copyright">
            © {new Date().getFullYear()} Readlytics. Made for your next chapter.
          </p>
        </div>

        <nav className="footer-links" aria-label="Footer">
          <button
            className="footer-link"
            type="button"
            onClick={() => navigate(ROUTES.about)}
          >
            About
          </button>
          <button
            className="footer-link"
            type="button"
            onClick={() => navigate(ROUTES.features)}
          >
            Features
          </button>
          <button
            className="footer-link"
            type="button"
            onClick={() => navigate(ROUTES.community)}
          >
            Community
          </button>
          <a
            className="footer-link"
            href="https://github.com/lilkub223/readlytics"
            rel="noreferrer"
            target="_blank"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}

function PageBanner({
  eyebrow,
  title,
  description,
  actions,
  className = "",
  microcopy,
  supportingContent,
}) {
  return (
    <section className={`page-banner panel reveal-section ${className}`.trim()}>
      <div className="page-banner-copy">
        <span className="section-kicker">{eyebrow}</span>
        <h1 className="page-banner-title">{title}</h1>
        <p className="page-banner-description">{description}</p>
        {supportingContent ? (
          <div className="page-banner-support">{supportingContent}</div>
        ) : null}
        {actions?.length ? (
          <div className="page-banner-cta">
            {microcopy ? (
              <p className="page-banner-microcopy">{microcopy}</p>
            ) : null}
            <div className="page-banner-actions">
              {actions.map((action) => (
                <button
                  key={action.label}
                  className={
                    action.variant === "primary"
                      ? "primary-button"
                      : "ghost-button"
                  }
                  type="button"
                  onClick={action.onClick}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CommunityBannerSupport({
  feedItems,
  followingUsers,
  onSelectProfile,
  token,
  user,
}) {
  const visibleReaders = [...followingUsers, ...(user ? [user] : [])]
    .filter(
      (reader, index, readers) =>
        readers.findIndex((candidate) => candidate.id === reader.id) === index,
    )
    .slice(0, 4);

  const previewItems = feedItems.length
    ? feedItems.slice(0, 3).map((item) => ({
        label: item.message,
        meta: `@${item.actorUsername}`,
        actorUsername: item.actorUsername,
      }))
    : [
        {
          label: token
            ? "Follow readers to unlock live review and finish updates."
            : "Live reading activity appears here once you join.",
          meta: token
            ? "Your circle shapes this space."
            : "A calmer community, centered on books.",
        },
        {
          label:
            "Community is built around shelves, thoughtful ratings, and meaningful recommendations.",
          meta: "No noise, just reading signals worth keeping up with.",
        },
      ];

  return (
    <div className="community-banner-support">
      <div className="community-avatar-row">
        <div className="community-avatar-cluster" aria-hidden="true">
          {visibleReaders.length
            ? visibleReaders.map((reader) => (
                <span key={reader.id} className="community-avatar-token">
                  {getInitials(reader.displayName)}
                </span>
              ))
            : Array.from({ length: 4 }).map((_, index) => (
                <span
                  key={index}
                  className="community-avatar-token is-placeholder"
                >
                  RL
                </span>
              ))}
        </div>
        <span className="community-avatar-note">
          {visibleReaders.length
            ? `${visibleReaders.length} readers already shaping your circle.`
            : "Reader activity and new connections will appear here as your circle grows."}
        </span>
      </div>

      <div className="community-preview-list">
        {previewItems.map((item) =>
          item.actorUsername ? (
            <button
              key={`${item.actorUsername}-${item.label}`}
              className="community-preview-item"
              type="button"
              onClick={() => onSelectProfile(item.actorUsername)}
            >
              <span className="community-preview-dot" />
              <div className="community-preview-copy">
                <strong>{item.label}</strong>
                <span>{item.meta}</span>
              </div>
            </button>
          ) : (
            <div key={item.label} className="community-preview-item is-static">
              <span className="community-preview-dot" />
              <div className="community-preview-copy">
                <strong>{item.label}</strong>
                <span>{item.meta}</span>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function FeaturePreviewSection() {
  return (
    <section
      className="feature-preview-section reveal-section"
      aria-labelledby="feature-preview-heading"
    >
      <header className="feature-preview-header">
        <p className="section-kicker">Why readers stay</p>
        <h2 id="feature-preview-heading">
          Everything you need to turn reading into a richer routine.
        </h2>
        <p className="section-description">
          Readlytics keeps your habits, recommendations, and community moments
          in one refined product flow.
        </p>
      </header>

      <div className="feature-preview-grid">
        {FEATURE_PREVIEW_ITEMS.map((item, index) => (
          <article key={item.title} className="feature-preview-card">
            <span className="feature-preview-index">0{index + 1}</span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmptyState({
  title,
  copy,
  buttonLabel,
  buttonVariant = "ghost",
  onButtonClick,
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">RL</span>
      <div className="empty-state-copy-block">
        <h3 className="empty-state-title">{title}</h3>
        <p className="empty-state-copy">{copy}</p>
      </div>
      {buttonLabel ? (
        <button
          className={
            buttonVariant === "primary"
              ? "primary-button empty-state-button"
              : "ghost-button empty-state-button"
          }
          type="button"
          onClick={onButtonClick}
        >
          {buttonLabel}
        </button>
      ) : null}
    </div>
  );
}

function AuthPanel({
  user,
  authMode,
  authForm,
  authLoading,
  authError,
  onAuthSubmit,
  onFormChange,
  onToggleMode,
  onSignOut,
}) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <article className="panel auth-panel reveal-section">
      <div className="panel-header">
        <div>
          <h2>
            {user
              ? "Your Account"
              : authMode === "register"
                ? "Registration"
                : "Welcome Back"}
          </h2>
          <p className="panel-description">
            {user
              ? "Keep your profile close and your next read even closer."
              : authMode === "register"
                ? "Create your space and start building a reading life that feels like home."
                : "Sign in to return to your shelves, reviews, and recommendations."}
          </p>
        </div>
        {!user ? (
          <button
            className="ghost-button auth-switch-button"
            type="button"
            onClick={onToggleMode}
          >
            {authMode === "register"
              ? "Have an account? Log In"
              : "Need an account? Register"}
          </button>
        ) : null}
      </div>

      {user ? (
        <div className="user-card">
          <p className="profile-name">{user.displayName}</p>
          <p>@{user.username}</p>
          <p>{user.email}</p>
          <button className="ghost-button" type="button" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      ) : (
        <form className="stack auth-form" onSubmit={onAuthSubmit}>
          {authMode === "register" ? (
            <>
              <label>
                Display Name
                <input
                  value={authForm.displayName}
                  onChange={(event) =>
                    onFormChange("displayName", event.target.value)
                  }
                  required
                  maxLength={100}
                  autoComplete="name"
                  placeholder="Your name"
                />
              </label>
              <label>
                Username
                <input
                  value={authForm.username}
                  onChange={(event) =>
                    onFormChange("username", event.target.value)
                  }
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_]+"
                  autoComplete="username"
                  placeholder="reader01"
                />
              </label>
            </>
          ) : null}

          <label>
            Email
            <input
              value={authForm.email}
              onChange={(event) => onFormChange("email", event.target.value)}
              required
              autoComplete="email"
              placeholder="reader@example.com"
              type="email"
            />
          </label>

          <label>
            Password
            <input
              value={authForm.password}
              onChange={(event) => onFormChange("password", event.target.value)}
              required
              minLength={authMode === "register" ? 8 : undefined}
              autoComplete={
                authMode === "register" ? "new-password" : "current-password"
              }
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
            />
          </label>

          <button
            className="password-toggle"
            type="button"
            aria-pressed={showPassword}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? "Hide password" : "Show password"}
          </button>
          <button
            className="primary-button auth-submit-button"
            disabled={authLoading}
            type="submit"
          >
            {authLoading
              ? "Connecting…"
              : authMode === "register"
                ? "Create Your Account"
                : "Continue Reading"}
          </button>
          {authLoading && (
            <p role="status" className="muted-text small-text">
              Connecting securely. Sleeping services may take a moment; this
              attempt will time out so you can retry.
            </p>
          )}
          {authError ? (
            <p role="alert" className="error-text">
              {authError}
            </p>
          ) : null}
        </form>
      )}
    </article>
  );
}

function InsightsPanel({ token, analytics }) {
  return (
    <article className="panel reveal-section">
      <div className="panel-header">
        <div>
          <h2>Reading Insights</h2>
          <button
            className="text-link small-text"
            onClick={() => navigate(ROUTES.insights)}
          >
            Explore your insights →
          </button>
          <p className="panel-description">
            Your cozy corner for tracking progress, habits, ratings, and the
            genres you keep coming back to.
          </p>
        </div>
      </div>
      {token && analytics ? (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <strong>{analytics.booksFinished}</strong>
              <span>Books Finished</span>
            </div>
            <div className="stat-card">
              <strong>{analytics.pagesReadTotal}</strong>
              <span>Pages Logged</span>
            </div>
            <div className="stat-card">
              <strong>{analytics.averageRating ?? "—"}</strong>
              <span>Average Rating</span>
            </div>
            <div className="stat-card">
              <strong>{analytics.currentStreakDays}</strong>
              <span>Day Streak</span>
            </div>
          </div>
          {analytics.favoriteGenres?.length ? (
            <p className="genre-line">
              Top genres: {analytics.favoriteGenres.join(", ")}
            </p>
          ) : null}
        </>
      ) : token ? (
        <p className="muted-text">
          Reading insights are unavailable right now. Use Retry above to try
          again; your library is still available.
        </p>
      ) : (
        <EmptyState
          title="Your dashboard is ready."
          copy="Sign in to see reading insights shaped by your shelves, sessions, and reviews."
          buttonLabel="Log In"
          onButtonClick={() => navigate(ROUTES.login)}
        />
      )}
    </article>
  );
}

function DiscoverPanel({
  shelfActionState,
  hasMore,
  onLoadMore,
  token,
  recentSearches,
  reviewSaveState,
  reviewDrafts,
  searchQuery,
  searchResults,
  searchState,
  onReviewDraftChange,
  setSearchQuery,
  onSearch,
  onSuggestionSelect,
  onShelfSave,
  onReviewSave,
}) {
  return (
    <article className="panel wide-panel search-panel reveal-section">
      <div className="panel-header">
        <div>
          <h2>Discover Books</h2>
          <p className="panel-description">
            Search for new titles, save them to a shelf, and leave a quick
            review while inspiration is fresh.
          </p>
        </div>
      </div>

      <form className="search-row" onSubmit={onSearch}>
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          aria-label="Search books"
          maxLength={200}
          placeholder="Search for books, authors, or genres..."
        />
        <button
          className="primary-button"
          disabled={searchState.loading}
          type="submit"
        >
          {searchState.loading ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="search-helper-row">
        <span className="search-helper-label">
          {recentSearches.length ? "Recent searches" : "Suggested searches"}
        </span>
        <div className="suggestion-chip-row">
          {(recentSearches.length ? recentSearches : SEARCH_SUGGESTIONS).map(
            (term) => (
              <button
                key={term}
                className="suggestion-chip"
                type="button"
                onClick={() => onSuggestionSelect(term)}
              >
                {term}
              </button>
            ),
          )}
        </div>
      </div>

      {searchState.error ? (
        <p role="alert" className="error-text">
          {searchState.error}
        </p>
      ) : null}
      {searchState.warning && (
        <p role="status" className="notice">
          {searchState.warning}
        </p>
      )}

      <div className="search-results-shell">
        {searchState.loading ? (
          <div className="results-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <article key={index} className="book-card skeleton-card">
                <div className="book-card-top">
                  <div className="book-cover-shell skeleton-block" />
                  <div className="book-copy">
                    <div className="skeleton-line skeleton-line-title" />
                    <div className="skeleton-line" />
                    <div className="skeleton-line skeleton-line-short" />
                  </div>
                </div>
                <div className="action-cluster">
                  <div className="button-row">
                    <div className="skeleton-pill" />
                    <div className="skeleton-pill" />
                    <div className="skeleton-pill" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : searchResults.length ? (
          <div className="results-grid">
            {searchResults.map((book) => {
              const reviewDraft = reviewDrafts[book.id] ?? {
                rating: "",
                reviewText: "",
              };
              const saveState = reviewSaveState[book.id];
              const shelfState = shelfActionState[book.id];

              return (
                <article key={book.id} className="book-card">
                  <div className="book-card-top">
                    <div className="book-cover-shell">
                      {book.coverImageUrl ? (
                        <img
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                          className="book-cover-image"
                          src={book.coverImageUrl}
                          alt={`Cover for ${book.title}`}
                        />
                      ) : (
                        <div className="book-cover-fallback">RL</div>
                      )}
                    </div>

                    <div className="book-copy">
                      <button
                        className="book-title text-link"
                        onClick={() => navigate(`/books/${book.id}`)}
                      >
                        {book.title}
                      </button>
                      <p className="muted-text">
                        {(book.authors ?? []).join(", ") || "Unknown author"}
                      </p>
                      <p className="muted-text small-text">
                        {book.publishedYear
                          ? `First published ${book.publishedYear}`
                          : "Publication year unavailable"}
                      </p>
                    </div>
                  </div>

                  <div className="action-cluster">
                    <div className="button-row">
                      {SHELF_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          className="secondary-button"
                          disabled={shelfState?.status === "saving"}
                          type="button"
                          onClick={() => onShelfSave(book.id, option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    {shelfState?.message ? (
                      <p
                        className={
                          shelfState.status === "error"
                            ? "error-text review-feedback"
                            : "success-text review-feedback"
                        }
                      >
                        {shelfState.message}
                      </p>
                    ) : null}

                    <div className="review-row">
                      <select
                        aria-label={`Rating for ${book.title}`}
                        value={reviewDraft.rating}
                        onChange={(event) =>
                          onReviewDraftChange(
                            book.id,
                            "rating",
                            event.target.value,
                          )
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
                          onReviewDraftChange(
                            book.id,
                            "reviewText",
                            event.target.value,
                          )
                        }
                        aria-label={`Review for ${book.title}`}
                        placeholder="Quick review"
                      />
                      <button
                        className="ghost-button"
                        disabled={saveState?.status === "saving"}
                        type="button"
                        onClick={() => onReviewSave(book.id)}
                      >
                        {saveState?.status === "saving"
                          ? "Saving..."
                          : saveState?.status === "saved"
                            ? "Saved"
                            : "Save Review"}
                      </button>
                    </div>
                    {saveState?.message ? (
                      <p
                        className={
                          saveState.status === "error"
                            ? "error-text review-feedback"
                            : "success-text review-feedback"
                        }
                      >
                        {saveState.message}
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title={
              searchState.searched
                ? "No books found."
                : "Start your next search."
            }
            copy="Look up a title, author, or genre to start building your shelves and recommendations."
            buttonLabel={token ? "Try a Suggested Search" : "Create an Account"}
            buttonVariant={token ? "ghost" : "primary"}
            onButtonClick={() => {
              if (token) {
                onSuggestionSelect("Dune");
              } else {
                navigate(ROUTES.register);
              }
            }}
          />
        )}
      </div>
      {hasMore && (
        <button
          className="ghost-button load-more"
          disabled={searchState.loading}
          onClick={onLoadMore}
        >
          Load more books
        </button>
      )}
    </article>
  );
}

function LibraryPanel({
  pageDrafts,
  shelves,
  shelfDrafts,
  shelfActionState,
  token,
  onRefresh,
  onShelfDelete,
  onShelfDraftChange,
  onShelfMove,
  onPageDraftChange,
  onProgressUpdate,
}) {
  const [activeShelf, setActiveShelf] = useState("all");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("recent");
  const visibleShelves = Object.entries(shelves)
    .filter(([key]) => activeShelf === "all" || key === activeShelf)
    .map(([key, entries]) => [
      key,
      entries
        .filter((e) =>
          `${e.title} ${(e.authors ?? []).join(" ")}`
            .toLowerCase()
            .includes(filter.toLowerCase()),
        )
        .slice()
        .sort((a, b) =>
          sort === "title" ? a.title.localeCompare(b.title) : 0,
        ),
    ]);
  return (
    <article className="panel wide-panel reveal-section">
      <div className="panel-header">
        <div>
          <h2>Your Library</h2>
          <p className="panel-description">
            Every saved title, neatly organized so your next read is always
            within reach.
          </p>
        </div>
        <button
          className="ghost-button"
          type="button"
          onClick={onRefresh}
          disabled={!token}
        >
          Refresh
        </button>
      </div>

      <div className="library-toolbar">
        <div className="shelf-tabs" aria-label="Bookshelf filters">
          {[
            ["all", "All books"],
            ...SHELF_OPTIONS.map((o) => [o.value, o.label]),
          ].map(([key, label]) => (
            <button
              className={activeShelf === key ? "is-active" : ""}
              aria-pressed={activeShelf === key}
              key={key}
              onClick={() => setActiveShelf(key)}
            >
              {label}
              {key !== "all" && <span>{shelves[key].length}</span>}
            </button>
          ))}
        </div>
        <div className="search-row">
          <input
            aria-label="Filter your library"
            placeholder="Filter title or author"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <select
            aria-label="Sort library"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recent">Recently updated</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>
      <div className="shelf-grid">
        {visibleShelves.map(([shelfName, entries]) => (
          <section key={shelfName} className="shelf-column">
            <div className="shelf-column-header">
              <div>
                <h3>{formatShelfName(shelfName)}</h3>
                <p className="shelf-column-copy">{SHELF_INTROS[shelfName]}</p>
              </div>
              <span className="shelf-count">{entries.length}</span>
            </div>

            <div className="shelf-column-body">
              {entries.length ? (
                entries.map((entry) => (
                  <article key={entry.entryId} className="shelf-entry">
                    <div className="library-book-head">
                      <Cover title={entry.title} url={entry.coverImageUrl} />
                      <div className="shelf-entry-copy">
                        <button
                          className="text-link"
                          onClick={() => navigate(`/books/${entry.bookId}`)}
                        >
                          {entry.title}
                        </button>
                        <span>{(entry.authors ?? []).join(", ")}</span>
                        <span>
                          {getShelfProgressLabel(entry)}
                          {entry.pageCount ? ` / ${entry.pageCount}` : ""}
                        </span>
                        {entry.pageCount > 0 && (
                          <progress
                            aria-label={`Reading progress for ${entry.title}`}
                            value={entry.currentPage}
                            max={entry.pageCount}
                          />
                        )}
                      </div>
                    </div>
                    <div className="shelf-entry-actions">
                      <select
                        aria-label={`Shelf for ${entry.title}`}
                        value={shelfDrafts[entry.entryId] ?? entry.status}
                        onChange={(event) =>
                          onShelfDraftChange(entry.entryId, event.target.value)
                        }
                      >
                        {SHELF_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <div className="shelf-entry-button-row">
                        <button
                          className="secondary-button"
                          disabled={
                            !token ||
                            shelfActionState[entry.entryId]?.status ===
                              "saving" ||
                            (shelfDrafts[entry.entryId] ?? entry.status) ===
                              entry.status
                          }
                          type="button"
                          onClick={() => onShelfMove(entry)}
                        >
                          {shelfActionState[entry.entryId]?.status === "saving"
                            ? "Updating..."
                            : "Update Shelf"}
                        </button>
                        <button
                          className="ghost-button"
                          disabled={
                            !token ||
                            shelfActionState[entry.entryId]?.status === "saving"
                          }
                          type="button"
                          onClick={() => onShelfDelete(entry)}
                        >
                          Remove
                        </button>
                      </div>
                      {entry.status === "currently_reading" ? (
                        <div className="shelf-progress-row">
                          <input
                            aria-label={`Current page for ${entry.title}`}
                            min="0"
                            max={entry.pageCount || undefined}
                            step="1"
                            type="number"
                            value={
                              pageDrafts[entry.entryId] ??
                              entry.currentPage ??
                              1
                            }
                            onChange={(event) =>
                              onPageDraftChange(
                                entry.entryId,
                                event.target.value,
                              )
                            }
                          />
                          <button
                            className="ghost-button"
                            disabled={
                              !token ||
                              shelfActionState[entry.entryId]?.status ===
                                "saving" ||
                              Number(
                                pageDrafts[entry.entryId] ??
                                  entry.currentPage ??
                                  1,
                              ) === entry.currentPage
                            }
                            type="button"
                            onClick={() => onProgressUpdate(entry)}
                          >
                            Update Page
                          </button>
                        </div>
                      ) : null}
                      {shelfActionState[entry.entryId]?.message ? (
                        <p
                          className={
                            shelfActionState[entry.entryId].status === "error"
                              ? "error-text review-feedback"
                              : "success-text review-feedback"
                          }
                        >
                          {shelfActionState[entry.entryId].message}
                        </p>
                      ) : null}
                    </div>
                  </article>
                ))
              ) : (
                <EmptyState
                  title="No books yet."
                  copy="Start building your library by adding your first book."
                  buttonLabel="Search Books"
                  onButtonClick={() => navigate(ROUTES.discover)}
                />
              )}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

function ReviewCollection({
  reviews,
  emptyTitle,
  emptyCopy,
  emptyButtonLabel,
  emptyButtonVariant,
  onDeleteReview,
  onEmptyAction,
  reviewActionState = {},
  compact = false,
}) {
  if (!reviews.length) {
    return (
      <EmptyState
        title={emptyTitle}
        copy={emptyCopy}
        buttonLabel={emptyButtonLabel}
        buttonVariant={emptyButtonVariant}
        onButtonClick={onEmptyAction}
      />
    );
  }

  return (
    <div className={`review-list ${compact ? "is-compact" : ""}`.trim()}>
      {reviews.map((review) => (
        <article key={review.id} className="review-card">
          <div className="review-card-top">
            <div className="review-cover-shell">
              {review.coverImageUrl ? (
                <img
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  className="book-cover-image"
                  src={review.coverImageUrl}
                  alt={`Cover for ${review.title}`}
                />
              ) : (
                <div className="book-cover-fallback">RL</div>
              )}
            </div>
            <div className="review-card-copy">
              <button
                className="text-link"
                onClick={() => navigate(`/books/${review.bookId}`)}
              >
                {review.title}
              </button>
              <span>
                {(review.authors ?? []).join(", ") || "Unknown author"}
              </span>
              <div className="review-rating-row">
                <span className="pill">{formatRatingStars(review.rating)}</span>
                <span>{review.rating} / 5</span>
              </div>
            </div>
          </div>
          <p className="review-card-text">
            {review.reviewText?.trim() ||
              "No written note yet, but the rating is saved to this reader's profile."}
          </p>
          {onDeleteReview ? (
            <div className="review-card-actions">
              <button
                className="ghost-button"
                disabled={reviewActionState[review.id]?.status === "saving"}
                type="button"
                onClick={() => onDeleteReview(review)}
              >
                {reviewActionState[review.id]?.status === "saving"
                  ? "Removing..."
                  : "Delete Review"}
              </button>
              {reviewActionState[review.id]?.message ? (
                <p
                  className={
                    reviewActionState[review.id].status === "error"
                      ? "error-text review-feedback"
                      : "success-text review-feedback"
                  }
                >
                  {reviewActionState[review.id].message}
                </p>
              ) : null}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function RecentReviewsPanel({
  reviewActionState,
  reviews,
  token,
  onDeleteReview,
}) {
  return (
    <article className="panel wide-panel reveal-section">
      <div className="panel-header">
        <div>
          <h2>Recent Reviews</h2>
          <p className="panel-description">
            The books you&apos;ve rated and the quick notes you&apos;ve left
            along the way.
          </p>
        </div>
      </div>
      <ReviewCollection
        onDeleteReview={onDeleteReview}
        reviewActionState={reviewActionState}
        reviews={reviews}
        emptyTitle={token ? "No reviews yet." : "Your reviews will live here."}
        emptyCopy={
          token
            ? "Rate a book and add a quick note to start building your public reading profile."
            : "Sign in to save ratings and build a profile that reflects your reading taste."
        }
        emptyButtonLabel={token ? "Discover Books" : "Log In"}
        emptyButtonVariant={token ? "ghost" : "primary"}
        onEmptyAction={() => navigate(token ? ROUTES.discover : ROUTES.login)}
      />
    </article>
  );
}

function RecommendationsPanel({ token, recommendations }) {
  return (
    <article className="panel wide-panel reveal-section">
      <div className="panel-header">
        <div>
          <h2>Picked For You</h2>
          <p className="panel-description">
            Personalized suggestions based on the books, authors, and genres
            you&apos;ve been enjoying.
          </p>
        </div>
      </div>
      {token && recommendations.length ? (
        <div className="recommendation-grid">
          {recommendations.map((recommendation) => (
            <article
              key={recommendation.bookId}
              className="recommendation-card"
            >
              <div className="recommendation-top">
                <div className="recommendation-cover-shell">
                  {recommendation.coverImageUrl ? (
                    <img
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                      className="book-cover-image"
                      src={recommendation.coverImageUrl}
                      alt={`Cover for ${recommendation.title}`}
                    />
                  ) : (
                    <div className="book-cover-fallback">RL</div>
                  )}
                </div>
                <div className="recommendation-copy">
                  <button
                    className="text-link"
                    onClick={() => navigate(`/books/${recommendation.bookId}`)}
                  >
                    {recommendation.title}
                  </button>
                  <span>{recommendation.reason}</span>
                </div>
              </div>
              <span className="pill">Suggested read</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="recommendation-state">
          <EmptyState
            title={
              token
                ? "Your recommendation engine is warming up."
                : "Recommendations are ready when you are."
            }
            copy={
              token
                ? "Add more books, shelves, and reviews so Readlytics can tailor suggestions to your reading habits."
                : "Sign in to see recommendations tailored to your reading habits."
            }
            buttonLabel={token ? "Discover More Books" : "Sign Up"}
            buttonVariant="primary"
            onButtonClick={() =>
              navigate(token ? ROUTES.discover : ROUTES.register)
            }
          />
        </div>
      )}
    </article>
  );
}

function CommunityPanel({
  communityProfile,
  communityReviews,
  communityQuery,
  communityState,
  feedItems,
  followingUsers,
  setCommunityQuery,
  token,
  user,
  onProfileSearch,
  onSelectProfile,
  onToggleFollow,
  onProfileSaved,
}) {
  const isOwnProfile = Boolean(
    user && communityProfile && communityProfile.id === user.id,
  );
  const isFollowing = Boolean(
    communityProfile &&
    followingUsers.some((reader) => reader.id === communityProfile.id),
  );

  return (
    <>
      <div className="page-two-column-grid">
        <article className="panel reveal-section">
          <div className="panel-header">
            <div>
              <h2>Find a Reader</h2>
              <p className="panel-description">
                Look up another reader by username, view their profile, and
                follow them to personalize your community feed.
              </p>
            </div>
          </div>

          <form className="community-search-form" onSubmit={onProfileSearch}>
            <input
              value={communityQuery}
              onChange={(event) => setCommunityQuery(event.target.value)}
              aria-label="Reader username"
              id="reader-search"
              placeholder="Search by username..."
            />
            <button
              className="primary-button"
              disabled={communityState.loading}
              type="submit"
            >
              {communityState.loading ? "Looking..." : "Find Reader"}
            </button>
          </form>

          {communityState.error ? (
            <p className="error-text">{communityState.error}</p>
          ) : null}

          {communityProfile ? (
            <article className="reader-profile-card">
              <div className="reader-profile-head">
                <div className="reader-avatar">
                  {getInitials(communityProfile.displayName)}
                </div>
                <div className="reader-profile-meta">
                  <strong>{communityProfile.displayName}</strong>
                  <span>@{communityProfile.username}</span>
                </div>
              </div>

              <p className="muted-text">
                {communityProfile.bio?.trim() ||
                  "This reader has not written a bio yet, but their shelves can still tell a story."}
              </p>

              <div className="reader-stats">
                <div className="reader-stat">
                  <strong>{communityProfile.followersCount}</strong>
                  <span>Followers</span>
                </div>
                <div className="reader-stat">
                  <strong>{communityProfile.followingCount}</strong>
                  <span>Following</span>
                </div>
              </div>

              {communityProfile.favoriteGenres?.length ? (
                <div className="tag-row">
                  {communityProfile.favoriteGenres.map((genre) => (
                    <span key={genre} className="tag-chip">
                      {genre}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="profile-action-row">
                {isOwnProfile ? (
                  <ProfileEditor
                    user={user}
                    token={token}
                    onSaved={onProfileSaved}
                  />
                ) : token ? (
                  <button
                    className={isFollowing ? "ghost-button" : "primary-button"}
                    disabled={communityState.actionLoading}
                    type="button"
                    onClick={() => onToggleFollow(communityProfile)}
                  >
                    {communityState.actionLoading
                      ? "Updating..."
                      : isFollowing
                        ? "Following"
                        : "Follow Reader"}
                  </button>
                ) : (
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => navigate(ROUTES.login)}
                  >
                    Log In to Follow
                  </button>
                )}
              </div>

              <div className="profile-review-block">
                <div className="profile-review-header">
                  <h3>Recent Reviews</h3>
                  <p className="muted-text small-text">
                    A quick look at what this reader has rated and written about
                    recently.
                  </p>
                </div>
                <ReviewCollection
                  compact
                  reviews={communityReviews}
                  emptyTitle="No reviews on this profile yet."
                  emptyCopy="Once this reader starts rating books, their recent thoughts will show up here."
                />
              </div>
            </article>
          ) : (
            <EmptyState
              title="Search for a reader."
              copy="Try a username to open a reader profile, follow them, and start shaping your community feed."
              buttonLabel={token ? "Go to Dashboard" : "Create Account"}
              buttonVariant={token ? "ghost" : "primary"}
              onButtonClick={() =>
                navigate(token ? ROUTES.dashboard : ROUTES.register)
              }
            />
          )}
        </article>

        <article className="panel reveal-section">
          <div className="panel-header">
            <div>
              <h2>Your Circle</h2>
              <p className="panel-description">
                Keep track of the readers you follow and jump into their
                profiles whenever you want.
              </p>
            </div>
          </div>

          {token ? (
            followingUsers.length ? (
              <div className="circle-list">
                {followingUsers.map((reader) => (
                  <button
                    key={reader.id}
                    className="circle-card"
                    type="button"
                    onClick={() => onSelectProfile(reader.username)}
                  >
                    <div className="circle-card-copy">
                      <strong>{reader.displayName}</strong>
                      <span>@{reader.username}</span>
                      <p>
                        {reader.bio?.trim() ||
                          "A thoughtful reader building their shelves."}
                      </p>
                    </div>
                    <span className="score-chip">View</span>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Your circle is still empty."
                copy="Follow a few readers and their activity will start showing up here and in your community feed."
                buttonLabel="Find Readers"
                onButtonClick={() => {
                  document.getElementById("reader-search")?.focus();
                }}
              />
            )
          ) : (
            <EmptyState
              title="Build your reading circle."
              copy="Create an account to follow other readers, compare taste, and make the community feed feel alive."
              buttonLabel="Join Readlytics"
              buttonVariant="primary"
              onButtonClick={() => navigate(ROUTES.register)}
            />
          )}
        </article>
      </div>

      <article className="panel wide-panel reveal-section">
        <div className="panel-header">
          <div>
            <h2>Reader Activity</h2>
            <p className="panel-description">
              See what fellow readers are reviewing, finishing, and recommending
              across the community.
            </p>
          </div>
        </div>
        {token ? (
          feedItems.length ? (
            <div className="recommendation-grid">
              {feedItems.map((item, index) => (
                <article
                  key={`${item.type}-${item.createdAt}-${index}`}
                  className="recommendation-card"
                >
                  <strong>{item.message}</strong>
                  <button
                    className="inline-profile-link"
                    type="button"
                    onClick={() => onSelectProfile(item.actorUsername)}
                  >
                    @{item.actorUsername}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Your community feed is quiet for now."
              copy="Follow a few readers and their reviews and finished books will start showing up here."
              buttonLabel="Discover Books"
              onButtonClick={() => navigate(ROUTES.discover)}
            />
          )
        ) : (
          <EmptyState
            title="See what the community is reading."
            copy="Sign in to follow reader activity, spot new favorites, and watch the conversation unfold."
            buttonLabel="Log In"
            buttonVariant="primary"
            onButtonClick={() => navigate(ROUTES.login)}
          />
        )}
      </article>
    </>
  );
}

function AboutPage({ user }) {
  return <Landing user={user} navigate={navigate} />;
}

function FeaturesPage({ user }) {
  return (
    <div className="content-stack">
      <PageBanner
        eyebrow="Feature overview"
        title="For every kind of reader."
        description="Track your shelves, review books, understand your habits, and keep your reading community close without clutter."
        actions={[
          {
            label: user ? "Open Dashboard" : "Get Started",
            variant: "primary",
            onClick: () => navigate(user ? ROUTES.dashboard : ROUTES.register),
          },
          {
            label: "Discover Books",
            onClick: () => navigate(ROUTES.discover),
          },
        ]}
      />
      <FeaturePreviewSection />
    </div>
  );
}

function AuthPage(props) {
  return (
    <div className="auth-layout">
      <aside className="auth-editorial">
        <span className="section-kicker">
          A little more reading. A little more you.
        </span>
        <h1>
          Your next chapter
          <br />
          <em>starts here.</em>
        </h1>
        <p>
          A home for the books you love, the stories you discover, and the
          reader you become.
        </p>
        <BookMosaic compact />
        <span className="small-text">Your library. Your pace.</span>
      </aside>
      <AuthPanel {...props} />
    </div>
  );
}

function DashboardPage(props) {
  const { analytics, dataState, feedItems, mode, shelves, token, user } = props;
  const library = <LibraryPanel {...props} />;
  return (
    <div className="content-stack">
      <PageBanner
        eyebrow={
          mode === "/library"
            ? "MY LIBRARY"
            : mode === "/insights"
              ? "READING INSIGHTS"
              : "YOUR READING SPACE"
        }
        title={
          mode === "/library"
            ? "Every book has a place."
            : mode === "/insights"
              ? "Find your reading rhythm."
              : `A new chapter, ${user?.displayName || "reader"}.`
        }
        description="Your books, your progress, your next chapter."
        actions={[
          {
            label: "Discover books ↗",
            variant: "primary",
            onClick: () => navigate("/discover"),
          },
        ]}
      />
      {mode !== "/library" && (
        <>
          {dataState.Insights?.loading ? (
            <div
              className="stats-grid"
              role="status"
              aria-label="Loading reading insights"
            >
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="skeleton-block stat-card" />
              ))}
            </div>
          ) : (
            <InsightsPanel token={token} analytics={analytics} />
          )}
          <div className="page-two-column-grid">
            <ShelfChart shelves={shelves} />
            <article className="panel">
              <div className="panel-header">
                <h2>Continue reading</h2>
                <button
                  className="text-link"
                  onClick={() => navigate("/library")}
                >
                  My library →
                </button>
              </div>
              {shelves.currently_reading.length ? (
                <div className="continue-list">
                  {shelves.currently_reading.map((entry) => (
                    <div className="continue-book" key={entry.entryId}>
                      <Cover title={entry.title} url={entry.coverImageUrl} />
                      <div>
                        <button
                          className="text-link"
                          onClick={() => navigate(`/books/${entry.bookId}`)}
                        >
                          {entry.title}
                        </button>
                        <p className="muted-text small-text">
                          {(entry.authors ?? []).join(", ")}
                        </p>
                        {entry.pageCount > 0 && (
                          <progress
                            aria-label={`${entry.title} progress`}
                            value={entry.currentPage}
                            max={entry.pageCount}
                          />
                        )}
                        <p className="small-text">
                          Page {entry.currentPage}
                          {entry.pageCount ? ` of ${entry.pageCount}` : ""}
                        </p>
                        <button
                          className="ghost-button"
                          onClick={() => navigate("/library")}
                        >
                          Update progress
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="Your next chapter starts with a book."
                  copy="Find a book you love and add it to Currently Reading."
                  buttonLabel="Find a book"
                  onButtonClick={() => navigate("/discover")}
                />
              )}
            </article>
          </div>
        </>
      )}
      {mode === "/library" &&
        (dataState.Library?.loading ? (
          <p role="status" className="notice">
            Loading your library…
          </p>
        ) : (
          library
        ))}
      {mode !== "/library" && (
        <>
          <div className="dashboard-secondary">
            <RecentReviewsPanel
              reviewActionState={props.reviewActionState}
              token={token}
              reviews={props.reviews}
              onDeleteReview={props.onDeleteReview}
            />
            <RecommendationsPanel
              token={token}
              recommendations={props.recommendations}
            />
          </div>
          <article className="panel">
            <div className="panel-header">
              <h2>From your reading circle</h2>
              <button
                className="text-link"
                onClick={() => navigate("/community")}
              >
                Community →
              </button>
            </div>
            {feedItems.length ? (
              feedItems.slice(0, 5).map((item, i) => (
                <p className="activity-line" key={i}>
                  {item.message}
                </p>
              ))
            ) : (
              <p className="muted-text">
                Follow readers in Community to see their recent reviews and
                finished books.
              </p>
            )}
          </article>
        </>
      )}
    </div>
  );
}

function DiscoverPage(props) {
  return (
    <div className="content-stack">
      <PageBanner
        eyebrow="Discover"
        title="Search by title, author, or genre."
        description="Find your next book, save it to a shelf, and leave a quick review before the moment passes."
        actions={[
          {
            label: props.token ? "Open Dashboard" : "Get Started",
            variant: "primary",
            onClick: () =>
              navigate(props.token ? ROUTES.dashboard : ROUTES.register),
          },
        ]}
      />
      <DiscoverPanel {...props} />
    </div>
  );
}

function CommunityPage(props) {
  const { feedItems, followingUsers, onSelectProfile, token, user } = props;

  return (
    <div className="content-stack">
      <PageBanner
        className="community-banner"
        eyebrow="Community"
        title={
          user
            ? "Keep up with your reading circle."
            : "A calmer social space for readers."
        }
        description="Stay connected with what others are reading, rating, and recommending."
        microcopy="Join a community of readers discovering and sharing books."
        supportingContent={
          <CommunityBannerSupport
            feedItems={feedItems}
            followingUsers={followingUsers}
            onSelectProfile={onSelectProfile}
            token={token}
            user={user}
          />
        }
        actions={
          token
            ? [
                {
                  label: "Open Dashboard",
                  variant: "primary",
                  onClick: () => navigate(ROUTES.dashboard),
                },
              ]
            : [
                {
                  label: "Join Readlytics",
                  variant: "primary",
                  onClick: () => navigate(ROUTES.register),
                },
                { label: "Log In", onClick: () => navigate(ROUTES.login) },
              ]
        }
      />
      <CommunityPanel {...props} />
    </div>
  );
}

export default function App() {
  const [pathname, setPathname] = useState(() => {
    const initialPath =
      typeof window === "undefined"
        ? ROUTES.about
        : normalizePath(window.location.pathname);

    if (
      typeof window !== "undefined" &&
      window.location.pathname !== initialPath
    ) {
      window.history.replaceState({}, "", initialPath);
    }

    return initialPath;
  });
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(null);
  const [sessionStatus, setSessionStatus] = useState(() =>
    getStoredToken() ? "restoring" : "unauthenticated",
  );
  const [sessionError, setSessionError] = useState("");
  const [sessionAttempt, setSessionAttempt] = useState(0);
  const [dataState, setDataState] = useState({});
  const authInFlight = useRef(false);
  const activeToken = useRef(token);
  activeToken.current = token;
  const sectionGeneration = useRef({});
  const searchController = useRef(null);
  const searchGeneration = useRef(0);
  const [searchPage, setSearchPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [authMode, setAuthMode] = useState("register");
  const [authForm, setAuthForm] = useState(DEFAULT_AUTH_FORM);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("dune");
  const [searchResults, setSearchResults] = useState([]);
  const [searchState, setSearchState] = useState({ loading: false, error: "" });
  const [recentSearches, setRecentSearches] = useState(() =>
    getInitialRecentSearches(),
  );
  const [shelves, setShelves] = useState({
    want_to_read: [],
    currently_reading: [],
    finished: [],
    did_not_finish: [],
  });
  const [discoverShelfState, setDiscoverShelfState] = useState({});
  const [libraryPageDrafts, setLibraryPageDrafts] = useState({});
  const [libraryShelfDrafts, setLibraryShelfDrafts] = useState({});
  const [libraryShelfState, setLibraryShelfState] = useState({});
  const [reviewSaveState, setReviewSaveState] = useState({});
  const [reviewActionState, setReviewActionState] = useState({});
  const [reviewDrafts, setReviewDrafts] = useState(DEFAULT_REVIEW_DRAFTS);
  const [personalReviews, setPersonalReviews] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [communityQuery, setCommunityQuery] = useState("");
  const [communityProfile, setCommunityProfile] = useState(null);
  const [communityReviews, setCommunityReviews] = useState([]);
  const [communityState, setCommunityState] = useState(DEFAULT_COMMUNITY_STATE);
  const [followingUsers, setFollowingUsers] = useState([]);

  useEffect(() => {
    function handlePopstate() {
      const nextPath = normalizePath(window.location.pathname);

      if (window.location.pathname !== nextPath) {
        window.history.replaceState({}, "", nextPath);
      }

      setPathname(nextPath);
    }

    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, []);

  useEffect(() => {
    if (pathname === ROUTES.login) {
      setAuthMode("login");
    } else if (pathname === ROUTES.register) {
      setAuthMode("register");
    }
  }, [pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setSessionStatus("unauthenticated");
      setDataState({});
      setShelves({
        want_to_read: [],
        currently_reading: [],
        finished: [],
        did_not_finish: [],
      });
      setAnalytics(null);
      setRecommendations([]);
      setFeedItems([]);
      setPersonalReviews([]);
      setFollowingUsers([]);
      setCommunityProfile(null);
      setCommunityReviews([]);
      setCommunityState(DEFAULT_COMMUNITY_STATE);
      setDiscoverShelfState({});
      setLibraryPageDrafts({});
      setLibraryShelfDrafts({});
      setLibraryShelfState({});
      setReviewActionState({});
      setReviewSaveState({});
      setReviewDrafts({});
      try {
        window.localStorage.removeItem("book-platform-token");
      } catch {}
      return;
    }

    try {
      window.localStorage.setItem("book-platform-token", token);
    } catch {
      /* session remains usable in this tab */
    }
    const controller = new AbortController();
    let cancelled = false;
    async function restore() {
      setSessionStatus("restoring");
      setSessionError("");
      try {
        const payload = await getCurrentUser(token, controller.signal);
        if (!payload?.user?.id)
          throw new Error("The account service returned an invalid response.");
        if (!cancelled) {
          setUser(payload.user);
          setSessionStatus("authenticated");
        }
      } catch (error) {
        if (cancelled) return;
        if (error.status === 401) {
          setToken("");
          setUser(null);
          setSessionStatus("unauthenticated");
          setAuthError("Your session has expired. Please sign in again.");
        } else {
          setSessionStatus("error");
          setSessionError(error.message);
        }
      }
    }
    restore();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token, sessionAttempt]);

  useEffect(() => {
    if (
      sessionStatus === "authenticated" &&
      token &&
      user &&
      [ROUTES.login, ROUTES.register].includes(pathname)
    )
      navigate(ROUTES.dashboard);
  }, [sessionStatus, token, user, pathname]);

  useEffect(() => {
    const protectedPage = [
      ROUTES.dashboard,
      ROUTES.library,
      ROUTES.insights,
    ].includes(pathname);
    if (protectedPage && !token) navigate(ROUTES.login);
  }, [pathname, token]);

  useEffect(() => {
    if (user?.id && token) refreshPersonalizedData(token, user);
  }, [user?.id, token]);

  useEffect(() => {
    if (!user?.id) {
      setFollowingUsers([]);
      return;
    }

    let cancelled = false;

    async function loadInitialFollowing() {
      try {
        const payload = await getFollowing(user.id);

        if (!cancelled && activeToken.current === token) {
          setFollowingUsers(payload.following ?? []);
        }
      } catch (_error) {
        if (!cancelled && activeToken.current === token) {
          setFollowingUsers([]);
        }
      }
    }

    loadInitialFollowing();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function loadSection(key, operation, apply, currentToken) {
    if (!currentToken) return;
    const generation = (sectionGeneration.current[key] ?? 0) + 1;
    sectionGeneration.current[key] = generation;
    setDataState((current) => ({
      ...current,
      [key]: { loading: true, error: "" },
    }));
    try {
      const payload = await operation();
      if (
        activeToken.current !== currentToken ||
        sectionGeneration.current[key] !== generation
      )
        return;
      apply(payload);
      setDataState((current) => ({
        ...current,
        [key]: { loading: false, error: "" },
      }));
    } catch (error) {
      if (
        activeToken.current !== currentToken ||
        sectionGeneration.current[key] !== generation
      )
        return;
      // A downstream 401 can also mean misconfigured secrets; never erase a verified session here.
      setDataState((current) => ({
        ...current,
        [key]: { loading: false, error: error.message },
      }));
    }
  }

  async function loadInsights(currentToken) {
    return Promise.allSettled([
      loadSection(
        "Insights",
        () => getAnalyticsSummary(currentToken),
        setAnalytics,
        currentToken,
      ),
      loadSection(
        "Recommendations",
        () => getRecommendations(currentToken),
        (p) => setRecommendations(p.recommendations ?? []),
        currentToken,
      ),
      loadSection(
        "Activity",
        () => getFeed(currentToken),
        (p) => setFeedItems(p.items ?? []),
        currentToken,
      ),
    ]);
  }

  async function refreshPersonalizedData(
    currentToken = token,
    currentUser = user,
  ) {
    if (!currentToken) return;
    void loadInsights(currentToken);
    return Promise.allSettled([
      loadSection(
        "Library",
        () => getShelves(currentToken),
        (shelfData) => {
          setShelves(shelfData);
          const entries = Object.values(shelfData).flat();
          setLibraryShelfDrafts(
            Object.fromEntries(entries.map((e) => [e.entryId, e.status])),
          );
          setLibraryPageDrafts(
            Object.fromEntries(
              entries.map((e) => [e.entryId, e.currentPage ?? 0]),
            ),
          );
        },
        currentToken,
      ),
      loadSection(
        "Reviews",
        () => getMyReviews(currentToken),
        (payload) => {
          const reviews = payload.reviews ?? [];
          setPersonalReviews(reviews);
          setReviewDrafts(
            Object.fromEntries(
              reviews.map((r) => [
                r.bookId,
                { rating: String(r.rating), reviewText: r.reviewText ?? "" },
              ]),
            ),
          );
          if (currentUser?.id === communityProfile?.id)
            setCommunityReviews(reviews);
        },
        currentToken,
      ),
    ]);
  }

  function handleReviewDraftChange(bookId, field, value) {
    setReviewDrafts((current) => ({
      ...current,
      [bookId]: {
        ...(current[bookId] ?? { rating: "", reviewText: "" }),
        [field]: value,
      },
    }));

    setReviewSaveState((current) => {
      if (!current[bookId]) {
        return current;
      }

      const next = { ...current };
      delete next[bookId];
      return next;
    });
  }

  function handleLibraryShelfDraftChange(entryId, value) {
    setLibraryShelfDrafts((current) => ({
      ...current,
      [entryId]: value,
    }));

    setLibraryShelfState((current) => {
      if (!current[entryId]) {
        return current;
      }

      const next = { ...current };
      delete next[entryId];
      return next;
    });
  }

  function handleLibraryPageDraftChange(entryId, value) {
    const numericValue = Number.parseInt(value, 10);

    setLibraryPageDrafts((current) => ({
      ...current,
      [entryId]: Number.isNaN(numericValue) ? 0 : Math.max(0, numericValue),
    }));

    setLibraryShelfState((current) => {
      if (!current[entryId]) {
        return current;
      }

      const next = { ...current };
      delete next[entryId];
      return next;
    });
  }

  async function refreshFollowingUsers(currentUserId = user?.id) {
    if (!currentUserId) {
      setFollowingUsers([]);
      return [];
    }

    try {
      const payload = await getFollowing(currentUserId);
      const nextFollowing = payload.following ?? [];
      setFollowingUsers(nextFollowing);
      return nextFollowing;
    } catch (_error) {
      setFollowingUsers([]);
      return [];
    }
  }

  function handleAuthModeToggle() {
    navigate(authMode === "register" ? ROUTES.login : ROUTES.register);
  }

  function handleAuthFieldChange(field, value) {
    setAuthForm((current) => ({ ...current, [field]: value }));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    if (authInFlight.current) return;
    authInFlight.current = true;
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

      setUser(payload.user);
      setSessionStatus("authenticated");
      setToken(payload.token);
      setAuthForm(DEFAULT_AUTH_FORM);
      // Redirect after React commits the token; native popstate can otherwise race auth state.
    } catch (error) {
      setAuthError(error.message);
    } finally {
      authInFlight.current = false;
      setAuthLoading(false);
    }
  }

  useEffect(() => () => searchController.current?.abort(), []);

  function storeRecentSearch(query) {
    setRecentSearches((current) => {
      const next = [
        query,
        ...current.filter((item) => item.toLowerCase() !== query.toLowerCase()),
      ].slice(0, 5);
      try {
        window.localStorage.setItem(
          RECENT_SEARCH_STORAGE_KEY,
          JSON.stringify(next),
        );
      } catch {}
      return next;
    });
  }

  async function runSearch(query, page = 1) {
    searchController.current?.abort();
    const controller = new AbortController();
    searchController.current = controller;
    const generation = ++searchGeneration.current;
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setSearchResults([]);
      setSearchState({
        loading: false,
        error: "Enter a title, author, or genre to start exploring.",
      });
      return;
    }

    setSearchState({ loading: true, error: "" });
    if (page === 1) setSearchResults([]);

    try {
      const payload = await searchBooks(
        normalizedQuery,
        page,
        controller.signal,
      );
      if (generation !== searchGeneration.current) return;
      setSearchResults((current) => [
        ...new Map(
          [...(page > 1 ? current : []), ...(payload.results ?? [])].map(
            (b) => [b.id, b],
          ),
        ).values(),
      ]);
      setSearchPage(page);
      setHasMore(Boolean(payload.hasMore));
      setSearchState({
        loading: false,
        error: "",
        warning: payload.warning,
        searched: true,
      });
      storeRecentSearch(normalizedQuery);
    } catch (error) {
      if (generation !== searchGeneration.current) return;
      setSearchResults([]);
      setSearchState({ loading: false, error: error.message });
      return;
    }
  }

  async function handleSearch(event) {
    event?.preventDefault();
    await runSearch(searchQuery);
  }

  async function handleSuggestionSelect(term) {
    setSearchQuery(term);
    if (pathname !== ROUTES.discover) {
      navigate(ROUTES.discover);
    }
    await runSearch(term);
  }

  async function handleShelfSave(bookId, status) {
    if (!token) {
      setAuthError("Sign in to save books to your shelves.");
      navigate(ROUTES.login);
      return;
    }

    try {
      setDiscoverShelfState((current) => ({
        ...current,
        [bookId]: {
          status: "saving",
          message: `Saving to ${formatShelfName(status)}...`,
        },
      }));
      const existing = Object.values(shelves)
        .flat()
        .find((e) => e.bookId === bookId);
      await saveShelfEntry(token, {
        bookId,
        status,
        currentPage: existing?.currentPage ?? 0,
      });
      await refreshPersonalizedData();
      setDiscoverShelfState((current) => ({
        ...current,
        [bookId]: {
          status: "saved",
          message: `Saved to ${formatShelfName(status)}.`,
        },
      }));
    } catch (error) {
      setDiscoverShelfState((current) => ({
        ...current,
        [bookId]: {
          status: "error",
          message: error.message,
        },
      }));
    }
  }

  async function handleLibraryShelfMove(entry) {
    if (!token) {
      navigate(ROUTES.login);
      return;
    }

    const nextStatus = libraryShelfDrafts[entry.entryId] ?? entry.status;

    if (nextStatus === entry.status) {
      setLibraryShelfState((current) => ({
        ...current,
        [entry.entryId]: {
          status: "error",
          message: "Choose a different shelf before updating.",
        },
      }));
      return;
    }

    try {
      setLibraryShelfState((current) => ({
        ...current,
        [entry.entryId]: {
          status: "saving",
          message: `Moving to ${formatShelfName(nextStatus)}...`,
        },
      }));
      await saveShelfEntry(token, {
        bookId: entry.bookId,
        status: nextStatus,
        currentPage: entry.currentPage,
      });
      await refreshPersonalizedData();
      setLibraryShelfState((current) => ({
        ...current,
        [entry.entryId]: {
          status: "saved",
          message: `Moved to ${formatShelfName(nextStatus)}.`,
        },
      }));
    } catch (error) {
      setLibraryShelfState((current) => ({
        ...current,
        [entry.entryId]: {
          status: "error",
          message: error.message,
        },
      }));
    }
  }

  async function handleLibraryShelfDelete(entry) {
    if (!token) {
      navigate(ROUTES.login);
      return;
    }

    try {
      setLibraryShelfState((current) => ({
        ...current,
        [entry.entryId]: {
          status: "saving",
          message: "Removing from your library...",
        },
      }));
      await deleteShelfEntry(token, entry.entryId);
      await refreshPersonalizedData();
      setLibraryShelfState((current) => ({
        ...current,
        [entry.entryId]: {
          status: "saved",
          message: "Removed from your library.",
        },
      }));
    } catch (error) {
      setLibraryShelfState((current) => ({
        ...current,
        [entry.entryId]: {
          status: "error",
          message: error.message,
        },
      }));
    }
  }

  async function handleLibraryProgressUpdate(entry) {
    if (!token) {
      navigate(ROUTES.login);
      return;
    }

    const nextPage = Number(
      libraryPageDrafts[entry.entryId] ?? entry.currentPage ?? 1,
    );

    if (
      !Number.isFinite(nextPage) ||
      !Number.isInteger(nextPage) ||
      nextPage < 0
    ) {
      setLibraryShelfState((current) => ({
        ...current,
        [entry.entryId]: {
          status: "error",
          message: "Enter a valid page number.",
        },
      }));
      return;
    }

    if (nextPage === entry.currentPage) {
      setLibraryShelfState((current) => ({
        ...current,
        [entry.entryId]: {
          status: "error",
          message: "Choose a different page number before updating.",
        },
      }));
      return;
    }

    try {
      setLibraryShelfState((current) => ({
        ...current,
        [entry.entryId]: {
          status: "saving",
          message: `Updating to page ${nextPage}...`,
        },
      }));
      await updateShelfProgress(token, entry.entryId, {
        currentPage: nextPage,
      });
      await refreshPersonalizedData();
      setLibraryShelfState((current) => ({
        ...current,
        [entry.entryId]: {
          status: "saved",
          message: `Current page updated to ${nextPage}.`,
        },
      }));
    } catch (error) {
      setLibraryShelfState((current) => ({
        ...current,
        [entry.entryId]: {
          status: "error",
          message: error.message,
        },
      }));
    }
  }

  async function handleReviewSave(bookId) {
    if (!token) {
      setAuthError("Sign in to leave reviews.");
      navigate(ROUTES.login);
      return;
    }

    const draft = reviewDrafts[bookId];

    if (!draft?.rating) {
      setReviewSaveState((current) => ({
        ...current,
        [bookId]: {
          status: "error",
          message: "Choose a rating before saving your review.",
        },
      }));
      return;
    }

    try {
      setReviewSaveState((current) => ({
        ...current,
        [bookId]: {
          status: "saving",
          message: "Saving your review...",
        },
      }));
      await saveReview(token, {
        bookId,
        rating: Number(draft.rating),
        reviewText: draft.reviewText ?? "",
      });
      await refreshPersonalizedData();
      setReviewSaveState((current) => ({
        ...current,
        [bookId]: {
          status: "saved",
          message: "Review saved to your profile.",
        },
      }));
    } catch (error) {
      setReviewSaveState((current) => ({
        ...current,
        [bookId]: {
          status: "error",
          message: error.message,
        },
      }));
    }
  }

  async function handleDeleteReview(review) {
    if (!token) {
      navigate(ROUTES.login);
      return;
    }

    try {
      setReviewActionState((current) => ({
        ...current,
        [review.id]: {
          status: "saving",
          message: "Removing review...",
        },
      }));
      await deleteReview(token, review.id);
      await refreshPersonalizedData();
      setReviewActionState((current) => ({
        ...current,
        [review.id]: {
          status: "saved",
          message: "Review removed.",
        },
      }));
    } catch (error) {
      setReviewActionState((current) => ({
        ...current,
        [review.id]: {
          status: "error",
          message: error.message,
        },
      }));
    }
  }

  async function loadCommunityProfile(username) {
    const normalizedUsername = username.trim().replace(/^@/, "").toLowerCase();

    if (!normalizedUsername) {
      setCommunityProfile(null);
      setCommunityState({
        loading: false,
        error: "Enter a username to look up a reader.",
        actionLoading: false,
      });
      return;
    }

    setCommunityState({
      loading: true,
      error: "",
      actionLoading: false,
    });

    try {
      const payload = await getUserProfile(normalizedUsername);
      setCommunityProfile(payload.profile);
      let reviewPayload = { reviews: [] };
      try {
        reviewPayload = await getUserReviews(payload.profile.id);
      } catch (error) {
        setDataState((current) => ({
          ...current,
          "Public reviews": { loading: false, error: error.message },
        }));
      }

      setCommunityReviews(reviewPayload.reviews ?? []);
      setCommunityQuery(payload.profile.username);
      setCommunityState({
        loading: false,
        error: "",
        actionLoading: false,
      });
    } catch (error) {
      setCommunityProfile(null);
      setCommunityReviews([]);
      setCommunityState({
        loading: false,
        error: error.message,
        actionLoading: false,
      });
    }
  }

  async function handleCommunitySearch(event) {
    event?.preventDefault();
    await loadCommunityProfile(communityQuery);
  }

  async function handleSelectProfile(username) {
    if (pathname !== ROUTES.community) {
      navigate(ROUTES.community);
    }

    await loadCommunityProfile(username);
  }

  async function handleToggleFollow(profile) {
    if (!token) {
      navigate(ROUTES.login);
      return;
    }

    const alreadyFollowing = followingUsers.some(
      (reader) => reader.id === profile.id,
    );
    setCommunityState((current) => ({
      ...current,
      actionLoading: true,
      error: "",
    }));

    try {
      if (alreadyFollowing) {
        await unfollowUser(token, profile.id);
      } else {
        await followUser(token, profile.id);
      }

      const [profilePayload, reviewPayload] = await Promise.all([
        getUserProfile(profile.username),
        getUserReviews(profile.id),
        refreshFollowingUsers(),
        loadInsights(token),
      ]);

      setCommunityProfile(profilePayload.profile);
      setCommunityReviews(reviewPayload.reviews ?? []);
      setCommunityState((current) => ({
        ...current,
        actionLoading: false,
        error: "",
      }));
    } catch (error) {
      setCommunityState((current) => ({
        ...current,
        actionLoading: false,
        error: error.message,
      }));
    }
  }

  function handleSignOut() {
    activeToken.current = "";
    setUser(null);
    setSessionStatus("unauthenticated");
    setSessionError("");
    setToken("");
    setAuthError("");
    setCommunityQuery("");
    setCommunityReviews([]);
    navigate(ROUTES.about);
  }

  let content = null;

  if (pathname === ROUTES.features) {
    content = <FeaturesPage user={user} />;
  } else if (
    [ROUTES.dashboard, ROUTES.library, ROUTES.insights].includes(pathname)
  ) {
    content = (
      <DashboardPage
        mode={pathname}
        dataState={dataState}
        feedItems={feedItems}
        analytics={analytics}
        pageDrafts={libraryPageDrafts}
        recommendations={recommendations}
        reviewActionState={reviewActionState}
        reviews={personalReviews}
        shelves={shelves}
        shelfActionState={libraryShelfState}
        shelfDrafts={libraryShelfDrafts}
        token={token}
        onRefresh={() => {
          void refreshPersonalizedData();
        }}
        onDeleteReview={handleDeleteReview}
        onPageDraftChange={handleLibraryPageDraftChange}
        onProgressUpdate={handleLibraryProgressUpdate}
        onShelfDelete={handleLibraryShelfDelete}
        onShelfDraftChange={handleLibraryShelfDraftChange}
        onShelfMove={handleLibraryShelfMove}
        user={user}
      />
    );
  } else if (pathname === ROUTES.discover) {
    content = (
      <DiscoverPage
        hasMore={hasMore}
        onLoadMore={() => runSearch(searchQuery, searchPage + 1)}
        shelfActionState={discoverShelfState}
        token={token}
        recentSearches={recentSearches}
        reviewSaveState={reviewSaveState}
        reviewDrafts={reviewDrafts}
        searchQuery={searchQuery}
        searchResults={searchResults}
        searchState={searchState}
        onReviewDraftChange={handleReviewDraftChange}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        onSuggestionSelect={handleSuggestionSelect}
        onShelfSave={handleShelfSave}
        onReviewSave={handleReviewSave}
      />
    );
  } else if (pathname.startsWith("/books/")) {
    content = (
      <Suspense fallback={<p role="status">Opening book…</p>}>
        <BookDetails
          key={pathname}
          bookId={pathname.split("/")[2]}
          token={token}
          shelves={shelves}
          onShelfSave={handleShelfSave}
          shelfState={discoverShelfState}
          reviewDrafts={reviewDrafts}
          onReviewDraftChange={handleReviewDraftChange}
          onReviewSave={handleReviewSave}
          reviewSaveState={reviewSaveState}
        />
      </Suspense>
    );
  } else if (pathname === ROUTES.community) {
    content = (
      <CommunityPage
        communityProfile={communityProfile}
        communityReviews={communityReviews}
        communityQuery={communityQuery}
        communityState={communityState}
        feedItems={feedItems}
        followingUsers={followingUsers}
        setCommunityQuery={setCommunityQuery}
        token={token}
        user={user}
        onProfileSearch={handleCommunitySearch}
        onSelectProfile={handleSelectProfile}
        onProfileSaved={(updated) => {
          setUser(updated);
          setCommunityProfile((current) => ({ ...current, ...updated }));
        }}
        onToggleFollow={handleToggleFollow}
      />
    );
  } else if (pathname === ROUTES.login || pathname === ROUTES.register) {
    content = (
      <AuthPage
        user={user}
        authMode={authMode}
        authForm={authForm}
        authLoading={authLoading}
        authError={authError}
        onAuthSubmit={handleAuthSubmit}
        onFormChange={handleAuthFieldChange}
        onToggleMode={handleAuthModeToggle}
        onSignOut={handleSignOut}
        onProfile={() => handleSelectProfile(user.username)}
      />
    );
  } else {
    content = <AboutPage user={user} />;
  }

  return (
    <>
      <SiteHeader
        pathname={pathname}
        user={user}
        onLogin={() => navigate(ROUTES.login)}
        onRegister={() => navigate(ROUTES.register)}
        onSignOut={handleSignOut}
        onProfile={() => handleSelectProfile(user.username)}
      />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <main id="main-content" className="app-shell">
        {sessionStatus === "restoring" && (
          <p role="status" className="notice">
            Restoring your session…
          </p>
        )}
        {sessionStatus === "error" && (
          <div className="notice" role="alert">
            {sessionError}{" "}
            <button
              className="ghost-button"
              onClick={() => setSessionAttempt((x) => x + 1)}
            >
              Retry session
            </button>
            <button className="ghost-button" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        )}
        {Object.entries(dataState)
          .filter(([, v]) => v?.error)
          .map(([key, v]) => (
            <div className="notice" role="alert" key={key}>
              {key}: {v.error}{" "}
              <button
                className="ghost-button"
                onClick={() => refreshPersonalizedData()}
              >
                Retry
              </button>
            </div>
          ))}
        {content}
      </main>
      <SiteFooter />
    </>
  );
}
