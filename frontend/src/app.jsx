import React, { useEffect, useState } from "react";

import {
  getAnalyticsSummary,
  getCurrentUser,
  getFeed,
  getRecommendations,
  getShelves,
  loginUser,
  registerUser,
  saveReview,
  saveShelfEntry,
  searchBooks,
} from "./api";

const ROUTES = {
  about: "/",
  features: "/features",
  dashboard: "/dashboard",
  discover: "/discover",
  community: "/community",
  login: "/login",
  register: "/register",
};

const NAV_ITEMS = [
  { label: "Features", path: ROUTES.features },
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
const SEARCH_SUGGESTIONS = ["Dune", "Octavia Butler", "Fantasy", "Japanese literature", "Historical fiction"];
const RECENT_SEARCH_STORAGE_KEY = "readlytics-recent-searches";

const FEATURE_PREVIEW_ITEMS = [
  {
    title: "Reading Insights",
    description: "See your pace, favorite genres, rating trends, and reading streaks in one calm, focused view.",
  },
  {
    title: "Personalized Recommendations",
    description: "Get book suggestions shaped by your shelves, recent reviews, and the authors you keep coming back to.",
  },
  {
    title: "Social Reading",
    description: "Follow readers you trust, compare taste, and keep an eye on the books lighting up your community.",
  },
];

const SHELF_INTROS = {
  want_to_read: "Build your next-up list with books you want to keep in sight.",
  currently_reading: "Track what is open on your nightstand right now.",
  finished: "Celebrate the titles you have already completed.",
  did_not_finish: "Keep a record of the books that did not quite land.",
};

const RECOMMENDATION_PLACEHOLDERS = [
  {
    title: "Recommendation ready",
    description: "We will learn from the books you shelve, rate, and review.",
  },
  {
    title: "Taste profile building",
    description: "Every page tracked helps sharpen what we suggest next.",
  },
];

const SUPPORT_ITEMS = [
  "Build shelves that reflect what you want to read, what you are reading now, and what you have finished.",
  "Track progress, rate books quickly, and leave thoughtful notes while the reading experience is fresh.",
  "Unlock insights and recommendations that sharpen as your library and habits grow.",
];

function normalizePath(pathname) {
  const trimmed = pathname?.replace(/\/+$/, "") || ROUTES.about;
  const normalized = trimmed === "" ? ROUTES.about : trimmed;

  return Object.values(ROUTES).includes(normalized) ? normalized : ROUTES.about;
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

function getInitialRecentSearches() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(RECENT_SEARCH_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
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

function SiteHeader({ pathname, user, onLogin, onRegister, onSignOut }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <button className="site-logo" type="button" onClick={() => navigate(ROUTES.about)}>
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
              <button className="nav-user-chip" type="button" onClick={() => navigate(ROUTES.dashboard)}>
                <span className="nav-avatar">{getInitials(user.displayName)}</span>
                <span className="nav-user-copy">
                  <strong>{user.displayName}</strong>
                  <span>@{user.username}</span>
                </span>
              </button>
              <button className="ghost-button nav-auth-button" type="button" onClick={onSignOut}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <button className="ghost-button nav-auth-button" type="button" onClick={onLogin}>
                Log In
              </button>
              <button className="primary-button nav-auth-button" type="button" onClick={onRegister}>
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
            Readlytics helps readers organize their shelves, understand their habits, and find the books that fit next.
          </p>
          <p className="footer-copyright">© 2025 Readlytics. All rights reserved.</p>
        </div>

        <nav className="footer-links" aria-label="Footer">
          <button className="footer-link" type="button" onClick={() => navigate(ROUTES.about)}>
            About
          </button>
          <button className="footer-link" type="button" onClick={() => navigate(ROUTES.features)}>
            Features
          </button>
          <button className="footer-link" type="button" onClick={() => navigate(ROUTES.community)}>
            Community
          </button>
          <a className="footer-link" href="https://github.com" rel="noreferrer" target="_blank">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}

function PageBanner({ eyebrow, title, description, actions }) {
  return (
    <section className="page-banner panel reveal-section">
      <div className="page-banner-copy">
        <span className="section-kicker">{eyebrow}</span>
        <h1 className="page-banner-title">{title}</h1>
        <p className="page-banner-description">{description}</p>
      </div>
      {actions?.length ? (
        <div className="page-banner-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              className={action.variant === "primary" ? "primary-button" : "ghost-button"}
              type="button"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function HeroSection({ user, spotlightFeatures }) {
  return (
    <section className="hero reveal-section">
      <div className="hero-grid">
        <div className="hero-copy">
          <header className="hero-heading">
            <h1>Readlytics</h1>
          </header>
          <p className="intro">
            A social platform for tracking books, analyzing reading habits, and discovering personalized recommendations.
          </p>
          <div className="hero-badge-row">
            <span className="hero-badge">For Every Reader</span>
          </div>
          <div className="hero-actions">
            <button
              className="primary-button hero-primary-button"
              type="button"
              onClick={() => navigate(user ? ROUTES.dashboard : ROUTES.register)}
            >
              {user ? "Open Dashboard" : "Get Started"}
            </button>
            <button
              className="secondary-button hero-secondary-button"
              type="button"
              onClick={() => navigate(user ? ROUTES.discover : ROUTES.features)}
            >
              {user ? "Discover Books" : "Explore Features"}
            </button>
          </div>
          <p className="hero-microcopy">
            Track your reading, understand your habits, and discover your next favorite book.
          </p>
        </div>

        <aside className="hero-spotlight">
          <span className="spotlight-label">{user ? "Inside your reading room" : "Product highlights"}</span>
          <h3 className="spotlight-title">
            {user ? `Welcome back, ${user.displayName}.` : "A calmer home for every part of your reading life."}
          </h3>
          <p className="spotlight-copy">
            {user
              ? "Your shelves, trends, and tailored recommendations are all gathered in one calm, focused space."
              : "Organize your shelves, capture your reactions, and let Readlytics turn that history into useful insight."}
          </p>

          <div className="hero-feature-grid">
            {spotlightFeatures.map((feature) => (
              <article key={feature.title} className="hero-feature-card">
                <span className="hero-feature-kicker">{feature.title}</span>
                <strong className="hero-feature-headline">{feature.headline}</strong>
                <span className="hero-feature-eyebrow">{feature.eyebrow}</span>
                <p className="hero-feature-copy">{feature.description}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function FeaturePreviewSection() {
  return (
    <section className="feature-preview-section reveal-section" aria-labelledby="feature-preview-heading">
      <header className="feature-preview-header">
        <p className="section-kicker">Why readers stay</p>
        <h2 id="feature-preview-heading">Everything you need to turn reading into a richer routine.</h2>
        <p className="section-description">
          Readlytics keeps your habits, recommendations, and community moments in one refined product flow.
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

function EmptyState({ title, copy, buttonLabel, buttonVariant = "ghost", onButtonClick }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon">RL</span>
      <div className="empty-state-copy-block">
        <p className="empty-state-title">{title}</p>
        <p className="empty-state-copy">{copy}</p>
      </div>
      {buttonLabel ? (
        <button
          className={buttonVariant === "primary" ? "primary-button empty-state-button" : "ghost-button empty-state-button"}
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
  return (
    <article className="panel auth-panel reveal-section">
      <div className="panel-header">
        <div>
          <h2>{user ? "Your Account" : authMode === "register" ? "Registration" : "Welcome Back"}</h2>
          <p className="panel-description">
            {user
              ? "Keep your profile close and your next read even closer."
              : authMode === "register"
                ? "Create your space and start building a reading life that feels like home."
                : "Sign in to return to your shelves, reviews, and recommendations."}
          </p>
        </div>
        {!user ? (
          <button className="ghost-button auth-switch-button" type="button" onClick={onToggleMode}>
            {authMode === "register" ? "Have an account? Log In" : "Need an account? Register"}
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
                  onChange={(event) => onFormChange("displayName", event.target.value)}
                  placeholder="Reader One"
                />
              </label>
              <label>
                Username
                <input
                  value={authForm.username}
                  onChange={(event) => onFormChange("username", event.target.value)}
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
              placeholder="reader@example.com"
              type="email"
            />
          </label>

          <label>
            Password
            <input
              value={authForm.password}
              onChange={(event) => onFormChange("password", event.target.value)}
              placeholder="password123"
              type="password"
            />
          </label>

          <button className="primary-button auth-submit-button" disabled={authLoading} type="submit">
            {authLoading ? "Saving..." : authMode === "register" ? "Create Your Account" : "Continue Reading"}
          </button>
          <p className="auth-helper-text">No credit card required. Set up your reading home in under a minute.</p>
          {authError ? <p className="error-text">{authError}</p> : null}
        </form>
      )}
    </article>
  );
}

function AuthSupportPanel({ user }) {
  return (
    <aside className="panel support-panel reveal-section">
      <div className="panel-header">
        <div>
          <h2>{user ? "Your reading setup is ready." : "What you unlock with Readlytics"}</h2>
          <p className="panel-description">
            {user
              ? "Keep exploring, tracking, and refining your taste profile from one focused workspace."
              : "A focused reading platform that helps your habits, notes, and recommendations stay in one place."}
          </p>
        </div>
      </div>

      <div className="support-list">
        {SUPPORT_ITEMS.map((item) => (
          <div key={item} className="support-list-item">
            <span className="support-list-mark">RL</span>
            <p>{item}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function InsightsPanel({ token, analytics }) {
  return (
    <article className="panel reveal-section">
      <div className="panel-header">
        <div>
          <h2>Reader&apos;s Retreat</h2>
          <p className="panel-description">
            Your cozy corner for tracking progress, habits, ratings, and the genres you keep coming back to.
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
          {analytics.favoriteGenres?.length ? (
            <p className="genre-line">Top genres: {analytics.favoriteGenres.join(", ")}</p>
          ) : null}
        </>
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
  token,
  recentSearches,
  reviewDrafts,
  searchQuery,
  searchResults,
  searchState,
  shelfMessage,
  setSearchQuery,
  setReviewDrafts,
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
            Search for new titles, save them to a shelf, and leave a quick review while inspiration is fresh.
          </p>
        </div>
      </div>

      <form className="search-row" onSubmit={onSearch}>
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search for books, authors, or genres..."
        />
        <button className="primary-button" disabled={searchState.loading} type="submit">
          {searchState.loading ? "Searching..." : "Search"}
        </button>
      </form>

      <div className="search-helper-row">
        <span className="search-helper-label">{recentSearches.length ? "Recent searches" : "Popular searches"}</span>
        <div className="suggestion-chip-row">
          {(recentSearches.length ? recentSearches : SEARCH_SUGGESTIONS).map((term) => (
            <button key={term} className="suggestion-chip" type="button" onClick={() => onSuggestionSelect(term)}>
              {term}
            </button>
          ))}
        </div>
      </div>

      {searchState.error ? <p className="error-text">{searchState.error}</p> : null}
      {shelfMessage ? <p className="success-text">{shelfMessage}</p> : null}

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
              const reviewDraft = reviewDrafts[book.id] ?? { rating: "", reviewText: "" };

              return (
                <article key={book.id} className="book-card">
                  <div className="book-card-top">
                    <div className="book-cover-shell">
                      {book.coverImageUrl ? (
                        <img className="book-cover-image" src={book.coverImageUrl} alt={`Cover for ${book.title}`} />
                      ) : (
                        <div className="book-cover-fallback">RL</div>
                      )}
                    </div>

                    <div className="book-copy">
                      <p className="book-title">{book.title}</p>
                      <p className="muted-text">{(book.authors ?? []).join(", ") || "Unknown author"}</p>
                      <p className="muted-text small-text">
                        {book.publishedYear ? `First published ${book.publishedYear}` : "Publication year unavailable"}
                      </p>
                    </div>
                  </div>

                  <div className="action-cluster">
                    <div className="button-row">
                      {SHELF_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          className="secondary-button"
                          type="button"
                          onClick={() => onShelfSave(book.id, option.value)}
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
                      <button className="ghost-button" type="button" onClick={() => onReviewSave(book.id)}>
                        Save Review
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            title="Start your next search."
            copy="Look up a title, author, or genre to start building your shelves and recommendations."
            buttonLabel={token ? "Try a Popular Search" : "Create an Account"}
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
    </article>
  );
}

function LibraryPanel({ shelves, token, onRefresh }) {
  return (
    <article className="panel wide-panel reveal-section">
      <div className="panel-header">
        <div>
          <h2>Your Library</h2>
          <p className="panel-description">
            Every saved title, neatly organized so your next read is always within reach.
          </p>
        </div>
        <button className="ghost-button" type="button" onClick={onRefresh} disabled={!token}>
          Refresh
        </button>
      </div>

      <div className="shelf-grid">
        {Object.entries(shelves).map(([shelfName, entries]) => (
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
                    <strong>{entry.title}</strong>
                    <span>{(entry.authors ?? []).join(", ")}</span>
                    <span>Current page: {entry.currentPage}</span>
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

function RecommendationsPanel({ token, recommendations }) {
  return (
    <article className="panel wide-panel reveal-section">
      <div className="panel-header">
        <div>
          <h2>Picked For You</h2>
          <p className="panel-description">
            Personalized suggestions based on the books, authors, and genres you&apos;ve been enjoying.
          </p>
        </div>
      </div>
      {token && recommendations.length ? (
        <div className="recommendation-grid">
          {recommendations.map((recommendation) => (
            <article key={recommendation.bookId} className="recommendation-card">
              <div className="recommendation-top">
                <div className="recommendation-cover-shell">
                  {recommendation.coverImageUrl ? (
                    <img className="book-cover-image" src={recommendation.coverImageUrl} alt={`Cover for ${recommendation.title}`} />
                  ) : (
                    <div className="book-cover-fallback">RL</div>
                  )}
                </div>
                <div className="recommendation-copy">
                  <strong>{recommendation.title}</strong>
                  <span>{recommendation.reason}</span>
                </div>
              </div>
              <span className="score-chip">{recommendation.score}</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="recommendation-state">
          <div className="recommendation-grid recommendation-placeholder-grid">
            {RECOMMENDATION_PLACEHOLDERS.map((item) => (
              <article key={item.title} className="recommendation-card recommendation-placeholder-card">
                <div className="recommendation-top">
                  <div className="recommendation-cover-shell">
                    <div className="book-cover-fallback">RL</div>
                  </div>
                  <div className="recommendation-copy">
                    <strong>{item.title}</strong>
                    <span>{item.description}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <EmptyState
            title={token ? "Your recommendation engine is warming up." : "Recommendations are ready when you are."}
            copy={
              token
                ? "Add more books, shelves, and reviews so Readlytics can tailor suggestions to your reading habits."
                : "Sign in to see recommendations tailored to your reading habits."
            }
            buttonLabel={token ? "Discover More Books" : "Sign Up"}
            buttonVariant="primary"
            onButtonClick={() => navigate(token ? ROUTES.discover : ROUTES.register)}
          />
        </div>
      )}
    </article>
  );
}

function CommunityPanel({ token, feedItems }) {
  return (
    <article className="panel wide-panel reveal-section">
      <div className="panel-header">
        <div>
          <h2>Reader Activity</h2>
          <p className="panel-description">
            See what fellow readers are reviewing, finishing, and recommending across the community.
          </p>
        </div>
      </div>
      {token ? (
        feedItems.length ? (
          <div className="recommendation-grid">
            {feedItems.map((item, index) => (
              <article key={`${item.type}-${item.createdAt}-${index}`} className="recommendation-card">
                <strong>{item.message}</strong>
                <span className="muted-text">@{item.actorUsername}</span>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Your community feed is quiet for now."
            copy="Start reviewing books and building your library while community activity grows around you."
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
  );
}

function AboutPage({ user, spotlightFeatures }) {
  return (
    <div className="content-stack">
      <HeroSection user={user} spotlightFeatures={spotlightFeatures} />
    </div>
  );
}

function FeaturesPage({ user }) {
  return (
    <div className="content-stack">
      <PageBanner
        eyebrow="Feature overview"
        title="A focused reading product with room to grow."
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
  const { authMode, user } = props;

  return (
    <div className="content-stack">
      <PageBanner
        eyebrow={authMode === "register" ? "Join Readlytics" : "Return to your shelves"}
        title={authMode === "register" ? "Create your reading home." : "Welcome back to Readlytics."}
        description={
          authMode === "register"
            ? "Set up your account, start organizing your shelves, and build a reading profile that gets smarter with every book."
            : "Sign in to get back to your dashboard, discover new books, and see what your community is reading."
        }
        actions={
          user
            ? [
                { label: "Open Dashboard", variant: "primary", onClick: () => navigate(ROUTES.dashboard) },
                { label: "Discover Books", onClick: () => navigate(ROUTES.discover) },
              ]
            : [
                {
                  label: authMode === "register" ? "Log In" : "Create Account",
                  onClick: props.onToggleMode,
                },
              ]
        }
      />
      <div className="page-two-column-grid">
        <AuthPanel {...props} />
        <AuthSupportPanel user={user} />
      </div>
    </div>
  );
}

function DashboardPage({ analytics, recommendations, shelves, token, onRefresh, onSignOut, user }) {
  return (
    <div className="content-stack">
      <PageBanner
        eyebrow="Dashboard"
        title={user ? `Welcome back, ${user.displayName}.` : "Your reading dashboard awaits."}
        description="Reader's Retreat brings your habits, shelves, and tailored suggestions into one calm workspace."
        actions={
          token
            ? [
                { label: "Discover Books", variant: "primary", onClick: () => navigate(ROUTES.discover) },
              ]
            : [
                { label: "Log In", variant: "primary", onClick: () => navigate(ROUTES.login) },
                { label: "Create Account", onClick: () => navigate(ROUTES.register) },
              ]
        }
      />
      <section className="layout-grid">
        <InsightsPanel token={token} analytics={analytics} />
        <LibraryPanel shelves={shelves} token={token} onRefresh={onRefresh} />
        <RecommendationsPanel token={token} recommendations={recommendations} />
      </section>
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
            onClick: () => navigate(props.token ? ROUTES.dashboard : ROUTES.register),
          },
        ]}
      />
      <DiscoverPanel {...props} />
    </div>
  );
}

function CommunityPage({ feedItems, token, user }) {
  return (
    <div className="content-stack">
      <PageBanner
        eyebrow="Community"
        title={user ? "Keep up with your reading circle." : "A calmer social space for readers."}
        description="See what other readers are finishing, rating, and recommending without losing focus on your own shelves."
        actions={
          token
            ? [{ label: "Open Dashboard", variant: "primary", onClick: () => navigate(ROUTES.dashboard) }]
            : [
                { label: "Join Readlytics", variant: "primary", onClick: () => navigate(ROUTES.register) },
                { label: "Log In", onClick: () => navigate(ROUTES.login) },
              ]
        }
      />
      <CommunityPanel token={token} feedItems={feedItems} />
    </div>
  );
}

export default function App() {
  const [pathname, setPathname] = useState(() => {
    const initialPath = typeof window === "undefined" ? ROUTES.about : normalizePath(window.location.pathname);

    if (typeof window !== "undefined" && window.location.pathname !== initialPath) {
      window.history.replaceState({}, "", initialPath);
    }

    return initialPath;
  });
  const [token, setToken] = useState(() => window.localStorage.getItem("book-platform-token") ?? "");
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("register");
  const [authForm, setAuthForm] = useState(DEFAULT_AUTH_FORM);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("dune");
  const [searchResults, setSearchResults] = useState([]);
  const [searchState, setSearchState] = useState({ loading: false, error: "" });
  const [recentSearches, setRecentSearches] = useState(() => getInitialRecentSearches());
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
  const [feedItems, setFeedItems] = useState([]);

  const totalSavedBooks = Object.values(shelves).reduce((count, entries) => count + entries.length, 0);
  const spotlightFeatures = [
    {
      title: "Smart",
      eyebrow: token ? `${totalSavedBooks} books shelved` : "Reading insights",
      headline: token ? "Your reading life is already taking shape." : "Insights that sharpen as you read more.",
      description: token && analytics
        ? `${analytics.pagesReadTotal} pages tracked with your latest habits feeding a clearer picture.`
        : "Spot patterns in pace, streaks, genres, and ratings without losing the calm of a clean reading space.",
    },
    {
      title: "Tailored",
      eyebrow: token && analytics ? `${analytics.currentStreakDays} day streak` : "Personalized picks",
      headline: token ? "Recommendations tuned to your shelves." : "Suggestions that feel more personal.",
      description: token
        ? "Your saved books, reviews, and favorite authors are already shaping what you should reach for next."
        : "Let your shelves, ratings, and evolving taste guide the books you are most likely to love next.",
    },
    {
      title: "Social",
      eyebrow: token ? `${feedItems.length} recent updates` : "Reader community",
      headline: token ? "Stay close to the readers you trust." : "A more thoughtful kind of reading community.",
      description: token
        ? "Follow what other readers are finishing, reviewing, and recommending from one focused activity stream."
        : "Follow other readers, compare taste, and keep a pulse on the books that keep the conversation going.",
    },
  ];

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
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -8% 0px" }
    );

    const sections = document.querySelectorAll(".reveal-section");
    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [pathname]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setShelves({
        want_to_read: [],
        currently_reading: [],
        finished: [],
        did_not_finish: [],
      });
      setAnalytics(null);
      setRecommendations([]);
      setFeedItems([]);
      window.localStorage.removeItem("book-platform-token");
      return;
    }

    window.localStorage.setItem("book-platform-token", token);

    let cancelled = false;

    async function loadAuthenticatedState() {
      try {
        const [{ user: currentUser }, shelfData] = await Promise.all([getCurrentUser(token), getShelves(token)]);

        if (!cancelled) {
          setUser(currentUser);
          setShelves(shelfData);
        }

        if (!cancelled) {
          await loadInsights(token);
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

  async function loadInsights(currentToken) {
    if (!currentToken) {
      setAnalytics(null);
      setRecommendations([]);
      setFeedItems([]);
      return;
    }

    try {
      const [summary, recommendationPayload, feedPayload] = await Promise.all([
        getAnalyticsSummary(currentToken),
        getRecommendations(currentToken),
        getFeed(currentToken),
      ]);

      setAnalytics(summary);
      setRecommendations(recommendationPayload.recommendations ?? []);
      setFeedItems(feedPayload.items ?? []);
    } catch (_error) {
      setAnalytics(null);
      setRecommendations([]);
      setFeedItems([]);
    }
  }

  async function refreshPersonalizedData(currentToken = token) {
    if (!currentToken) {
      return;
    }

    const shelfData = await getShelves(currentToken);
    setShelves(shelfData);
    await loadInsights(currentToken);
  }

  function handleAuthModeToggle() {
    navigate(authMode === "register" ? ROUTES.login : ROUTES.register);
  }

  function handleAuthFieldChange(field, value) {
    setAuthForm((current) => ({ ...current, [field]: value }));
  }

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
      navigate(ROUTES.dashboard);
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  }

  function storeRecentSearch(query) {
    setRecentSearches((current) => {
      const next = [query, ...current.filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, 5);
      window.localStorage.setItem(RECENT_SEARCH_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  async function runSearch(query) {
    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setSearchResults([]);
      setSearchState({ loading: false, error: "Enter a title, author, or genre to start exploring." });
      return;
    }

    setSearchState({ loading: true, error: "" });
    setSearchResults([]);

    try {
      const payload = await searchBooks(normalizedQuery);
      setSearchResults(payload.results ?? []);
      storeRecentSearch(normalizedQuery);
    } catch (error) {
      setSearchResults([]);
      setSearchState({ loading: false, error: error.message });
      return;
    }

    setSearchState({ loading: false, error: "" });
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
      await saveShelfEntry(token, { bookId, status, currentPage: status === "currently_reading" ? 42 : 0 });
      await refreshPersonalizedData();
      setShelfMessage(`Saved to ${formatShelfName(status)}.`);
    } catch (error) {
      setShelfMessage(error.message);
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
      setShelfMessage("Choose a rating before saving a review.");
      return;
    }

    try {
      await saveReview(token, {
        bookId,
        rating: Number(draft.rating),
        reviewText: draft.reviewText ?? "",
      });
      await refreshPersonalizedData();
      setShelfMessage("Review saved.");
    } catch (error) {
      setShelfMessage(error.message);
    }
  }

  function handleSignOut() {
    setToken("");
    setShelfMessage("");
    setAuthError("");
    navigate(ROUTES.about);
  }

  let content = null;

  if (pathname === ROUTES.features) {
    content = <FeaturesPage user={user} />;
  } else if (pathname === ROUTES.dashboard) {
    content = (
      <DashboardPage
        analytics={analytics}
        recommendations={recommendations}
        shelves={shelves}
        token={token}
        onRefresh={() => refreshPersonalizedData()}
        onSignOut={handleSignOut}
        user={user}
      />
    );
  } else if (pathname === ROUTES.discover) {
    content = (
      <DiscoverPage
        token={token}
        recentSearches={recentSearches}
        reviewDrafts={reviewDrafts}
        searchQuery={searchQuery}
        searchResults={searchResults}
        searchState={searchState}
        shelfMessage={shelfMessage}
        setSearchQuery={setSearchQuery}
        setReviewDrafts={setReviewDrafts}
        onSearch={handleSearch}
        onSuggestionSelect={handleSuggestionSelect}
        onShelfSave={handleShelfSave}
        onReviewSave={handleReviewSave}
      />
    );
  } else if (pathname === ROUTES.community) {
    content = <CommunityPage feedItems={feedItems} token={token} user={user} />;
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
      />
    );
  } else {
    content = <AboutPage user={user} spotlightFeatures={spotlightFeatures} />;
  }

  return (
    <>
      <SiteHeader
        pathname={pathname}
        user={user}
        onLogin={() => navigate(ROUTES.login)}
        onRegister={() => navigate(ROUTES.register)}
        onSignOut={handleSignOut}
      />
      <main className="app-shell">{content}</main>
      <SiteFooter />
    </>
  );
}
