import { test, expect } from "@playwright/test";
const bookId = "22222222-2222-4222-8222-000000000001";
const password = "isolated-test-password";
async function createUser(request, prefix = "reader") {
  const username = `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const response = await request.post(
    "http://127.0.0.1:4001/api/auth/register",
    {
      data: {
        email: `${username}@example.com`,
        username,
        password,
        displayName: "QA Reader",
      },
    },
  );
  expect(response.status()).toBe(201);
  return { ...(await response.json()), email: `${username}@example.com` };
}
test("real full-stack reading journey persists shelves, progress, reviews and relationships", async ({
  page,
  request,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/register");
  const username = `browser${Date.now()}`;
  const reviewText = `A complete reading journey by ${username}.`;
  await page.getByLabel("Display Name").fill("QA Reader");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${username}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create Your Account", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
  await page.getByRole("button", { name: "Discover", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search books" })
    .fill("QA Reading Journey");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .locator(".book-card")
    .getByRole("button", { name: "QA Reading Journey", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp("/books/" + bookId));
  await expect(
    page.getByRole("heading", { name: "QA Reading Journey" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Save to shelf", exact: true })
    .click();
  await expect(
    page.getByText("Saved to Want To Read.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "My Library", exact: true }).click();
  await page
    .getByLabel("Shelf for QA Reading Journey")
    .selectOption("currently_reading");
  await page.getByRole("button", { name: "Update Shelf", exact: true }).click();
  await expect(
    page.getByLabel("Current page for QA Reading Journey"),
  ).toBeVisible();
  await page.getByLabel("Current page for QA Reading Journey").fill("40");
  await page.getByRole("button", { name: "Update Page", exact: true }).click();
  await expect(page.getByText("Current page updated to 40.")).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Current page for QA Reading Journey"),
  ).toHaveValue("40");
  const token = await page.evaluate(() =>
    localStorage.getItem("book-platform-token"),
  );
  const headers = { Authorization: `Bearer ${token}` };
  let summary = await (
    await request.get("http://127.0.0.1:4003/api/analytics/me/summary", {
      headers,
    })
  ).json();
  expect(summary.pagesReadTotal).toBe(40);
  expect(summary.currentStreakDays).toBe(1);
  // A correction is not another reading session.
  await page.getByLabel("Current page for QA Reading Journey").fill("20");
  await page.getByRole("button", { name: "Update Page", exact: true }).click();
  await expect(page.getByText("Current page updated to 20.")).toBeVisible();
  summary = await (
    await request.get("http://127.0.0.1:4003/api/analytics/me/summary", {
      headers,
    })
  ).json();
  expect(summary.pagesReadTotal).toBe(40);
  await page
    .getByLabel("Shelf for QA Reading Journey")
    .selectOption("finished");
  await page.getByRole("button", { name: "Update Shelf", exact: true }).click();
  await expect(page.getByText("Moved to Finished.")).toBeVisible();
  await page
    .getByRole("button", { name: "QA Reading Journey", exact: true })
    .click();
  await page.getByLabel("Your rating").selectOption("5");
  await page.getByLabel("Your thoughts").fill(reviewText);
  await page.getByRole("button", { name: "Save review", exact: true }).click();
  await expect(page.getByText("Review saved to your profile.")).toBeVisible();
  await expect(
    page.locator(".review-card").getByText(reviewText, { exact: true }),
  ).toBeVisible();
  summary = await (
    await request.get("http://127.0.0.1:4003/api/analytics/me/summary", {
      headers,
    })
  ).json();
  expect(summary.booksFinished).toBe(1);
  expect(summary.averageRating).toBe(5);
  await page.getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Recent Reviews" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Delete Review", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No reviews yet." }),
  ).toBeVisible();
  const other = await createUser(request, "other");
  await page
    .getByRole("button", { name: "Community", exact: true })
    .first()
    .click();
  await page
    .getByRole("textbox", { name: "Reader username" })
    .fill(other.user.username);
  await page.getByRole("button", { name: "Find Reader", exact: true }).click();
  await page
    .getByRole("button", { name: "Follow Reader", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Following", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Following", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Follow Reader", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Your reader profile" }).click();
  await page.getByRole("button", { name: "Edit your profile" }).click();
  await page
    .getByLabel("Display name", { exact: true })
    .fill("QA Updated Reader");
  await page
    .getByLabel("Bio", { exact: true })
    .fill("Reading is a daily practice.");
  await page.getByRole("button", { name: "Save profile", exact: true }).click();
  await expect(
    page.getByText("Reading is a daily practice.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Log Out" }).click();
  await page.goto("/library");
  await expect(page).toHaveURL(/\/login$/);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${username}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("incorrect");
  await page
    .getByRole("button", { name: "Continue Reading", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveText(
    "Invalid email or password.",
  );
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Continue Reading", exact: true })
    .click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(errors).toEqual([]);
});
for (const width of [1440, 1024, 768, 390, 320])
  test(`public navigation and forms fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/",
      "/features",
      "/discover",
      "/community",
      "/login",
      "/register",
    ]) {
      await page.goto(route);
      await expect(page.locator("main")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `../output/${route === "/" ? "home" : route.slice(1)}-${width}.png`,
        fullPage: true,
      });
    }
    await page.getByRole("button", { name: "Discover", exact: true }).click();
    await expect(page).toHaveURL(/\/discover$/);
  });
test("downstream outages preserve auth, show errors, and recover through Retry", async ({
  page,
  request,
}) => {
  const account = await createUser(request, "outage");
  await page.goto("/login");
  await page.evaluate(
    (token) => localStorage.setItem("book-platform-token", token),
    account.token,
  );
  await page.route("**/api/analytics/me/summary", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: '{"detail":"Analytics temporarily unavailable."}',
    }),
  );
  await page.goto("/dashboard");
  await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
  await expect(
    page.getByText(/Insights: Analytics temporarily unavailable/),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("book-platform-token")),
  ).toBe(account.token);
  await page.unroute("**/api/analytics/me/summary");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(
    page.getByText(/Insights: Analytics temporarily unavailable/),
  ).toHaveCount(0);
});
test("authenticated pages and book details fit every target width", async ({
  page,
  request,
}) => {
  const account = await createUser(request, "layout");
  const headers = { Authorization: `Bearer ${account.token}` };
  expect(
    (
      await request.post("http://127.0.0.1:4002/api/shelves", {
        headers,
        data: { bookId, status: "currently_reading", currentPage: 80 },
      })
    ).status(),
  ).toBe(200);
  await page.goto("/");
  await page.evaluate(
    (token) => localStorage.setItem("book-platform-token", token),
    account.token,
  );
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "/dashboard",
      "/library",
      "/insights",
      `/books/${bookId}`,
    ]) {
      await page.goto(route);
      await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
      await expect(page.getByText("Loading your library…")).toHaveCount(0);
      await expect(page.getByText("Restoring your session…")).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `../output/${route.startsWith("/books/") ? "book-detail" : route.slice(1)}-${width}.png`,
        fullPage: true,
      });
    }
  }
});
