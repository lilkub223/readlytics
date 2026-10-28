import React, { useState } from "react";

export function Cover({ title, url, className = "" }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`cover ${className}`}>
      <div className="cover-type" aria-hidden={loaded}>
        <span>READLYTICS LIBRARY</span>
        <strong>{title}</strong>
        <span>A new perspective awaits</span>
      </div>
      {url && !failed && (
        <img
          className={loaded ? "is-loaded" : ""}
          src={url}
          alt={`Cover of ${title}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

export const SHOWCASE = [
  {
    title: "Dune",
    author: "Frank Herbert",
    isbn: "9780441172719",
    color: "sand",
  },
  {
    title: "The Left Hand of Darkness",
    author: "Ursula K. Le Guin",
    isbn: "9780441478125",
    color: "sage",
  },
  {
    title: "Pride and Prejudice",
    author: "Jane Austen",
    isbn: "9780141439518",
    color: "rose",
  },
  {
    title: "Matilda",
    author: "Roald Dahl",
    isbn: "9780142410370",
    color: "blue",
  },
];

export function BookMosaic({ compact = false, onDiscover }) {
  return (
    <div className={`book-mosaic ${compact ? "compact" : ""}`}>
      {SHOWCASE.map((b, index) => (
        <div
          key={b.title}
          className={`showcase-book ${b.color}`}
          style={{ "--book-index": index }}
        >
          <Cover
            title={b.title}
            url={`https://covers.openlibrary.org/b/isbn/${b.isbn}-L.jpg`}
          />
          {!compact && (
            <div className="showcase-caption">
              <strong>{b.title}</strong>
              <span>{b.author}</span>
            </div>
          )}
        </div>
      ))}
      {!compact && (
        <div className="mosaic-note">
          <span className="little-star">✳</span>
          <div>
            <strong>So many stories. One place for yours.</strong>
            <span>Build a bookshelf that feels like you.</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function Landing({ user, navigate }) {
  return (
    <div className="landing content-stack">
      <section className="editorial-hero">
        <div className="editorial-copy">
          <span className="section-kicker">
            <span className="tiny-rule" /> FOR THE LOVE OF READING
          </span>
          <h1>
            Your reading life,
            <br />
            <em>beautifully organized.</em>
          </h1>
          <p>
            Keep the books you love close. Discover your next favorite, connect
            with fellow readers, and find the story in your reading habits.
          </p>
          <div className="button-row">
            <button
              className="primary-button"
              onClick={() => navigate(user ? "/dashboard" : "/register")}
            >
              {user ? "Your dashboard" : "Start your next chapter"}{" "}
              <span aria-hidden="true">↗</span>
            </button>
            <button
              className="ghost-button"
              onClick={() => navigate("/discover")}
            >
              Explore books <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="hero-footnote">
            <span className="open-book-mark" aria-hidden="true">
              ▤
            </span>{" "}
            A little more reading. A little more you.
          </div>
        </div>
        <div className="editorial-books">
          <div className="collection-label">
            THE NEXT CHAPTER COLLECTION <span>01 — 04</span>
          </div>
          <BookMosaic />
        </div>
      </section>
      <div className="principles-strip">
        <span>DISCOVER SOMETHING NEW</span>
        <span aria-hidden="true">✳</span>
        <span>MAKE ROOM FOR GREAT STORIES</span>
        <span aria-hidden="true">✳</span>
        <span>READ AT YOUR OWN PACE</span>
      </div>
      <section className="home-product">
        <div className="section-intro">
          <span className="section-kicker">A HOME FOR YOUR READING LIFE</span>
          <h2>
            Less keeping track.
            <br />
            <em>More getting lost in a book.</em>
          </h2>
          <p>
            From your ever-growing to-read pile to the last page of a favorite,
            keep every chapter together.
          </p>
          <a
            href="/features"
            onClick={(e) => {
              e.preventDefault();
              navigate("/features");
            }}
            className="text-link"
          >
            Meet your new reading companion →
          </a>
        </div>
        <div className="product-preview">
          <div className="preview-top">
            <span className="site-logo-wordmark">My reading space</span>
            <span className="pill">Illustrative preview</span>
          </div>
          <div className="preview-reading">
            <Cover
              title="Dune"
              url="https://covers.openlibrary.org/b/isbn/9780441172719-M.jpg"
            />
            <div>
              <span className="section-kicker">CURRENTLY READING</span>
              <h3>Dune</h3>
              <p>Frank Herbert</p>
              <progress
                aria-label="Example reading progress"
                value="128"
                max="320"
              />
              <span className="small-text">Example: page 128 of 320</span>
            </div>
          </div>
          <div className="preview-tags">
            <span>Want to Read</span>
            <span>Currently Reading</span>
            <span>Finished</span>
            <span>Did Not Finish</span>
          </div>
          <div className="preview-insight">
            <span aria-hidden="true">↗</span>
            <div>
              <strong>Every page tells a story.</strong>
              <p>
                Your pages, ratings, streaks, and favorite genres, together.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="home-features">
        <div className="section-heading">
          <div>
            <span className="section-kicker">
              GOOD BOOKS. BETTER CONNECTIONS.
            </span>
            <h2>There's more between the covers.</h2>
          </div>
          <button
            className="ghost-button"
            onClick={() => navigate("/discover")}
          >
            Find your next read →
          </button>
        </div>
        <div className="feature-preview-grid">
          {[
            [
              "01",
              "A shelf for every chapter",
              "Keep a wish list, track your current reads, and remember the books you finished.",
              "/library",
            ],
            [
              "02",
              "Get to know your reading self",
              "See pages logged, reading streaks, and the genres that keep drawing you back.",
              "/insights",
            ],
            [
              "03",
              "A circle worth reading with",
              "Follow readers, explore their reviews, and discover books through people.",
              "/community",
            ],
          ].map(([n, title, copy, path]) => (
            <article className="feature-preview-card" key={n}>
              <span className="feature-preview-index">{n}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
              <button className="text-link" onClick={() => navigate(path)}>
                Take a look <span aria-hidden="true">↗</span>
              </button>
            </article>
          ))}
        </div>
      </section>
      <section className="final-cta">
        <span className="section-kicker">YOUR NEXT FAVORITE IS OUT THERE</span>
        <h2>
          Make space for
          <br />
          <em>one more story.</em>
        </h2>
        <p>Your books, your people, your pace. Welcome to Readlytics.</p>
        <button
          className="primary-button"
          onClick={() => navigate(user ? "/dashboard" : "/register")}
        >
          {user ? "Back to your books" : "Create your account"} ↗
        </button>
      </section>
    </div>
  );
}

export function ShelfChart({ shelves }) {
  const total = Object.values(shelves).reduce((n, a) => n + a.length, 0);
  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <h2>Your library, at a glance</h2>
          <p className="panel-description">
            Live shelf counts · {total} saved {total === 1 ? "book" : "books"}
          </p>
        </div>
      </div>
      <div className="shelf-chart">
        {Object.entries(shelves).map(([key, books]) => (
          <div key={key}>
            <div className="chart-label">
              <span>{key.split("_").join(" ")}</span>
              <strong>{books.length}</strong>
            </div>
            <div className="bar-track">
              <div
                style={{
                  width: `${total ? (books.length / total) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {!total && (
        <p className="muted-text">
          Add your first book to bring this view to life.
        </p>
      )}
    </article>
  );
}
