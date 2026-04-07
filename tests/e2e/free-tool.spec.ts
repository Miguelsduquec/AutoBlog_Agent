import { expect, test } from "@playwright/test";
import { mockSiteUrl, registerAccount, registerAndSubscribe, startSubscription } from "./helpers";

test("public CTAs follow the paid funnel", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Try the free grader" }).click();
  await expect(page).toHaveURL("/tools/content-gap-grader");

  await page.goto("/");
  if (testInfo.project.name !== "desktop-chromium") {
    await page.getByTestId("global-nav-toggle").click();
  }
  await page.getByRole("link", { name: "See pricing" }).click();
  await expect(page).toHaveURL("/pricing");
});

test("free tool landing page loads", async ({ page }) => {
  await page.goto("/tools/content-gap-grader");

  await expect(page.getByRole("heading", { name: "See how much content opportunity your website is missing" })).toBeVisible();
  await expect(page.getByTestId("content-gap-grader-form")).toBeVisible();
});

test("pricing page stays public", async ({ page }) => {
  await page.goto("/pricing");
  await expect(page.getByRole("heading", { name: "Paid subscription only" })).toBeVisible();
  await expect(page.getByTestId("pricing-plan-monthly")).toBeVisible();
  await expect(page.getByTestId("pricing-plan-yearly")).toBeVisible();
});

test("free tool shows a shareable report for a valid website", async ({ page }, testInfo) => {
  await page.goto("/tools/content-gap-grader");
  await page.getByTestId("content-gap-grader-url").fill(mockSiteUrl(testInfo.project.name, "contentHeavy"));
  await page.getByTestId("content-gap-grader-submit").click();

  await expect(page.getByRole("heading", { name: "Content Gap Grader results" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Quick wins" })).toBeVisible();
  await expect(page.getByTestId("grader-upgrade-cta")).toBeVisible();
  await expect(page.getByTestId("grader-share-button")).toBeVisible();
  await expect(page.getByTestId("grader-copy-link-button")).toBeVisible();
});

test("public result funnels into pricing before the subscribed app", async ({ page }, testInfo) => {
  const websiteUrl = mockSiteUrl(testInfo.project.name, "simple");
  await page.goto("/tools/content-gap-grader");
  await page.getByTestId("content-gap-grader-url").fill(websiteUrl);
  await page.getByTestId("content-gap-grader-submit").click();

  await expect(page.getByRole("heading", { name: "Content Gap Grader results" })).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("grader-upgrade-cta").click();

  await expect(page).toHaveURL(/\/pricing/);
  await expect(page.getByRole("heading", { name: "Paid subscription only" })).toBeVisible();
  await page.getByRole("link", { name: "Create account" }).click();
  await registerAndSubscribe(page, "/app/dashboard");
  await expect(page.locator("main").getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("pricing page supports annual selection and paid checkout flow", async ({ page }) => {
  await registerAccount(page, "/pricing?next=/app/dashboard&plan=yearly");
  await expect(page.getByTestId("pricing-plan-yearly")).toHaveClass(/active/);
  await expect(page.getByText(/Save 10% with annual billing/i)).toBeVisible();
  await startSubscription(page, "/app/dashboard", "yearly");
  await expect(page.locator("main").getByRole("heading", { name: "Dashboard" })).toBeVisible();
});

test("free tool shows a friendly validation error for invalid URLs", async ({ page }) => {
  await page.goto("/tools/content-gap-grader");
  await page.getByTestId("content-gap-grader-url").fill("https://notaurl");
  await page.getByTestId("content-gap-grader-submit").click();

  await expect(page.getByText("Unable to grade this website right now.")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Enter a valid website URL, including a real domain.")).toBeVisible();
});
