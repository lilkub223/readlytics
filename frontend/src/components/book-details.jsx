import React, { useEffect, useState } from "react";
import { getBook, getBookReviews } from "../api";
import { Cover } from "./product";
const OPTIONS = [
  ["want_to_read", "Want to Read"],
  ["currently_reading", "Currently Reading"],
  ["finished", "Finished"],
  ["did_not_finish", "Did Not Finish"],
];
export default function BookDetails({
  bookId,
  token,
  shelves,
  onShelfSave,
  shelfState,
  reviewDrafts,
  onReviewDraftChange,
  onReviewSave,
  reviewSaveState,
}) {
  const [book, setBook] = useState(null),
    [reviews, setReviews] = useState([]),
    [error, setError] = useState(""),
    [reviewError, setReviewError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [shelf, setShelf] = useState("want_to_read");
  const draft = reviewDrafts[bookId] ?? { rating: "", reviewText: "" };
  const entry = Object.values(shelves)
    .flat()
    .find((e) => e.bookId === bookId);
  useEffect(() => {
    if (entry?.status) setShelf(entry.status);
  }, [entry?.status]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setError("");
    setReviewError("");
    getBook(bookId, controller.signal)
      .then((data) => {
        if (active) setBook(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    getBookReviews(bookId, controller.signal)
      .then((data) => {
        if (active) setReviews(data.reviews ?? []);
      })
      .catch((e) => {
        if (active) setReviewError(e.message);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [bookId, attempt]);
  if (error)
    return (
      <div className="panel" role="alert">
        {error}{" "}
        <button
          className="ghost-button"
          onClick={() => setAttempt((n) => n + 1)}
        >
          Retry
        </button>
      </div>
    );
  if (!book)
    return (
      <div className="panel" role="status">
        Loading book details…
      </div>
    );
  return (
    <div className="content-stack">
      <a className="text-link" href="/discover">
        ← Back to discovery
      </a>
      <article className="panel book-detail">
        <Cover title={book.title} url={book.coverImageUrl} />
        <div>
          <span className="section-kicker">THE READING ROOM</span>
          <h1>{book.title}</h1>
          <p className="detail-author">
            {book.authors?.join(", ") || "Author not listed"}
          </p>
          <div className="tag-row">
            {book.publishedYear && (
              <span className="tag-chip">
                First published {book.publishedYear}
              </span>
            )}
            {book.pageCount > 0 && (
              <span className="tag-chip">{book.pageCount} pages</span>
            )}
          </div>
          {book.description && (
            <p className="book-description">{book.description}</p>
          )}
          {book.genres?.length > 0 && (
            <div className="tag-row">
              {book.genres.map((g) => (
                <span key={g} className="tag-chip">
                  {g}
                </span>
              ))}
            </div>
          )}
          {entry && (
            <p className="success-text">
              In your {OPTIONS.find(([s]) => s === entry.status)?.[1]} shelf ·
              Page {entry.currentPage}
            </p>
          )}
          <div className="button-row">
            <select
              aria-label="Add to shelf"
              value={shelf}
              onChange={(e) => setShelf(e.target.value)}
            >
              {OPTIONS.map(([key, label]) => (
                <option value={key} key={key}>
                  {label}
                </option>
              ))}
            </select>
            <button
              className="primary-button"
              disabled={shelfState[bookId]?.status === "saving"}
              onClick={() => onShelfSave(bookId, shelf)}
            >
              {shelfState[bookId]?.status === "saving"
                ? "Saving…"
                : token
                  ? "Save to shelf"
                  : "Sign in to save"}
            </button>
          </div>
          {shelfState[bookId]?.message && (
            <p
              role="status"
              className={
                shelfState[bookId].status === "error"
                  ? "error-text"
                  : "success-text"
              }
            >
              {shelfState[bookId].message}
            </p>
          )}
        </div>
      </article>
      <div className="page-two-column-grid">
        <article className="panel">
          <h2>Your review</h2>
          <p className="muted-text">
            Your rating and review appear on your public reader profile.
          </p>
          <form
            className="stack"
            onSubmit={async (e) => {
              e.preventDefault();
              await onReviewSave(bookId);
              setAttempt((n) => n + 1);
            }}
          >
            <label>
              Your rating
              <select
                required
                value={draft.rating}
                onChange={(e) =>
                  onReviewDraftChange(bookId, "rating", e.target.value)
                }
              >
                <option value="">Choose a rating</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
            </label>
            <label>
              Your thoughts
              <textarea
                maxLength={10000}
                value={draft.reviewText}
                onChange={(e) =>
                  onReviewDraftChange(bookId, "reviewText", e.target.value)
                }
                placeholder="What stayed with you?"
              />
            </label>
            <button
              className="primary-button"
              disabled={reviewSaveState[bookId]?.status === "saving"}
            >
              {reviewSaveState[bookId]?.status === "saving"
                ? "Saving…"
                : "Save review"}
            </button>
            {reviewSaveState[bookId]?.message && (
              <p role="status">{reviewSaveState[bookId].message}</p>
            )}
          </form>
        </article>
        <article className="panel">
          <h2>Reader reviews</h2>
          {reviewError && (
            <p className="error-text" role="alert">
              {reviewError}
            </p>
          )}
          {reviews.length ? (
            reviews.map((r, i) => (
              <div className="review-card" key={i}>
                <span className="pill">
                  {"★".repeat(r.rating)}
                  {"☆".repeat(5 - r.rating)}
                </span>
                <p>{r.reviewText || "This reader left a rating."}</p>
              </div>
            ))
          ) : (
            <p className="muted-text">
              No reviews yet. Yours could start the conversation.
            </p>
          )}
        </article>
      </div>
    </div>
  );
}
