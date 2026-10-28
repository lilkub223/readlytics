import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
for (const route of [
  "/",
  "/features",
  "/login",
  "/register",
  "/discover",
  "/community",
]) {
  test(`WCAG checks ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  });
}

test("WCAG checks authenticated reading pages", async ({ page, request }) => {
  const username = `a11y${Date.now()}`;
  const registration = await request.post(
    "http://127.0.0.1:4001/api/auth/register",
    {
      data: {
        username,
        email: `${username}@example.com`,
        password: "test-reading-password",
        displayName: "Accessibility Reader",
      },
    },
  );
  expect(registration.status()).toBe(201);
  const { token } = await registration.json();
  await page.goto("/");
  await page.evaluate(
    (value) => localStorage.setItem("book-platform-token", value),
    token,
  );
  for (const route of [
    "/dashboard",
    "/library",
    "/insights",
    "/books/22222222-2222-4222-8222-000000000001",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("button", { name: "Log Out" })).toBeVisible();
    await expect(page.getByText("Restoring your session…")).toHaveCount(0);
    await expect(page.getByText("Loading your library…")).toHaveCount(0);
    if (route.startsWith("/books/"))
      await expect(
        page.getByRole("heading", { name: "QA Reading Journey", exact: true }),
      ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  }
});
