import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, it, expect, vi } from "vitest";
import App from "../src/app";
import * as api from "../src/api";
vi.mock("../src/api", () =>
  Object.fromEntries(
    [
      "getCurrentUser",
      "updateProfile",
      "loginUser",
      "registerUser",
      "getShelves",
      "getMyReviews",
      "getAnalyticsSummary",
      "getRecommendations",
      "getFeed",
      "getFollowing",
      "getUserProfile",
      "getUserReviews",
      "deleteReview",
      "deleteShelfEntry",
      "followUser",
      "saveReview",
      "saveShelfEntry",
      "searchBooks",
      "unfollowUser",
      "updateShelfProgress",
    ].map((k) => [k, vi.fn()]),
  ),
);
const reader = {
  id: "123",
  username: "reader",
  displayName: "Reader",
  email: "reader@example.com",
};
const shelves = {
  want_to_read: [],
  currently_reading: [],
  finished: [],
  did_not_finish: [],
};
beforeEach(() => {
  vi.resetAllMocks();
  window.history.replaceState({}, "", "/login");
  api.getCurrentUser.mockResolvedValue({ user: reader });
  api.getShelves.mockResolvedValue(shelves);
  api.getMyReviews.mockResolvedValue({ reviews: [] });
  api.getAnalyticsSummary.mockResolvedValue({
    booksFinished: 0,
    pagesReadTotal: 0,
    averageRating: null,
    currentStreakDays: 0,
    favoriteGenres: [],
  });
  api.getRecommendations.mockResolvedValue({ recommendations: [] });
  api.getFeed.mockResolvedValue({ items: [] });
  api.getFollowing.mockResolvedValue({ following: [] });
});
async function fill() {
  const u = userEvent.setup();
  await u.type(screen.getByLabelText("Email"), "reader@example.com");
  await u.type(screen.getByLabelText("Password"), "password123");
  return u;
}
it("logs in, redirects, restores user and logs out", async () => {
  api.loginUser.mockResolvedValue({ user: reader, token: "token" });
  render(<App />);
  const u = await fill();
  await u.click(screen.getByRole("button", { name: "Continue Reading" }));
  await screen.findByText("A new chapter, Reader.");
  await waitFor(() =>
    expect(localStorage.getItem("book-platform-token")).toBe("token"),
  );
  await u.click(screen.getByRole("button", { name: "Log Out" }));
  await screen.findByText("Your reading life,");
  await waitFor(() =>
    expect(localStorage.getItem("book-platform-token")).toBeNull(),
  );
});
it("shows incorrect credentials and releases submit", async () => {
  api.loginUser.mockRejectedValue(new Error("Invalid email or password."));
  render(<App />);
  await fill();
  fireEvent.submit(document.querySelector(".auth-form"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Invalid email or password.",
  );
  expect(
    screen.getByRole("button", { name: "Continue Reading" }),
  ).toBeEnabled();
});
it("prevents repeated submissions while a request is pending", async () => {
  let finish;
  api.loginUser.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<App />);
  await fill();
  fireEvent.submit(document.querySelector(".auth-form"));
  fireEvent.submit(document.querySelector(".auth-form"));
  expect(api.loginUser).toHaveBeenCalledTimes(1);
  finish({ user: reader, token: "token" });
  await screen.findByText("A new chapter, Reader.");
});
it("restores a session on an authenticated route refresh", async () => {
  localStorage.setItem("book-platform-token", "token");
  window.history.replaceState({}, "", "/library");
  render(<App />);
  await screen.findByText("Every book has a place.");
  await waitFor(() => expect(api.getShelves).toHaveBeenCalled());
  expect(localStorage.getItem("book-platform-token")).toBe("token");
});
it("keeps a verified session when reading and analytics fail", async () => {
  api.loginUser.mockResolvedValue({ user: reader, token: "token" });
  api.getShelves.mockRejectedValue(new Error("Reading offline"));
  api.getAnalyticsSummary.mockRejectedValue(new Error("Analytics offline"));
  render(<App />);
  const u = await fill();
  await u.click(screen.getByRole("button", { name: "Continue Reading" }));
  await screen.findByText(/Library: Reading offline/);
  expect(localStorage.getItem("book-platform-token")).toBe("token");
  expect(screen.getByRole("button", { name: "Log Out" })).toBeInTheDocument();
});
it("clears expired JWT and redirects protected pages", async () => {
  api.getCurrentUser.mockRejectedValue(
    Object.assign(new Error("expired"), { status: 401 }),
  );
  localStorage.setItem("book-platform-token", "expired");
  window.history.replaceState({}, "", "/dashboard");
  render(<App />);
  await screen.findByText("Your session has expired. Please sign in again.");
  await waitFor(() => expect(window.location.pathname).toBe("/login"));
});
it("preserves token on account outage and offers retry", async () => {
  api.getCurrentUser
    .mockRejectedValueOnce(
      Object.assign(new Error("Account offline"), { status: 503 }),
    )
    .mockResolvedValue({ user: reader });
  localStorage.setItem("book-platform-token", "token");
  window.history.replaceState({}, "", "/dashboard");
  render(<App />);
  await screen.findByText("Account offline");
  expect(localStorage.getItem("book-platform-token")).toBe("token");
  await userEvent.click(screen.getByRole("button", { name: "Retry session" }));
  await screen.findByText("A new chapter, Reader.");
});
it("redirects unauthenticated protected routes", async () => {
  window.history.replaceState({}, "", "/library");
  render(<App />);
  await waitFor(() => expect(window.location.pathname).toBe("/login"));
});
it("has native empty-form validation and password visibility", async () => {
  render(<App />);
  expect(screen.getByLabelText("Email")).toBeRequired();
  expect(document.querySelector(".auth-form").checkValidity()).toBe(false);
  await userEvent.click(screen.getByRole("button", { name: "Show password" }));
  expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text");
});
