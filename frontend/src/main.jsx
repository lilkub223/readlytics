import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

function App() {
  const services = [
    { name: "User Service", port: 4001, purpose: "auth, profiles, follows" },
    { name: "Reading Service", port: 4002, purpose: "books, shelves, reviews" },
    { name: "Analytics Service", port: 4003, purpose: "analytics, recommendations" },
  ];

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">Portfolio Project</p>
        <h1>Book Platform</h1>
        <p className="intro">
          A scoped social book-tracking app built to demonstrate frontend,
          backend, microservices, API integration, and CI/CD fundamentals.
        </p>
      </section>

      <section className="card-grid">
        {services.map((service) => (
          <article key={service.name} className="service-card">
            <h2>{service.name}</h2>
            <p>{service.purpose}</p>
            <code>GET http://localhost:{service.port}/health</code>
          </article>
        ))}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

